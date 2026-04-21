-- yaml-parser.lua — Shared YAML parser for Pandoc Lua filters
-- Injected at runtime by latex-export.js (concatenated before each filter).
-- Handles the YAML subset used by DocsifyTemplate components:
--   key-value pairs, arrays of objects, multiline strings (|),
--   inline arrays ([a, b]), booleans, numbers, quoted strings.

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
            if next_stripped == "" then
              i = i + 1
              goto continue2
            end
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
