# DocsifyTemplate

## Rules

**Don't add SW/WASM unless JS can't solve it.** Service Workers and WebAssembly are justified only when plain JS hits a real capability or performance wall (e.g., Pandoc WASM exists because JS cannot convert markdown to LaTeX). Until then, it's recreational engineering — fun, but not necessary.

## What This Is

Reusable zero-build-step interactive docs framework powered by Docsify with custom data-driven components. All components are agnostic: they receive generic YAML data via code fences and render HTML.

## IMPORTANT: Design System Rules

Before modifying ANY component or style, you MUST read `.interface-design/system.md` first. This file is the single source of truth for colors, spacing, typography, and patterns.

**ALWAYS use CSS custom properties from `:root` in `theme.css`** when writing or changing styles. NEVER hardcode hex, rgb, or rgba values outside of `:root`. For alpha variants use the `rgb(var(--*-rgb) / alpha)` pattern — NOT raw `rgba()`.

Check `:root` in `lib/styles/theme.css` for available variables. If you need a color that doesn't exist, add it as a variable to `:root` first.

The goal is: duplicate this project, change only `:root`, get a different brand.

## The Core Idea

**Template literal functions ARE React components** — without JSX, without a bundler, without a build step.

**HTMX replaces React's re-rendering** — tabs switch content via virtual routes (`/api/switch/quick-start`), no page reload. A 30-line interceptor (`htmx-virtual.js`) catches fake HTTP requests and swaps DOM content from `window.__pageSections`.

**Docsify replaces everything else** — routing, sidebar, search, markdown rendering.

## Architecture

```
Docsify (routing, sidebar, search, markdown rendering)
  └── Adapter: renderer.js (single orchestrator)
        ├── beforeEach: detect YAML frontmatter, strip it, AST-transform markdown (via unified/remark)
        ├── afterEach: split into Quick Start / Technical tabs
        └── doneEach: transformDOM + injectDOM + observeDOM lifecycle

Core Engine (lib/core/ — pure functions, no DOM):
  ├── markdown-utils.js    — frontmatter, toCamelCase, COMPONENT_REGISTRY
  ├── markdown-transform.js — AST-based code fence processing (unified/remark)
  ├── dom-transform.js     — transformDOM/injectDOM/observeDOM patterns
  ├── export-renderers.js  — Typst/LaTeX/Markdown renderers for export
  └── registry.js          — Preact component registry + bridge

HTMX (tab switching, ES module)
  └── htmx-virtual.js
        ├── Intercepts /api/switch/* (no real HTTP)
        ├── Uses transformDOM for consistent post-swap processing
        └── Swaps #tab-content innerHTML + re-highlights
```

### Code Fence Component Pipeline

1. Author writes ` ```component-name ` with YAML content in markdown
2. `markdown-transform.js` parses markdown AST via unified/remark-parse
3. Finds code fences matching COMPONENT_REGISTRY entries
4. Parses YAML via `js-yaml`, calls renderComponent callback
5. Component is rendered via Preact bridge (placeholder or string mode)

## Project Structure

```
DocsifyTemplate/
├── package.json
├── README.md
├── CLAUDE.md
├── lib/                         # Framework library (ship this)
│   ├── core/                    # Pure functions, no DOM dependency
│   │   ├── markdown-utils.js    # Frontmatter, toCamelCase, COMPONENT_REGISTRY
│   │   ├── markdown-transform.js # AST-based markdown processing (unified/remark)
│   │   ├── dom-transform.js     # transformDOM/injectDOM/observeDOM patterns
│   │   ├── export-renderers.js  # Typst/LaTeX/Markdown renderers for export
│   │   └── registry.js          # Preact component registry + bridge
│   ├── components/              # Data-driven Preact components
│   │   ├── api-endpoint.js
│   │   ├── card-grid.js
│   │   ├── code-block.js
│   │   ├── config-example.js
│   │   ├── directive-table.js
│   │   ├── entity-schema.js
│   │   ├── region-toggle.js
│   │   ├── side-by-side.js
│   │   ├── status-flow.js
│   │   ├── step-type.js
│   │   └── tabs.js
│   ├── adapters/
│   │   └── docsify/
│   │       ├── renderer.js      # Single orchestrator (imports features)
│   │       ├── features/        # Feature modules (exported functions, no standalone plugins)
│   │       │   ├── copy-button.js
│   │       │   ├── htmx-virtual.js
│   │       │   ├── latex-export.js
│   │       │   ├── sidebar.js
│   │       │   └── tutorial-header.js
│   │       ├── dom-helpers/     # Shared DOM operations
│   │       │   ├── mermaid-dom.js
│   │       │   └── mermaid-capture.js
│   │       └── export/          # Pandoc WASM export pipeline
│   │           ├── filters/     # Lua filters (latex, typst, llm)
│   │           ├── templates/   # LaTeX/Typst branded templates
│   │           ├── pandoc.js    # WASM interface
│   │           ├── pipeline.js  # Export orchestrator
│   │           └── wasm-loaders.js
│   └── styles/
│       └── theme.css
├── docs/                        # Documentation content (served by Docsify)
│   ├── index.html               # Entry point (loads from ../lib/)
│   ├── .nojekyll
│   ├── _sidebar.md
│   ├── README.md
│   └── content/                 # Guide, examples, showcase
└── test/                        # Test pages
```

## Component Registry

Components must be registered in two places:
1. `docs/index.html` — `<script>` tag to load the JS file
2. `lib/core/markdown-utils.js` — add name to `COMPONENT_REGISTRY` array

Current registry: `entity-schema`, `api-endpoint`, `status-flow`, `directive-table`, `step-type`, `config-example`, `card-grid`

Note: `tabs`, `code-block`, and `region-toggle` are NOT in the registry — they're used differently.

## Content Authoring

### Plain pages
Just write markdown.

### Component pages (with tabs)
Add YAML frontmatter + `## Quick Start` / `## Technical Reference` sections.

### Code fence components
Use any registered component name as a code fence language with YAML content.

### Mermaid diagrams
Standard ` ```mermaid ` fences work.

## CDN Dependencies

| Dep | Purpose |
|---|---|
| Docsify 4 | Routing, sidebar, search, markdown |
| HTMX 2.0.3 | Tab content swapping |
| Tailwind CSS v4 (browser) | Component styling |
| Prism.js + languages | Syntax highlighting |
| Mermaid 10.9 | Diagrams |
| js-yaml | YAML parsing for code fence components |
| unified + remark-parse | AST-based markdown transformation |
| unist-util-visit | AST tree traversal |

## Brand Colors

- Primary: `#0891b2` (change in theme.css `:root` + index.html Tailwind `@theme`)

## Running

```bash
npm run serve  # → http://localhost:3009/docs/
```
