# DocsifyTemplate

## Rules

**Don't add SW/WASM unless JS can't solve it.** Service Workers and WebAssembly are justified only when plain JS hits a real capability or performance wall (e.g., Pandoc WASM exists because JS cannot convert markdown to LaTeX). Until then, it's recreational engineering — fun, but not necessary.

## Project Vision

DocsifyTemplate is evolving from a docs framework into a **docs intelligence engine** where every capability is a plugin/adapter. The engine is framework-agnostic; Docsify is the first adapter.

**Plugin layers (all in-flight or planned):**
- `yamlComponents` — unified plugin: YAML code fences → HTML / LaTeX / Typst / Markdown
- `@preact/signals` — cross-fence reactive state manager; signals shared across components on one page
- `packages/chat` — WebGPU AI chat engine, zero server, Docsify adapter included
- Backlinks (PR #17) — reverse DAG edges across docs, powered by signals
- Code-docs drift detection (issue #14) — cross-DAG edges between docs ↔ source code
- DAG visualization (issue #13)

**The pattern:** engine (framework-agnostic) + adapters (Docsify, Astro, future others) + serializers (HTML, PDF, Markdown). Same pattern as React (reconciler + react-dom / react-native) and unified (AST + remark/rehype adapters).

**When suggesting new features:** frame them as plugins that extend the engine, not features baked into the Docsify adapter.

**MemoryGraph nodes for this project:**
- Engine evolution & plugin vision: `64657733-bc23-4313-8dcc-06ab6f59915f`
- Engineering DNA (engine/transport mental model): `5997dffe-7089-4a0e-af04-1a834b6b7c1e`
- DAG + credit assignment pattern: `9c106250-d098-4f56-91a2-ad1d64c0200f`

## IMPORTANT: Design System Rules

Before modifying ANY component or style, you MUST read `.interface-design/system.md` first. This file is the single source of truth for colors, spacing, typography, and patterns.

**ALWAYS use CSS custom properties from `:root` in `theme.css`** when writing or changing styles. NEVER hardcode hex, rgb, or rgba values outside of `:root`. For alpha variants use the `rgb(var(--*-rgb) / alpha)` pattern — NOT raw `rgba()`.

Check `:root` in `packages/docsify-plugin/src/styles/theme.css` for available variables. If you need a color that doesn't exist, add it as a variable to `:root` first.

The goal is: duplicate this project, change only `:root`, get a different brand.

## Architecture

```
Docsify (routing, sidebar, search, markdown rendering)
  └── adapters/docsify/index.js  ← all Docsify-specific wiring
        ├── hook.beforeEach: strip frontmatter, AST-transform markdown (yamlComponents)
        ├── hook.afterEach: split Quick Start / Technical tabs
        └── hook.doneEach: transformDOM + injectDOM + observeDOM lifecycle

DAG layers (each depends only on layers below):
  core/        ← pure functions (markdown-transform, registry, config, markdown-utils)
  utils/       ← browser utils (dom-transform)
  renderers/   ← DOM output (preact.js — renders to live DOM)
  serializers/ ← text output (latex, typst, markdown — need external tool to render)
  components/  ← Preact component definitions (zero side effects on import)
  index.js     ← public API (pure re-exports, no DOM, no Docsify)
  adapters/    ← framework wiring (docsify/, astro/)

packages/chat/
  core/chat-engine.js  ← LLM inference (WebGPU, zero server)
  core/worker.js       ← WebGPU worker thread
  ui/chat-dom.js       ← DOM binding
  adapters/docsify.js  ← Docsify plugin
```

### Renderers vs Serializers

| | `renderers/preact.js` | `serializers/*` |
|---|---|---|
| Output | DOM nodes (live UI) | Plain text string |
| Renders itself? | Yes | No — needs external tool |
| External tool | None | LaTeX engine / Typst WASM / Docsify |

### Code Fence Component Pipeline

1. Author writes ` ```component-name ` with YAML content in markdown
2. `core/markdown-transform.js` parses markdown AST via unified/remark-parse
3. Finds code fences matching registered component names
4. Parses YAML via `js-yaml`, calls `transforms[lang](data)` → string
5. Replaces AST node with `{ type: 'html', value: string, position }` (position required for serializeToMarkdown)
6. Docsify renders the HTML string to DOM; Preact mounts into placeholders via `doneEach`

### Export Pipeline (WASM)

```
markdown → Pandoc WASM + Lua filters → LaTeX/Typst → PDF
```

Future target (planned): pre-process YAML fences via JS serializers → clean text → Pandoc (no Lua filters needed).

See `docs/content/guide/wasm-capabilities.md` for full WASM architecture, competitor comparison, and future possibilities (semantic search, executable code blocks, isomorphic-git, local RAG).

## Project Structure

```
DocsifyTemplate/
├── packages/
│   ├── docsify-plugin/          # Distributable npm package (docsify-kiri)
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.js         # Public API — pure re-exports
│   │       ├── core/            # Pure functions, no DOM
│   │       │   ├── markdown-transform.js  # yamlComponents unified plugin
│   │       │   ├── registry.js            # Pure Map (register, getComponent)
│   │       │   ├── config.js              # Feature flags (call initConfig() first)
│   │       │   └── markdown-utils.js      # hasFrontmatter, stripFrontmatter, toCamelCase
│   │       ├── utils/
│   │       │   └── dom-transform.js       # transformDOM/injectDOM/observeDOM
│   │       ├── renderers/
│   │       │   └── preact.js              # preactRenderer, buildTransforms()
│   │       ├── serializers/               # Text serializers (not renderers)
│   │       │   ├── latex.js
│   │       │   ├── typst.js
│   │       │   ├── markdown.js
│   │       │   └── README.md
│   │       ├── components/
│   │       │   └── index.js               # defaultComponents map (zero side effects)
│   │       └── adapters/
│   │           ├── docsify/
│   │           │   ├── index.js           # Entry point for docs/index.html
│   │           │   ├── features/          # copy-button, htmx-virtual, latex-export, sidebar, tutorial-header
│   │           │   ├── dom-helpers/       # mermaid-dom, mermaid-capture
│   │           │   └── export/            # Pandoc WASM pipeline
│   │           │       ├── filters/       # Lua filters (latex, typst, llm)
│   │           │       ├── templates/     # LaTeX/Typst branded templates
│   │           │       ├── pandoc.js
│   │           │       ├── pipeline.js
│   │           │       └── wasm-loaders.js
│   │           └── astro/
│   │               ├── remark-components.js  # remark plugin for Astro
│   │               └── rehype-components.js  # rehype plugin for Astro
│   └── chat/                    # AI chat engine (separate package)
│       ├── package.json
│       └── src/
│           ├── core/chat-engine.js
│           ├── core/worker.js
│           ├── ui/chat-dom.js
│           └── adapters/docsify.js
├── docs/                        # Documentation content (served by Docsify)
│   ├── index.html               # Entry point — imports adapters/docsify/index.js
│   ├── _sidebar.md
│   └── content/
└── test/
```

## Component Registry

Components live in `packages/docsify-plugin/src/components/index.js` as the `defaultComponents` map. No `COMPONENT_REGISTRY` array exists — use `Object.keys(defaultComponents)` when you need the list.

To add a component:
1. Create `src/components/my-component.js` — export a Preact function
2. Add to `defaultComponents` map in `components/index.js`
3. The Docsify adapter auto-registers all defaultComponents on load

Current components: `entity-schema`, `api-endpoint`, `status-flow`, `directive-table`, `step-type`, `config-example`, `card-grid`, `side-by-side`

Note: `tabs`, `code-block`, `region-toggle` — used differently, not in defaultComponents.

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
| @preact/signals | Cross-fence reactive state |
| Prism.js + languages | Syntax highlighting |
| Mermaid 10.9 | Diagrams |
| js-yaml | YAML parsing for code fence components |
| unified + remark-parse | AST-based markdown transformation |
| unist-util-visit | AST tree traversal |

## Brand Colors

- Primary: `#0891b2` (change in `packages/docsify-plugin/src/styles/theme.css` `:root` + `docs/index.html` Tailwind `@theme`)

## Running

```bash
npm run serve  # → http://localhost:3009/docs/
```
