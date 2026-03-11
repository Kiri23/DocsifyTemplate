# DocsifyTemplate

## What This Is

Reusable zero-build-step interactive docs framework powered by Docsify with custom data-driven components. All components are agnostic: they receive generic YAML data via code fences and render HTML.

## The Core Idea

**Template literal functions ARE React components** — without JSX, without a bundler, without a build step.

**HTMX replaces React's re-rendering** — tabs switch content via virtual routes (`/api/switch/quick-start`), no page reload. A 30-line interceptor (`htmx-virtual.js`) catches fake HTTP requests and swaps DOM content from `window.__pageSections`.

**Docsify replaces everything else** — routing, sidebar, search, markdown rendering.

## Architecture

```
Docsify (routing, sidebar, search, markdown rendering)
  └── Plugin: component-renderer.js
        ├── beforeEach: detect YAML frontmatter, strip it
        ├── afterEach: process code fence components + split into Quick Start / Technical tabs
        └── doneEach: Prism.highlightAll() + mermaid.run() + htmx.process() + region directives

HTMX (tab switching only, ~30 lines)
  └── htmx-virtual.js
        ├── Intercepts /api/switch/* (no real HTTP)
        ├── Reads section HTML from window.__pageSections
        └── Swaps #tab-content innerHTML + re-highlights
```

### Code Fence Component Pipeline

1. Author writes ` ```component-name ` with YAML content in markdown
2. Docsify renders it as `<pre><code class="lang-component-name">YAML</code></pre>`
3. `component-renderer.js` finds registered components in the HTML
4. Parses YAML via `js-yaml`, calls `window.ComponentName(data)`
5. Component function returns HTML string, replaces the `<pre>` block

## Project Structure

```
DocsifyTemplate/
├── package.json
├── README.md
├── CLAUDE.md
└── docs/
    ├── index.html
    ├── .nojekyll
    ├── _sidebar.md
    ├── README.md
    ├── components/          # Data-driven template literal components
    │   ├── api-endpoint.js
    │   ├── card-grid.js
    │   ├── code-block.js
    │   ├── config-example.js
    │   ├── directive-table.js
    │   ├── entity-schema.js
    │   ├── region-toggle.js
    │   ├── status-flow.js
    │   ├── step-type.js
    │   └── tabs.js
    ├── plugins/
    │   ├── component-renderer.js
    │   └── htmx-virtual.js
    ├── styles/
    │   └── theme.css
    └── content/
```

## Component Registry

Components must be registered in two places:
1. `docs/index.html` — `<script>` tag to load the JS file
2. `docs/plugins/component-renderer.js` — add name to `COMPONENT_REGISTRY` array

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

## Brand Colors

- Primary: `#0891b2` (change in theme.css + index.html Tailwind theme)

## Running

```bash
npm run serve  # → http://localhost:3000
```
