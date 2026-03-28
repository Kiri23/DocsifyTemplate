-- llm-components.lua — Pandoc Lua filter
-- Transforms DocsifyTemplate YAML code fence components into clean,
-- semantic, structured text optimized for LLM context consumption.
-- Strips all visual/interactive artifacts, preserves information density.

----------------------------------------------------------------
-- Minimal YAML parser (same as latex-components.lua)
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

      if stripped:sub(1,2) == "- " then
        is_array = true
        local item_text = stripped:sub(3)
        local key, val = item_text:match("^([%w_%-]+):%s*(.*)$")
        if key then
          local obj = {}
          obj[key] = parse_value(val)
          i = i + 1
          while i <= #lines do
            local next_line = lines[i]
            local next_stripped = trim(next_line)
            local next_indent = get_indent(next_line)
            if next_stripped == "" then i = i + 1; goto continue2 end
            if next_indent <= indent then break end
            local nk, nv = next_stripped:match("^([%w_%-]+):%s*(.*)$")
            if nk then
              if trim(nv) == "|" then
                local ml = {}
                i = i + 1
                local ml_indent = nil
                while i <= #lines do
                  local ml_line = lines[i]
                  local ml_stripped = trim(ml_line)
                  local ml_ind = get_indent(ml_line)
                  if ml_indent == nil and ml_stripped ~= "" then ml_indent = ml_ind end
                  if ml_stripped == "" then ml[#ml+1] = ""; i = i + 1
                  elseif ml_indent and ml_ind >= ml_indent then
                    ml[#ml+1] = ml_line:sub(ml_indent + 1); i = i + 1
                  else break end
                end
                obj[nk] = table.concat(ml, "\n")
              elseif trim(nv):sub(1,1) == "[" then
                obj[nk] = parse_value(nv); i = i + 1
              else
                obj[nk] = parse_value(nv); i = i + 1
              end
            else break end
            ::continue2::
          end
          result[#result+1] = obj
        else
          result[#result+1] = parse_value(item_text)
          i = i + 1
        end
      else
        local key, val = stripped:match("^([%w_%-]+):%s*(.*)$")
        if key then
          if trim(val) == "|" then
            local ml = {}
            i = i + 1
            local ml_indent = nil
            while i <= #lines do
              local ml_line = lines[i]
              local ml_stripped = trim(ml_line)
              local ml_ind = get_indent(ml_line)
              if ml_indent == nil and ml_stripped ~= "" then ml_indent = ml_ind end
              if ml_stripped == "" then ml[#ml+1] = ""; i = i + 1
              elseif ml_indent and ml_ind >= ml_indent then
                ml[#ml+1] = ml_line:sub(ml_indent + 1); i = i + 1
              else break end
            end
            result[key] = table.concat(ml, "\n")
          elseif trim(val) == "" then
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
            result[key] = parse_value(val); i = i + 1
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
-- FORMAT FUNCTIONS — OPEN FOR MODIFICATION
-- Each function receives parsed data and returns markdown string.
-- Edit these to change how components appear in LLM output.
-- The parser and dispatcher below are CLOSED — don't touch them.
--
-- CONTRACT: Each format_* receives a Lua table (parsed YAML).
-- Returns a markdown string. The dispatcher re-parses it into AST.
----------------------------------------------------------------

local fmt = {}

-- card-grid → bullet list
-- data: array of {title, description, icon, href}
function fmt.card_grid(data)
  local out = {}
  for _, card in ipairs(data) do
    local line = "- **" .. (card.title or "Untitled") .. "**"
    if card.description then
      line = line .. ": " .. card.description
    end
    out[#out+1] = line
  end
  return table.concat(out, "\n")
end

-- entity-schema → heading + table
-- data: {name, parent, fields: [{name, type, required, description, values}]}
function fmt.entity_schema(data)
  local name = data.name or "Entity"
  local parent_str = data.parent and (" (extends " .. data.parent .. ")") or ""
  local out = {
    "### Entity: " .. name .. parent_str,
    "",
    "| Field | Type | Required | Description |",
    "|-------|------|----------|-------------|"
  }
  for _, f in ipairs(data.fields or {}) do
    local desc = f.description or ""
    if f.values and type(f.values) == "table" then
      desc = desc .. " Values: " .. table.concat(f.values, ", ")
    end
    out[#out+1] = string.format("| `%s` | `%s` | %s | %s |",
      f.name or "", f.type or "any", f.required and "Yes" or "No", desc)
  end
  return table.concat(out, "\n")
end

-- api-endpoint → heading + params list + response block
-- data: {method, path, description, params: [{name, type, required}], response}
function fmt.api_endpoint(data)
  local method = (data.method or "GET"):upper()
  local out = { "### " .. method .. " `" .. (data.path or "/") .. "`" }
  if data.description then
    out[#out+1] = ""
    out[#out+1] = data.description
  end
  if data.params and #data.params > 0 then
    out[#out+1] = ""
    out[#out+1] = "**Parameters:**"
    for _, p in ipairs(data.params) do
      out[#out+1] = string.format("- `%s` (%s)%s",
        p.name or "", p.type or "any", p.required and " (required)" or "")
    end
  end
  if data.response then
    out[#out+1] = ""
    out[#out+1] = "**Response:**"
    out[#out+1] = "```json"
    out[#out+1] = trim(data.response)
    out[#out+1] = "```"
  end
  return table.concat(out, "\n")
end

-- status-flow → flow line + state details
-- data: {states: [{id, label, trigger, next, effects}]}
function fmt.status_flow(data)
  local states = data.states or {}
  local labels = {}
  for _, s in ipairs(states) do
    labels[#labels+1] = s.label or s.id or "?"
  end
  local out = {
    "### State Machine",
    "",
    "**Flow:** " .. table.concat(labels, " → "),
    ""
  }
  for _, s in ipairs(states) do
    out[#out+1] = "**" .. (s.label or s.id or "State") .. "**"
    if s.trigger then out[#out+1] = "- Trigger: " .. s.trigger end
    if s.next and type(s.next) == "table" and #s.next > 0 then
      out[#out+1] = "- Next: " .. table.concat(s.next, ", ")
    end
    if s.effects and type(s.effects) == "table" and #s.effects > 0 then
      out[#out+1] = "- Effects: " .. table.concat(s.effects, ", ")
    end
    out[#out+1] = ""
  end
  return table.concat(out, "\n")
end

-- directive-table → flat table
-- data: {title, categories: [{name, directives: [{name, type, default, description}]}]}
function fmt.directive_table(data)
  local out = {
    "### " .. (data.title or "Directives"),
    "",
    "| Directive | Type | Default | Description |",
    "|-----------|------|---------|-------------|"
  }
  for _, cat in ipairs(data.categories or {}) do
    for _, d in ipairs(cat.directives or {}) do
      out[#out+1] = string.format("| `%s` | %s | %s | %s |",
        d.name or "", d.type or "", tostring(d.default or "---"), d.description or "")
    end
  end
  return table.concat(out, "\n")
end

-- step-type → heading + props list + example
-- data: {name, category, description, properties: [{name, type, required, description}], example}
function fmt.step_type(data)
  local out = {
    "### Step: " .. (data.name or "Step") .. " (" .. (data.category or "sync"):lower() .. ")"
  }
  if data.description then
    out[#out+1] = ""
    out[#out+1] = data.description
  end
  if data.properties and #data.properties > 0 then
    out[#out+1] = ""
    out[#out+1] = "**Properties:**"
    for _, p in ipairs(data.properties) do
      out[#out+1] = string.format("- `%s` (%s)%s%s",
        p.name or "", p.type or "any",
        p.required and " (required)" or "",
        p.description and (": " .. p.description) or "")
    end
  end
  if data.example then
    out[#out+1] = ""
    out[#out+1] = "**Example:**"
    out[#out+1] = "```json"
    out[#out+1] = trim(data.example)
    out[#out+1] = "```"
  end
  return table.concat(out, "\n")
end

-- config-example → code block + annotations list
-- data: {title, language, code, annotations: [{line, text}]}
function fmt.config_example(data)
  local out = {}
  if data.title then
    out[#out+1] = "**" .. data.title .. "**"
    out[#out+1] = ""
  end
  out[#out+1] = "```" .. (data.language or "json")
  out[#out+1] = trim(data.code or "")
  out[#out+1] = "```"
  if data.annotations and #data.annotations > 0 then
    out[#out+1] = ""
    out[#out+1] = "**Annotations:**"
    for _, a in ipairs(data.annotations) do
      out[#out+1] = string.format("- Line %d: %s", a.line or 0, a.text or "")
    end
  end
  return table.concat(out, "\n")
end

-- side-by-side → two labeled sections
-- data: {left: {title, content, language}, right: {title, content, language}}
function fmt.side_by_side(data)
  local function panel(p, label)
    local parts = { "**" .. (p.title or label) .. ":**" }
    if p.content then
      if p.language then
        parts[#parts+1] = "```" .. p.language
        parts[#parts+1] = p.content
        parts[#parts+1] = "```"
      else
        parts[#parts+1] = p.content
      end
    end
    return table.concat(parts, "\n")
  end
  return panel(data.left or {}, "Left") .. "\n\n" .. panel(data.right or {}, "Right")
end

----------------------------------------------------------------
-- DISPATCHER — CLOSED FOR MODIFICATION
-- Parses YAML, calls the format function, re-parses as markdown.
-- Do NOT edit below this line.
----------------------------------------------------------------

local component_map = {
  ["card-grid"]       = fmt.card_grid,
  ["entity-schema"]   = fmt.entity_schema,
  ["api-endpoint"]    = fmt.api_endpoint,
  ["status-flow"]     = fmt.status_flow,
  ["directive-table"] = fmt.directive_table,
  ["step-type"]       = fmt.step_type,
  ["config-example"]  = fmt.config_example,
  ["side-by-side"]    = fmt.side_by_side,
}

function CodeBlock(block)
  local cls = block.classes[1]
  if cls and component_map[cls] then
    local data = parse_yaml(block.text)
    local md = component_map[cls](data)
    local doc = pandoc.read(md, "markdown")
    return doc.blocks
  end
  -- Mermaid: pass through as-is (LLMs can read mermaid)
  if cls == "mermaid" then
    return nil
  end
  return nil
end

return {{CodeBlock = CodeBlock}}
