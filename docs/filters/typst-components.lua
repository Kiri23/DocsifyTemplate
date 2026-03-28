-- typst-components.lua — Pandoc Lua filter
-- Transforms DocsifyTemplate YAML code fence components into Typst markup.
-- REQUIRES: yaml-parser.lua (injected by latex-export.js at runtime)
-- Functions available from parser: trim(), parse_yaml(), parse_value()
--
-- ARCHITECTURE (Open/Closed):
-- Filter emits Typst function calls: #card("icon", "title", "desc")
-- Template (branded.typ) defines: #let card(icon, title, desc) = [...]
-- To change appearance: edit branded.typ, not this file.

----------------------------------------------------------------
-- Typst helpers
----------------------------------------------------------------

local function escape_typst(s)
  if type(s) ~= "string" then return tostring(s or "") end
  -- Escape Typst special chars: # $ @ \ * _ ` < > ~
  s = s:gsub("\\", "\\\\")
  s = s:gsub("#", "\\#")
  s = s:gsub("%$", "\\$")
  s = s:gsub("@", "\\@")
  s = s:gsub("<", "\\<")
  s = s:gsub(">", "\\>")
  s = s:gsub("~", "\\~")
  return s
end

local function raw(s)
  return pandoc.RawBlock("typst", s)
end

-- Quote a string for Typst: wraps in "..."
local function q(s)
  if type(s) ~= "string" then s = tostring(s or "") end
  s = s:gsub("\\", "\\\\")
  s = s:gsub('"', '\\"')
  return '"' .. s .. '"'
end

----------------------------------------------------------------
-- Component renderers — emit Typst function calls (CLOSED)
-- The branded.typ template defines what these functions do (OPEN)
----------------------------------------------------------------

local renderers = {}

