# Export — Patterns

## Creating a New Lua Filter

### 1. Start from the template

Copy `llm-components.lua` (simpler) as a starting point. Every filter needs:

1. The embedded YAML parser (~120 lines, copy verbatim)
2. A renderers table with a function per component
3. A `CodeBlock` handler that dispatches by class name
4. A return statement: `return {{CodeBlock = CodeBlock}}`

### 2. Add renderer functions

Each renderer receives the raw YAML text and returns either:

**For LaTeX output** — a string passed to `pandoc.RawBlock("latex", str)`:
```lua
function renderers.card_grid(text)
  local cards = parse_yaml(text)
  local out = {"\\begin{cardgrid}"}
  for _, card in ipairs(cards) do
    out[#out+1] = string.format("\\card{%s}{%s}",
      escape_latex(card.title), escape_latex(card.description))
  end
  out[#out+1] = "\\end{cardgrid}"
  return table.concat(out, "\n")
end
```

**For markdown/text output** — a string passed through `pandoc.read()` for re-processing:
```lua
function renderers.card_grid(text)
  local cards = parse_yaml(text)
  local out = {}
  for _, card in ipairs(cards) do
    out[#out+1] = "- **" .. card.title .. "**: " .. card.description
  end
  return table.concat(out, "\n")
end

-- In CodeBlock handler:
local md = renderers.card_grid(block.text)
local doc = pandoc.read(md, "markdown")
return doc.blocks  -- Returns parsed AST nodes
```

### 3. Register the filter in latex-export.js

Add an entry to `FORMAT_DEFS`:

```javascript
{ value: 'my-format', label: 'My Format', to: 'latex',
  filter: 'filters/my-filter.lua', template: 'templates/my-template.tex',
  ext: '.tex', mime: 'text/x-tex' }
```

## Creating a New LaTeX Template

### 1. Start from branded.tex

The template needs:
- `\documentclass` and packages
- Custom environments matching what the Lua filter generates
- `$body$` placeholder where Pandoc inserts content
- Optional: `$if(title)$...$endif$` for conditional sections

### 2. Map brand colors

Extract from `theme.css` `:root` and define in LaTeX:

```latex
%% theme.css: --accent: #0891b2
\definecolor{accent}{HTML}{0891B2}
```

### 3. Define component environments

Each environment wraps the content the Lua filter generates:

```latex
\newenvironment{cardgrid}{%
  \begin{tcolorbox}[colback=surfaceraised, ...]%
}{%
  \end{tcolorbox}%
}
```

## Adding a New Component to All Filters

When you create a new Docsify component, update ALL filters:

1. **`latex-components.lua`** — Add `renderers.new_component` + entry in `component_map`
2. **`llm-components.lua`** — Add `renderers.new_component` + entry in `component_map`
3. **`branded.tex`** — Add `\newenvironment{newcomponent}` if needed
4. **Any future filters** — Same pattern

## Single-Source-Many-Outputs Workflow

The design pattern for this system:

```
Author writes markdown once (with YAML components)
  ↓
Browser renders interactive HTML (component-renderer.js)
  ↓
Export with different filter+template combos:
  ├── LaTeX filter + branded template  →  Corporate PDF
  ├── LaTeX filter + minimal template  →  Clean PDF
  ├── LLM filter + no template         →  Agent context
  ├── Slides filter + beamer template  →  Presentation
  └── No filter + no template          →  Raw format conversion
```

## Rebranding the PDF Output

1. Edit `docs/templates/branded.tex`
2. Change `\definecolor` values to match new brand
3. Update `\fancyhead` text
4. Optionally add logo: `\includegraphics` in the title section
5. The Lua filter stays the same — it generates structure, not style
