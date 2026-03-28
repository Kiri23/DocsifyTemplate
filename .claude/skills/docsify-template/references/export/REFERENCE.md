# Export — Reference

Single-source-many-outputs pipeline: one markdown file transforms into branded LaTeX/PDF, LLM-optimized text, or any Pandoc-supported format — all client-side via Pandoc WASM.

## Architecture

```
Markdown (Docsify page)
  ↓
latex-export.js (UI: button + format dropdown)
  ↓ fetches raw .md, strips frontmatter
  ↓ lazy-loads pandoc.wasm (~56MB, cached after first use)
  ↓
pandoc.js (WASI interface)
  ↓ initializes WebAssembly + virtual filesystem
  ↓
Pandoc WASM (convert function)
  ├── Lua filter (transforms YAML code fence components)
  ├── Template (branded document wrapper)
  └── Output format (latex, markdown, html, rst, org)
  ↓
Downloaded file (.tex, .md, .html, etc.)
```

## File Map

| File | Purpose |
|------|---------|
| `docs/plugins/latex-export.js` | Docsify plugin: export button, format selector, orchestrates conversion |
| `docs/plugins/pandoc.js` | Official Pandoc WASI interface (from jgm/pandoc repo) |
| `docs/pandoc.wasm` | Pandoc binary compiled to WebAssembly (~56MB, Git LFS) |
| `docs/filters/latex-components.lua` | Lua filter: YAML components → branded LaTeX environments |
| `docs/filters/llm-components.lua` | Lua filter: YAML components → clean semantic markdown |
| `docs/templates/branded.tex` | LaTeX template with brand colors, header/footer, custom environments |

## The Pattern

```
Filter (business logic)  +  Template (branding)  =  Output
─────────────────────────────────────────────────────────────
latex-components.lua      +  branded.tex          =  Branded PDF
llm-components.lua        +  (none)               =  LLM context text
(future) slides.lua       +  beamer.tex           =  Presentation
(future) minimal.lua      +  clean.tex            =  Minimal PDF
```

Filters decide HOW components transform. Templates decide HOW the document LOOKS. Mix and match freely.

## Key Concepts

### Lazy Loading
The 56MB WASM binary only loads when the user clicks Export for the first time. After that it's cached by the browser. Filter and template files are fetched and cached on first use too.

### YAML Code Fence Components in Export
In the browser, `component-renderer.js` transforms YAML fences into interactive HTML. In export, Lua filters perform the equivalent transformation for the target format. The same YAML data flows through different renderers:

```
```card-grid                    ← Same YAML source
- title: "Users API"
  description: "Manage users"
```
  ↓ Browser: CardGrid()         → Interactive HTML cards
  ↓ LaTeX filter: card_grid()   → \begin{cardgrid}\card{...}
  ↓ LLM filter: card_grid()    → - **Users API**: Manage users
```

### Embedded YAML Parser
Pandoc's Lua environment has NO built-in YAML parser. Each filter embeds a ~120-line Lua parser that handles the subset our components use: key-value pairs, arrays of objects, multiline strings (`|`), inline arrays (`[a, b]`), booleans, numbers.
