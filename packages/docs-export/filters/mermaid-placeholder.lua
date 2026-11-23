-- Turns fenced ```mermaid blocks into raw Typst placeholders so a post-pass
-- (motor/mermaid.js inlineMermaidSvgs) can splice captured SVGs without Pandoc escaping them.
local mermaid_counter = 0

function CodeBlock(block)
  if block.classes[1] == "mermaid" then
    local placeholder = "%%MERMAID_SVG_" .. mermaid_counter .. "%%"
    mermaid_counter = mermaid_counter + 1
    return pandoc.RawBlock("typst", placeholder)
  end
  return nil
end

return { { CodeBlock = CodeBlock } }
