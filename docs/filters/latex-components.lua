-- latex-components.lua — Pandoc Lua filter
-- Transforms DocsifyTemplate YAML code fence components into branded LaTeX.
-- Runs inside Pandoc WASM (no filesystem, no external libs).

----------------------------------------------------------------
-- Minimal YAML parser (subset: key-value, arrays of objects,
-- multiline strings, booleans, numbers, quoted strings)
----------------------------------------------------------------

local function trim(s)
  return s:match("^%s*(.-)%s*$")
end

local function unquote(s)
  s = trim(s)
  if (s:sub(1,1) == '"' and s:sub(-1) == '"') or
     (s:sub(1,1) == "'" and s:sub(-1) == "'") then
    return s:sub(2, -2)
  end
  return s
end

local function parse_value(s)
  s = trim(s)
  if s == "true" then return true end
  if s == "false" then return false end
  if s == "~" or s == "null" or s == "" then return nil end
  local num = tonumber(s)
  if num then return num end
  -- Inline array: [a, b, c]
  if s:sub(1,1) == "[" and s:sub(-1) == "]" then
    local items = {}
    for item in s:sub(2,-2):gmatch("[^,]+") do
      items[#items+1] = unquote(trim(item))
    end
    return items
  end
  return unquote(s)
end

local function parse_yaml(text)
  local lines = {}
  for line in (text .. "\n"):gmatch("(.-)\n") do
    lines[#lines + 1] = line
  end

  local function get_indent(line)
    local spaces = line:match("^( *)")
    return #spaces
  end

  local function parse_block(start_idx, base_indent)
    local result = {}
    local is_array = false
    local i = start_idx

    while i <= #lines do
      local line = lines[i]
      local stripped = trim(line)

      -- Skip empty lines and comments
      if stripped == "" or stripped:sub(1,1) == "#" then
        i = i + 1
        goto continue
      end

      local indent = get_indent(line)
      if indent < base_indent then
        return result, i
      end
      if indent > base_indent and not is_array then
        return result, i
      end

      -- Array item
      if stripped:sub(1,2) == "- " then
        is_array = true
        local item_text = stripped:sub(3)
        -- Check if it's a simple value or key-value
        local key, val = item_text:match("^([%w_%-]+):%s*(.*)$")
        if key then
          -- Array of objects: collect subsequent indented lines
          local obj = {}
          obj[key] = parse_value(val)
          i = i + 1
          while i <= #lines do
            local next_line = lines[i]
            local next_stripped = trim(next_line)
            local next_indent = get_indent(next_line)
            if next_stripped == "" then
              i = i + 1
              goto continue2
            end
            if next_indent <= indent then break end
            local nk, nv = next_stripped:match("^([%w_%-]+):%s*(.*)$")
            if nk then
              -- Check for multiline string (|)
              if trim(nv) == "|" then
                local ml = {}
                i = i + 1
                local ml_indent = nil
                while i <= #lines do
                  local ml_line = lines[i]
                  local ml_stripped = trim(ml_line)
                  local ml_ind = get_indent(ml_line)
                  if ml_indent == nil and ml_stripped ~= "" then
                    ml_indent = ml_ind
                  end
                  if ml_stripped == "" then
                    ml[#ml+1] = ""
                    i = i + 1
                  elseif ml_indent and ml_ind >= ml_indent then
                    ml[#ml+1] = ml_line:sub(ml_indent + 1)
                    i = i + 1
                  else
                    break
                  end
                end
                obj[nk] = table.concat(ml, "\n")
              -- Check for inline array
              elseif trim(nv):sub(1,1) == "[" then
                obj[nk] = parse_value(nv)
                i = i + 1
              else
                obj[nk] = parse_value(nv)
                i = i + 1
              end
            else
              break
            end
            ::continue2::
          end
          result[#result+1] = obj
        else
          -- Simple array item
          result[#result+1] = parse_value(item_text)
          i = i + 1
        end
      else
        -- Key-value pair
        local key, val = stripped:match("^([%w_%-]+):%s*(.*)$")
        if key then
          if trim(val) == "|" then
            -- Multiline string
            local ml = {}
            i = i + 1
            local ml_indent = nil
            while i <= #lines do
              local ml_line = lines[i]
              local ml_stripped = trim(ml_line)
              local ml_ind = get_indent(ml_line)
              if ml_indent == nil and ml_stripped ~= "" then
                ml_indent = ml_ind
              end
              if ml_stripped == "" then
                ml[#ml+1] = ""
                i = i + 1
              elseif ml_indent and ml_ind >= ml_indent then
                ml[#ml+1] = ml_line:sub(ml_indent + 1)
                i = i + 1
              else
                break
              end
            end
            result[key] = table.concat(ml, "\n")
          elseif trim(val) == "" then
            -- Nested block
            i = i + 1
            if i <= #lines then
              local next_indent = get_indent(lines[i])
              if next_indent > indent then
                local nested
                nested, i = parse_block(i, next_indent)
                result[key] = nested
              end
            end
          else
            result[key] = parse_value(val)
            i = i + 1
          end
        else
          i = i + 1
        end
      end
      ::continue::
    end
    return result, i
  end

  local r = parse_block(1, 0)
  return r
end

----------------------------------------------------------------
-- LaTeX helpers
----------------------------------------------------------------

local function escape_latex(s)
  if type(s) ~= "string" then return tostring(s or "") end
  s = s:gsub("\\", "\\textbackslash{}")
  s = s:gsub("([#$%%&_{}<>~^])", "\\%1")
  s = s:gsub("\\textbackslash\\{\\}", "\\textbackslash{}")
  return s
end

-- For code/response blocks: only escape $ (Pandoc template delimiter)
-- but keep {} and \ intact for verbatim rendering
local function escape_verbatim(s)
  if type(s) ~= "string" then return tostring(s or "") end
  s = s:gsub("%$", "\\$")
  return s
end

local function raw(s)
  return pandoc.RawBlock("latex", s)
end

----------------------------------------------------------------
-- Component renderers — PURE DATA MACROS ONLY
-- These emit \macroname{arg1}{arg2}... calls.
-- The LaTeX template (branded.tex) defines what each macro does.
-- To change how components LOOK, edit the template, not this file.
----------------------------------------------------------------

local renderers = {}

-- card-grid: \cardgridbegin, \card{icon}{title}{desc}, \cardgridend
function renderers.card_grid(text)
  local cards = parse_yaml(text)
  local out = {"\\cardgridbegin"}
  for _, card in ipairs(cards) do
    out[#out+1] = string.format("\\card{%s}{%s}{%s}",
      escape_latex(card.icon or ""),
      escape_latex(card.title or "Untitled"),
      escape_latex(card.description or ""))
  end
  out[#out+1] = "\\cardgridend"
  return table.concat(out, "\n")
end

-- entity-schema: \entitybegin{name}{parent}, \entityfield{name}{type}{required}{desc}{values}, \entityend
function renderers.entity_schema(text)
  local data = parse_yaml(text)
  local out = {
    string.format("\\entitybegin{%s}{%s}",
      escape_latex(data.name or "Entity"),
      escape_latex(data.parent or ""))
  }
  for _, f in ipairs(data.fields or {}) do
    local vals = ""
    if f.values and type(f.values) == "table" then
      vals = table.concat(f.values, ", ")
    end
    out[#out+1] = string.format("\\entityfield{%s}{%s}{%s}{%s}{%s}",
      escape_latex(f.name or ""),
      escape_latex(f.type or "any"),
      f.required and "true" or "false",
      escape_latex(f.description or ""),
      escape_latex(vals))
  end
  out[#out+1] = "\\entityend"
  return table.concat(out, "\n")
end

-- api-endpoint: \apibegin{method}{path}, \apidesc{text}, \apiparam{name}{type}{required},
--               \apiresponse{code}, \apiend
function renderers.api_endpoint(text)
  local data = parse_yaml(text)
  local out = {
    string.format("\\apibegin{%s}{%s}",
      (data.method or "GET"):upper(),
      escape_latex(data.path or "/"))
  }
  if data.description then
    out[#out+1] = string.format("\\apidesc{%s}", escape_latex(data.description))
  end
  for _, p in ipairs(data.params or {}) do
    out[#out+1] = string.format("\\apiparam{%s}{%s}{%s}",
      escape_latex(p.name or ""),
      escape_latex(p.type or "any"),
      p.required and "true" or "false")
  end
  if data.response then
    out[#out+1] = string.format("\\apiresponse{%s}", escape_verbatim(trim(data.response)))
  end
  out[#out+1] = "\\apiend"
  return table.concat(out, "\n")
end

-- status-flow: \flowbegin, \flowstate{label}{trigger}{next}{effects}{islast}, \flowend
function renderers.status_flow(text)
  local data = parse_yaml(text)
  local states = data.states or {}
  local out = {"\\flowbegin"}
  for idx, s in ipairs(states) do
    local next_str = ""
    if s.next and type(s.next) == "table" then
      next_str = table.concat(s.next, ", ")
    end
    local effects_str = ""
    if s.effects and type(s.effects) == "table" then
      effects_str = table.concat(s.effects, ", ")
    end
    out[#out+1] = string.format("\\flowstate{%s}{%s}{%s}{%s}{%s}",
      escape_latex(s.label or s.id or "State"),
      escape_latex(s.trigger or ""),
      escape_latex(next_str),
      escape_latex(effects_str),
      idx == #states and "true" or "false")
  end
  out[#out+1] = "\\flowend"
  return table.concat(out, "\n")
end

-- directive-table: \directivebegin{title}, \directivecategory{name},
--                  \directive{name}{type}{default}{desc}, \directiveend
function renderers.directive_table(text)
  local data = parse_yaml(text)
  local out = {
    string.format("\\directivebegin{%s}", escape_latex(data.title or "Directives"))
  }
  for _, cat in ipairs(data.categories or {}) do
    out[#out+1] = string.format("\\directivecategory{%s}", escape_latex(cat.name or ""))
    for _, d in ipairs(cat.directives or {}) do
      out[#out+1] = string.format("\\directive{%s}{%s}{%s}{%s}",
        escape_latex(d.name or ""),
        escape_latex(d.type or ""),
        escape_latex(tostring(d.default or "")),
        escape_latex(d.description or ""))
    end
  end
  out[#out+1] = "\\directiveend"
  return table.concat(out, "\n")
end

-- step-type: \stepbegin{name}{category}, \stepdesc{text},
--            \stepprop{name}{type}{required}{desc}, \stepexample{code}, \stepend
function renderers.step_type(text)
  local data = parse_yaml(text)
  local out = {
    string.format("\\stepbegin{%s}{%s}",
      escape_latex(data.name or "Step"),
      (data.category or "sync"):lower())
  }
  if data.description then
    out[#out+1] = string.format("\\stepdesc{%s}", escape_latex(data.description))
  end
  for _, p in ipairs(data.properties or {}) do
    out[#out+1] = string.format("\\stepprop{%s}{%s}{%s}{%s}",
      escape_latex(p.name or ""),
      escape_latex(p.type or ""),
      p.required and "true" or "false",
      escape_latex(p.description or ""))
  end
  if data.example then
    out[#out+1] = string.format("\\stepexample{%s}", escape_verbatim(trim(data.example)))
  end
  out[#out+1] = "\\stepend"
  return table.concat(out, "\n")
end

-- config-example: \configbegin{title}{language}, \configcode{code},
--                 \configannotation{line}{text}, \configend
function renderers.config_example(text)
  local data = parse_yaml(text)
  local out = {
    string.format("\\configbegin{%s}{%s}",
      escape_latex(data.title or ""),
      escape_latex(data.language or "json"))
  }
  if data.code then
    out[#out+1] = string.format("\\configcode{%s}", escape_verbatim(trim(data.code)))
  end
  for _, a in ipairs(data.annotations or {}) do
    out[#out+1] = string.format("\\configannotation{%d}{%s}",
      a.line or 0, escape_latex(a.text or ""))
  end
  out[#out+1] = "\\configend"
  return table.concat(out, "\n")
end

-- side-by-side: \sidebegin, \sidepanel{title}{content}{language}, \sideend
function renderers.side_by_side(text)
  local data = parse_yaml(text)
  local left = data.left or {}
  local right = data.right or {}
  local out = {
    "\\sidebegin",
    string.format("\\sidepanel{%s}{%s}{%s}",
      escape_latex(left.title or ""),
      left.language and escape_verbatim(left.content or "") or escape_latex(left.content or ""),
      escape_latex(left.language or "")),
    string.format("\\sidepanel{%s}{%s}{%s}",
      escape_latex(right.title or ""),
      right.language and escape_verbatim(right.content or "") or escape_latex(right.content or ""),
      escape_latex(right.language or "")),
    "\\sideend"
  }
  return table.concat(out, "\n")
end

----------------------------------------------------------------
-- Main filter: intercept code blocks with component classes
----------------------------------------------------------------

local component_map = {
  ["card-grid"]       = renderers.card_grid,
  ["entity-schema"]   = renderers.entity_schema,
  ["api-endpoint"]    = renderers.api_endpoint,
  ["status-flow"]     = renderers.status_flow,
  ["directive-table"] = renderers.directive_table,
  ["step-type"]       = renderers.step_type,
  ["config-example"]  = renderers.config_example,
  ["side-by-side"]    = renderers.side_by_side,
}

function CodeBlock(block)
  local cls = block.classes[1]
  if cls and component_map[cls] then
    local latex = component_map[cls](block.text)
    return raw(latex)
  end
  -- Mermaid: replace with placeholder
  if cls == "mermaid" then
    return raw("\\mermaidbegin\n\\begin{verbatim}\n" ..
      escape_verbatim(block.text) ..
      "\n\\end{verbatim}\n\\mermaidend")
  end
  return nil
end

return {{CodeBlock = CodeBlock}}
