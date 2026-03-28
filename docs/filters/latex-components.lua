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
-- Component renderers
----------------------------------------------------------------

local renderers = {}

function renderers.card_grid(text)
  local cards = parse_yaml(text)
  local out = {"\\begin{cardgrid}"}
  for _, card in ipairs(cards) do
    local icon = escape_latex(card.icon or "")
    local title = escape_latex(card.title or "Untitled")
    local desc = escape_latex(card.description or "")
    out[#out+1] = string.format("  \\card{%s}{%s}{%s}", icon, title, desc)
  end
  out[#out+1] = "\\end{cardgrid}"
  return table.concat(out, "\n")
end

function renderers.entity_schema(text)
  local data = parse_yaml(text)
  local name = escape_latex(data.name or "Entity")
  local parent = data.parent and (" \\textit{extends " .. escape_latex(data.parent) .. "}") or ""
  local out = {
    string.format("\\begin{entityschema}{%s%s}", name, parent),
    "  \\begin{tabularx}{\\textwidth}{l l c X}",
    "    \\toprule",
    "    \\textbf{Field} & \\textbf{Type} & \\textbf{Req.} & \\textbf{Description} \\\\",
    "    \\midrule"
  }
  local fields = data.fields or {}
  for _, f in ipairs(fields) do
    local req = f.required and "\\required" or ""
    local desc = escape_latex(f.description or "")
    if f.values and type(f.values) == "table" then
      desc = desc .. " Values: \\texttt{" .. escape_latex(table.concat(f.values, ", ")) .. "}"
    end
    out[#out+1] = string.format("    \\texttt{%s} & \\typebadge{%s} & %s & %s \\\\",
      escape_latex(f.name or ""), escape_latex(f.type or "any"), req, desc)
  end
  out[#out+1] = "    \\bottomrule"
  out[#out+1] = "  \\end{tabularx}"
  out[#out+1] = "\\end{entityschema}"
  return table.concat(out, "\n")
end

function renderers.api_endpoint(text)
  local data = parse_yaml(text)
  local method = (data.method or "GET"):upper()
  local path = escape_latex(data.path or "/")
  local desc = escape_latex(data.description or "")
  local out = {
    string.format("\\begin{apiendpoint}{%s}{%s}", method, path),
    string.format("  %s", desc)
  }
  local params = data.params or {}
  if #params > 0 then
    out[#out+1] = "  \\vspace{0.5em}"
    out[#out+1] = "  \\begin{tabular}{l l c}"
    out[#out+1] = "    \\textbf{Parameter} & \\textbf{Type} & \\textbf{Required} \\\\"
    out[#out+1] = "    \\midrule"
    for _, p in ipairs(params) do
      local req = p.required and "\\required" or ""
      out[#out+1] = string.format("    \\texttt{%s} & \\typebadge{%s} & %s \\\\",
        escape_latex(p.name or ""), escape_latex(p.type or "any"), req)
    end
    out[#out+1] = "  \\end{tabular}"
  end
  if data.response then
    out[#out+1] = "  \\vspace{0.5em}"
    out[#out+1] = "  \\textbf{Response:}"
    out[#out+1] = "  \\begin{verbatim}"
    out[#out+1] = escape_verbatim(trim(data.response))
    out[#out+1] = "  \\end{verbatim}"
  end
  out[#out+1] = "\\end{apiendpoint}"
  return table.concat(out, "\n")
end

function renderers.status_flow(text)
  local data = parse_yaml(text)
  local states = data.states or {}
  local out = {"\\begin{statusflow}"}
  for idx, s in ipairs(states) do
    local label = escape_latex(s.label or s.id or "State")
    local trigger = escape_latex(s.trigger or "")
    local next_states = ""
    if s.next and type(s.next) == "table" then
      next_states = escape_latex(table.concat(s.next, ", "))
    end
    local effects = ""
    if s.effects and type(s.effects) == "table" then
      effects = escape_latex(table.concat(s.effects, ", "))
    end
    local arrow = idx < #states and " $\\rightarrow$ " or ""
    out[#out+1] = string.format("  \\state{%s}{%s}{%s}{%s}%s",
      label, trigger, next_states, effects, arrow)
  end
  out[#out+1] = "\\end{statusflow}"
  return table.concat(out, "\n")
end

function renderers.directive_table(text)
  local data = parse_yaml(text)
  local title = escape_latex(data.title or "Directives")
  local out = {
    string.format("\\subsection*{%s}", title),
    "\\begin{longtable}{l l p{0.5\\textwidth}}",
    "  \\toprule",
    "  \\textbf{Directive} & \\textbf{Type} & \\textbf{Description} \\\\",
    "  \\midrule",
    "  \\endhead"
  }
  local categories = data.categories or {}
  for _, cat in ipairs(categories) do
    out[#out+1] = string.format("  \\multicolumn{3}{l}{\\textbf{\\textcolor{accent}{%s}}} \\\\",
      escape_latex(cat.name or ""))
    out[#out+1] = "  \\midrule"
    local directives = cat.directives or {}
    for _, d in ipairs(directives) do
      local default_str = ""
      if d.default then
        default_str = " (default: \\texttt{" .. escape_latex(tostring(d.default)) .. "})"
      end
      out[#out+1] = string.format("  \\texttt{%s} & \\typebadge{%s} & %s%s \\\\",
        escape_latex(d.name or ""), escape_latex(d.type or ""), escape_latex(d.description or ""), default_str)
    end
  end
  out[#out+1] = "  \\bottomrule"
  out[#out+1] = "\\end{longtable}"
  return table.concat(out, "\n")
end

function renderers.step_type(text)
  local data = parse_yaml(text)
  local name = escape_latex(data.name or "Step")
  local category = (data.category or "sync"):lower()
  local badge = category == "async" and "\\asyncbadge" or "\\syncbadge"
  local desc = escape_latex(data.description or "")
  local out = {
    string.format("\\begin{steptype}{%s}{%s}", name, badge),
    string.format("  %s", desc)
  }
  local props = data.properties or {}
  if #props > 0 then
    out[#out+1] = "  \\vspace{0.5em}"
    out[#out+1] = "  \\begin{tabular}{l l c p{0.4\\textwidth}}"
    out[#out+1] = "    \\textbf{Property} & \\textbf{Type} & \\textbf{Req.} & \\textbf{Description} \\\\"
    out[#out+1] = "    \\midrule"
    for _, p in ipairs(props) do
      local req = p.required and "\\required" or ""
      out[#out+1] = string.format("    \\texttt{%s} & \\typebadge{%s} & %s & %s \\\\",
        escape_latex(p.name or ""), escape_latex(p.type or ""), req, escape_latex(p.description or ""))
    end
    out[#out+1] = "  \\end{tabular}"
  end
  if data.example then
    out[#out+1] = "  \\vspace{0.5em}"
    out[#out+1] = "  \\begin{verbatim}"
    out[#out+1] = escape_verbatim(trim(data.example))
    out[#out+1] = "  \\end{verbatim}"
  end
  out[#out+1] = "\\end{steptype}"
  return table.concat(out, "\n")
end

function renderers.config_example(text)
  local data = parse_yaml(text)
  local title = escape_latex(data.title or "")
  local lang = data.language or "json"
  local code = data.code or ""
  local out = {}
  if title ~= "" then
    out[#out+1] = string.format("\\paragraph{%s}", title)
  end
  out[#out+1] = "\\begin{verbatim}"
  out[#out+1] = escape_verbatim(trim(code))
  out[#out+1] = "\\end{verbatim}"
  local annotations = data.annotations or {}
  if #annotations > 0 then
    out[#out+1] = "\\begin{annotationlist}"
    for _, a in ipairs(annotations) do
      out[#out+1] = string.format("  \\annotation{%d}{%s}",
        a.line or 0, escape_latex(a.text or ""))
    end
    out[#out+1] = "\\end{annotationlist}"
  end
  return table.concat(out, "\n")
end

function renderers.side_by_side(text)
  local data = parse_yaml(text)
  local left = data.left or {}
  local right = data.right or {}
  local function render_panel(panel)
    local parts = {}
    if panel.title then
      parts[#parts+1] = string.format("\\textbf{%s}\\\\[0.5em]", escape_latex(panel.title))
    end
    if panel.content then
      if panel.language then
        parts[#parts+1] = string.format("\\begin{lstlisting}[language=%s, style=code]", panel.language)
        parts[#parts+1] = panel.content
        parts[#parts+1] = "\\end{lstlisting}"
      else
        parts[#parts+1] = escape_latex(panel.content)
      end
    end
    return table.concat(parts, "\n")
  end
  local out = {
    "\\begin{sidebyside}",
    "  \\begin{minipage}[t]{0.48\\textwidth}",
    "    " .. render_panel(left),
    "  \\end{minipage}\\hfill",
    "  \\begin{minipage}[t]{0.48\\textwidth}",
    "    " .. render_panel(right),
    "  \\end{minipage}",
    "\\end{sidebyside}"
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
    return raw("\\begin{mermaidplaceholder}\n\\begin{verbatim}\n" ..
      escape_verbatim(block.text) ..
      "\n\\end{verbatim}\n\\end{mermaidplaceholder}")
  end
  return nil
end

return {{CodeBlock = CodeBlock}}
