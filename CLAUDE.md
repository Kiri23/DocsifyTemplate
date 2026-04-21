# DocsifyTemplate

## Session Start

**At the start of every new session, run `/docsify-template:session-start` before doing any work.** This loads the vision, Engineering DNA, DAG pattern from MemoryGraph, open issues, and current branch — then asks what to work on.

## Rules

**Don't add SW/WASM unless JS can't solve it.** Service Workers and WebAssembly are justified only when plain JS hits a real capability or performance wall (e.g., Pandoc WASM exists because JS cannot convert markdown to LaTeX). Until then, it's recreational engineering — fun, but not necessary.

**The engine is closed for modification, open for extension.** When a new capability is needed, the answer is always a plugin/writer — never a change to core. Ask: "what writes to the store, and what reads from it?" before touching any file in `core/`.

- **Writers** (plugins) compute knowledge and write to the signal store: backlinks, drift detection, ML embeddings, AI inference, graph algorithms. Each is an independent package (`@docs-engine/backlinks`, `@docs-engine/chat`, etc.).
- **Components** (views) read from the signal store reactively. They never know who wrote the data or how.
- **Signals** are the contract between writers and views — the only shared surface.
- **Core** (`core/`, `components/`, `serializers/`) never grows for a new feature. A new feature = a new plugin that hooks into the store.

This is the same pattern as unified (plugins), webpack (loaders), and Docsify (plugins). The engine stays small and stable; the ecosystem grows around it.

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

## The Mental Model — Markdown / YAML / Post-processing / Custom Elements

**Markdown is the language.** The author writes markdown. Docsify, Astro, any renderer can process it.

**YAML is the transport.** It lives inside code fences — structured data, nothing more. The fence language name (`entity-schema`, `api-endpoint`) is the component selector. Nobody writes the blob by hand — the engine generates it.

**Post-processing is the layer that transforms data into output.** The `yamlComponents` unified plugin reads the AST, extracts YAML from matching fences, and calls `renderCustomElement()` to produce valid HTML.

**Custom Elements are the renderer-agnostic bridge.** `defineCustomElements()` registers each component tag with the browser once. From that point, whenever `<entity-schema data-props="...">` lands in the DOM — from Docsify, Astro, or plain HTML — the browser fires `connectedCallback` and `preact-custom-element` mounts the Preact component automatically.

```
Markdown (author writes this)
  ↓ unified/remark-parse → AST
  ↓ yamlComponents plugin visits 'code' nodes
  ↓ YAML (transport) parsed → JS object
  ↓ renderCustomElement(tag, data) → <entity-schema data-props="...">
  ↓ Docsify / Astro / any renderer outputs the HTML string to DOM
  ↓ browser connectedCallback (preact-custom-element)
  ↓ withJsonProps: data-props string → parsed object
  ↓ Preact renders the component
  DOM (live UI — no framework lifecycle needed)
```

**Components are pure Preact functions — they never know about the renderer:**
```js
function EntitySchema({ data }) {   // ← only knows about data
  return html`<div>${data.name}</div>`
}
// No knowledge of Custom Elements, Docsify, or mounting strategy
```

Same YAML, different post-processing output:
- `renderCustomElement()` → `<entity-schema data-props="...">` → browser mounts
- `latexRenderers` → `\commands` → Pandoc WASM → PDF
- `typstRenderers` → `#functions` → Typst WASM → PDF
- `markdownRenderers` → markdown text → LLM / Docsify

## IMPORTANT: Design System Rules

Before modifying ANY component or style, you MUST read `.interface-design/system.md` first. This file is the single source of truth for colors, spacing, typography, and patterns.

**ALWAYS use CSS custom properties from `:root` in `theme.css`** when writing or changing styles. NEVER hardcode hex, rgb, or rgba values outside of `:root`. For alpha variants use the `rgb(var(--*-rgb) / alpha)` pattern — NOT raw `rgba()`.

