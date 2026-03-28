# Export — Configuration

## Adding a New Export Format

Edit `docs/plugins/latex-export.js`, add to `FORMAT_DEFS` array:

```javascript
{
  value: 'my-format',                    // Unique identifier
  label: 'My Format',                    // Dropdown label
  to: 'latex',                           // Pandoc output format
  filter: 'filters/my-filter.lua',       // Lua filter path (or null)
  template: 'templates/my-template.tex', // Template path (or null)
  ext: '.tex',                           // Download extension
  mime: 'text/x-tex'                     // Download MIME type
}
```

Set `filter` and `template` to `null` for plain format conversion without component transformation or branding.

## Configuring the Typst Template (PDF)

### Brand Colors
In `docs/templates/branded.typ`, change `#let` color values:

```
theme.css `:root`              →  branded.typ
──────────────────────────────────────────────
--accent: #0891b2              →  #let accent = rgb("#0891b2")
--surface-raised: #f5f5f4      →  #let surface-raised = rgb("#f5f5f4")
```

### Page Setup
```typst
#set page(paper: "a4", margin: (top: 2.5cm, ...))
#set text(font: "New Computer Modern", size: 11pt)
```

### Component Functions
Each component is a `#let` function. Edit the function body to change rendering:

```typst
#let card(icon, title, desc) = block(
  fill: surface-raised, radius: 4pt, inset: 12pt, width: 100%,
  [*#icon #title* \ #text(fill: text-secondary)[#desc]]
)
```

### Typst vs LaTeX template differences
- Typst: `#let func(args) = { ... }` — functions
- LaTeX: `\newcommand{\func}[N]{...}` — macros
- Typst: `rgb("#hex")` — colors
- LaTeX: `\definecolor{name}{HTML}{hex}` — colors
- Typst functions MUST be self-contained (no cross-function bracket matching)

## Configuring the LaTeX Template

### Brand Colors

In `docs/templates/branded.tex`, change `\definecolor` values to match your brand. Map from CSS custom properties:

```
theme.css `:root`              →  branded.tex
──────────────────────────────────────────────
--accent: #0891b2              →  \definecolor{accent}{HTML}{0891B2}
--accent-light: #ecfeff        →  \definecolor{accentlight}{HTML}{ECFEFF}
--accent-text: #0e7490         →  \definecolor{accenttext}{HTML}{0E7490}
--surface-page: #faf9f7        →  \definecolor{surfacepage}{HTML}{FAF9F7}
--surface-raised: #f5f5f4      →  \definecolor{surfaceraised}{HTML}{F5F5F4}
--border-subtle: #e7e5e4       →  \definecolor{bordersubtle}{HTML}{E7E5E4}
--text-primary: #1c1917        →  \definecolor{textprimary}{HTML}{1C1917}
--text-secondary: #44403c      →  \definecolor{textsecondary}{HTML}{44403C}
--text-muted: #a8a29e          →  \definecolor{textmuted}{HTML}{A8A29E}
```

### Header / Footer

```latex
\fancyhead[L]{\textcolor{textmuted}{\small $if(title)$$title$$endif$}}
\fancyhead[R]{\textcolor{accent}{\small\textbf{Your Brand Name}}}
\fancyfoot[C]{\textcolor{textmuted}{\small\thepage}}
```

### Title Page

The template generates a title page when `metadata.title` is set. Customize the title block:

```latex
\title{%
  {\textcolor{accent}{\rule{\textwidth}{2pt}}}\\[1em]%
  {\Huge\textbf{$title$}}\\[0.5em]%
  {\textcolor{accent}{\rule{\textwidth}{2pt}}}%
}
```

Add a logo: `\includegraphics[width=3cm]{logo.png}` — pass logo as a file in the `files` object.

### Page Layout

```latex
\usepackage[margin=2.5cm]{geometry}  % Page margins
\documentclass[11pt, a4paper]{article}  % Font size, paper
```

## Configuring Lua Filters

### Adding a New Component

When a new component is added to DocsifyTemplate:

1. Add renderer function in BOTH `latex-components.lua` and `llm-components.lua`
2. Add entry to `component_map` in both filters
3. Add LaTeX environment in `branded.tex` (for LaTeX filter)

### Changing Component Rendering

Edit the renderer function in the appropriate filter. Example — change card-grid from tcolorbox to a simple list:

```lua
function renderers.card_grid(text)
  local cards = parse_yaml(text)
  local out = {"\\begin{description}"}
  for _, card in ipairs(cards) do
    out[#out+1] = string.format("\\item[%s] %s",
      escape_latex(card.title), escape_latex(card.description))
  end
  out[#out+1] = "\\end{description}"
  return table.concat(out, "\n")
end
```

No template changes needed — only the filter changes.

## Pandoc WASM Setup

### Getting pandoc.wasm

Download from the official Pandoc release:

```bash
curl -L -o docs/pandoc.wasm \
  "https://pandoc.org/app/pandoc.wasm?sha1=f0b56b0bce5b0c504d66b4c6e45d9fdf67f41da1"
```

### Git LFS Tracking

```bash
git lfs install
git lfs track "docs/pandoc.wasm"
git add .gitattributes docs/pandoc.wasm
```

### pandoc.js Source

The WASI interface file comes from `https://github.com/jgm/pandoc/tree/main/wasm`. If updating Pandoc versions, download the matching `pandoc.js` and `pandoc.wasm` together.

The only modification to the official `pandoc.js`: the fetch URL for the WASM file should use `cache: "force-cache"` for performance.