-- card-grid: #cardgridbegin() ... #card("icon", "title", "desc") ... #cardgridend()
function renderers.card_grid(text)
  local cards = parse_yaml(text)
  local out = {"#cardgridbegin()"}
  for _, card in ipairs(cards) do
    out[#out+1] = string.format("#card(%s, %s, %s)",
      q(card.icon or ""),
      q(card.title or "Untitled"),
      q(card.description or ""))
  end
  out[#out+1] = "#cardgridend()"
  return table.concat(out, "\n")
end

-- entity-schema: #entitybegin("name", "parent") #entityfield(...) #entityend()
function renderers.entity_schema(text)
  local data = parse_yaml(text)
  local out = {
    string.format("#entitybegin(%s, %s)",
      q(data.name or "Entity"),
      q(data.parent or ""))
  }
  for _, f in ipairs(data.fields or {}) do
    local vals = ""
    if f.values and type(f.values) == "table" then
      vals = table.concat(f.values, ", ")
    end
    out[#out+1] = string.format("#entityfield(%s, %s, %s, %s, %s)",
      q(f.name or ""),
      q(f.type or "any"),
      f.required and "true" or "false",
      q(f.description or ""),
      q(vals))
  end
  out[#out+1] = "#entityend()"
  return table.concat(out, "\n")
end

-- api-endpoint: #apibegin("METHOD", "/path") #apidesc("...") #apiparam(...) #apiresponse("...") #apiend()
function renderers.api_endpoint(text)
  local data = parse_yaml(text)
  local out = {
    string.format("#apibegin(%s, %s)",
      q((data.method or "GET"):upper()),
      q(data.path or "/"))
  }
  if data.description then
    out[#out+1] = string.format("#apidesc(%s)", q(data.description))
  end
  for _, p in ipairs(data.params or {}) do
    out[#out+1] = string.format("#apiparam(%s, %s, %s)",
      q(p.name or ""),
      q(p.type or "any"),
      p.required and "true" or "false")
  end
  if data.response then
    out[#out+1] = string.format("#apiresponse(%s)", q(trim(data.response)))
  end
  out[#out+1] = "#apiend()"
  return table.concat(out, "\n")
end

-- status-flow: #flowbegin() #flowstate("label", "trigger", "next", "effects", islast) #flowend()
function renderers.status_flow(text)
  local data = parse_yaml(text)
  local states = data.states or {}
  local out = {"#flowbegin()"}
  for idx, s in ipairs(states) do
    local next_str = ""
    if s.next and type(s.next) == "table" then
      next_str = table.concat(s.next, ", ")
    end
    local effects_str = ""
    if s.effects and type(s.effects) == "table" then
      effects_str = table.concat(s.effects, ", ")
    end
    out[#out+1] = string.format("#flowstate(%s, %s, %s, %s, %s)",
      q(s.label or s.id or "State"),
      q(s.trigger or ""),
      q(next_str),
      q(effects_str),
      idx == #states and "true" or "false")
  end
  out[#out+1] = "#flowend()"
  return table.concat(out, "\n")
end

-- directive-table: #directivebegin("title") #directivecategory("name") #directive(...) #directiveend()
function renderers.directive_table(text)
  local data = parse_yaml(text)
  local out = {
    string.format("#directivebegin(%s)", q(data.title or "Directives"))
  }
  for _, cat in ipairs(data.categories or {}) do
    out[#out+1] = string.format("#directivecategory(%s)", q(cat.name or ""))
    for _, d in ipairs(cat.directives or {}) do
      out[#out+1] = string.format("#directive(%s, %s, %s, %s)",
        q(d.name or ""),
        q(d.type or ""),
        q(tostring(d.default or "")),
        q(d.description or ""))
    end
  end
  out[#out+1] = "#directiveend()"
  return table.concat(out, "\n")
end

-- step-type: #stepbegin("name", "category") #stepdesc("...") #stepprop(...) #stepexample("...") #stepend()
function renderers.step_type(text)
  local data = parse_yaml(text)
  local out = {
    string.format("#stepbegin(%s, %s)",
      q(data.name or "Step"),
      q((data.category or "sync"):lower()))
  }
  if data.description then
    out[#out+1] = string.format("#stepdesc(%s)", q(data.description))
  end
  for _, p in ipairs(data.properties or {}) do
    out[#out+1] = string.format("#stepprop(%s, %s, %s, %s)",
      q(p.name or ""),
      q(p.type or ""),
      p.required and "true" or "false",
      q(p.description or ""))
  end
  if data.example then
    out[#out+1] = string.format("#stepexample(%s)", q(trim(data.example)))
  end
  out[#out+1] = "#stepend()"
  return table.concat(out, "\n")
end

-- config-example: #configbegin("title", "lang") #configcode("...") #configannotation(n, "...") #configend()
function renderers.config_example(text)
  local data = parse_yaml(text)
  local out = {
    string.format("#configbegin(%s, %s)",
      q(data.title or ""),
      q(data.language or "json"))
  }
  if data.code then
    out[#out+1] = string.format("#configcode(%s)", q(trim(data.code)))
  end
  for _, a in ipairs(data.annotations or {}) do
    out[#out+1] = string.format("#configannotation(%d, %s)",
      a.line or 0, q(a.text or ""))
  end
  out[#out+1] = "#configend()"
  return table.concat(out, "\n")
end

-- side-by-side: #sidebegin() #sidepanel("title", "content", "lang") #sideend()
function renderers.side_by_side(text)
  local data = parse_yaml(text)
  local left = data.left or {}
  local right = data.right or {}
  local out = {
    "#sidebegin()",
    string.format("#sidepanel(%s, %s, %s)",
      q(left.title or ""),
      q(left.content or ""),
      q(left.language or "")),
    string.format("#sidepanel(%s, %s, %s)",
      q(right.title or ""),
      q(right.content or ""),
      q(right.language or "")),
    "#sideend()"
  }
  return table.concat(out, "\n")
end

----------------------------------------------------------------
-- Dispatcher — CLOSED
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
    local typst = component_map[cls](block.text)
    return raw(typst)
  end
  -- Mermaid: placeholder
  if cls == "mermaid" then
    return raw('#block(fill: luma(245), radius: 4pt, inset: 12pt, width: 100%)[' ..
      '#text(fill: luma(150), style: "italic")[Mermaid diagram — render separately]\n' ..
      '#raw("' .. block.text:gsub('"', '\\"'):gsub("\n", "\\n") .. '")]')
  end
  return nil
end

return {{CodeBlock = CodeBlock}}