Check `:root` in `packages/docs-engine/src/styles/theme.css` for available variables. If you need a color that doesn't exist, add it as a variable to `:root` first.

The goal is: duplicate this project, change only `:root`, get a different brand.

## Architecture

```
Docsify (routing, sidebar, search, markdown rendering)
  └── adapters/docsify/index.js  ← all Docsify-specific wiring
        ├── hook.beforeEach: strip frontmatter, AST-transform markdown (yamlComponents)
        ├── hook.afterEach: split Quick Start / Technical tabs
        └── hook.doneEach: transformDOM + injectDOM + observeDOM lifecycle

DAG layers (each depends only on layers below):
  components/  ← pure Preact functions, zero external deps, zero renderer knowledge
  core/        ← pure functions (markdown-transform, registry, config, markdown-utils)
  serializers/ ← text output (latex, typst, markdown — need external tool to render)
  utils/       ← browser utils (dom-transform)
  custom-elements.js ← bridges components ↔ browser (preact-custom-element + withJsonProps)
  adapters/    ← framework wiring (docsify/, astro/) — only layer that knows Docsify/Astro

packages/chat/
  core/chat-engine.js  ← LLM inference (WebGPU, zero server)
  core/worker.js       ← WebGPU worker thread
  ui/chat-dom.js       ← DOM binding
  adapters/docsify.js  ← Docsify plugin
```

### Custom Elements — the renderer-agnostic bridge

`core/custom-elements.js` — two exports:
- `defineCustomElements(components)` — uses `preact-custom-element`'s `register()` to register each tag with the browser. Called once at adapter load. No framework lifecycle needed.
- `renderCustomElement(tag, data)` — returns `<entity-schema data-props="...">` string. Called by `yamlComponents` plugin during markdown processing.

`withJsonProps` (internal) — bridges the HTML string attribute → Preact object prop:
```js
// HTML attribute is always a string:   data-props='{"name":"User"}'
// Component expects an object:         function EntitySchema({ data }) { data.name }
// withJsonProps parses in between — components never see the string
```

**Replacing the renderer:** to swap Preact for React, write your own `defineCustomElements` using `ReactDOM.createRoot`. Components never change — they're pure functions.

| | `custom-elements.js` | `serializers/*` |
|---|---|---|
| Output | Live DOM (browser mounts) | Plain text string |
| Needs external tool? | No — browser handles it | Yes — LaTeX engine / Typst / Docsify |
| Framework coupling | None | None |

### Export Pipeline (WASM)

```
markdown → Pandoc WASM + Lua filters → LaTeX/Typst → PDF
```

Future target (planned): pre-process YAML fences via JS serializers → clean text → Pandoc (no Lua filters needed).

## Project Structure

```
DocsifyTemplate/
├── packages/
│   ├── docs-engine/             # Distributable npm package (docs-engine)
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.js         # Public API — pure re-exports, no DOM, no Docsify
│   │       ├── core/            # Pure functions, no DOM
│   │       │   ├── markdown-transform.js  # yamlComponents unified plugin
│   │       │   ├── custom-elements.js     # defineCustomElements, renderCustomElement
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
│   │               ├── remark-components.js
│   │               └── rehype-components.js
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

Components live in `packages/docs-engine/src/components/index.js` as the `defaultComponents` map. No `COMPONENT_REGISTRY` array exists — use `Object.keys(defaultComponents)` when you need the list.

To add a component:
1. Create `src/components/my-component.js` — export a Preact function
2. Add to `defaultComponents` map in `components/index.js`
3. The Docsify adapter auto-registers all defaultComponents on load via `defineCustomElements`

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
| preact-custom-element | register() — bridges Preact components ↔ Custom Elements spec |

## Brand Colors

- Primary: `#0891b2` (change in `packages/docs-engine/src/styles/theme.css` `:root` + `docs/index.html` Tailwind `@theme`)

## Running

```bash
npm run serve  # → http://localhost:3010/docs/
```
