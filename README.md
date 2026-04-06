# DocsifyTemplate
A zero-build-step interactive documentation framework powered by Docsify with custom data-driven components.

## Quick Start

```bash
git clone <this-repo> my-docs
cd my-docs
npm run serve
# → http://localhost:3000
```

## Customizing

### Site Name

Edit `docs/index.html`:
- `<title>` tag
- `window.$docsify.name`

### Colors

Edit `docs/styles/theme.css` — replace `#0891b2` with your brand color. Also update the Tailwind theme in `docs/index.html`:

```html
<style type="text/tailwindcss">
  @theme {
    --color-primary: #your-color;
    --color-brand: #your-secondary;
  }
</style>
```

### Adding Content

1. Create a `.md` file in `docs/content/`
2. Add it to `docs/_sidebar.md`
3. Write markdown — optionally use code fence components

### Adding Tabs to a Page

Add YAML frontmatter + `## Quick Start` / `## Technical Reference` headings:

```markdown
---
type: guide
category: api
tags: [rest, users]
---

# My Page

## Quick Start
Friendly, analogy-driven content.

## Technical Reference
Schema definitions, API details.
```

### Using Components

Use any registered component name as a code fence language:

````markdown
```card-grid
- title: "My Card"
  description: "A description"
  icon: "🎯"
  href: "#/some-page"
```
````

### Registering New Components

1. Create `docs/components/my-component.js` — export `window.MyComponent = function(data) { return '<html>...'; }`
2. Add `<script src="components/my-component.js"></script>` to `docs/index.html`
3. Add `'my-component'` to `COMPONENT_REGISTRY` in `docs/plugins/component-renderer.js`

## Available Components

| Component | Code Fence | Description |
|---|---|---|
| CardGrid | `card-grid` | Responsive linked card grid |
| EntitySchema | `entity-schema` | Expandable entity field cards |
| ApiEndpoint | `api-endpoint` | REST endpoint with method badge |
| StatusFlow | `status-flow` | Clickable state machine visualization |
| DirectiveTable | `directive-table` | Searchable categorized reference table |
| StepType | `step-type` | Workflow step card with sync/async badge |
| ConfigExample | `config-example` | Annotated code with numbered callouts |

Additional components (used differently, not in registry):
- **Tabs** — auto-generated from frontmatter (Quick Start / Technical)
- **CodeBlock** — inline syntax highlight + copy button
- **RegionToggle** — DOM-level `data-region` directive processor

## Export (Pandoc WASM)

Each page has an Export button that converts your docs to PDF, LaTeX, HTML, RST, or Org — right in the browser, no server required. This runs on Pandoc compiled to WebAssembly.

The binary (~56 MB) is not included in the repo. To enable export, download it after cloning:

```bash
curl -L -o lib/export/pandoc-wasm.zip \
  "https://github.com/jgm/pandoc/releases/download/3.9/pandoc-3.9.wasm.zip"
unzip lib/export/pandoc-wasm.zip -d lib/export/
rm lib/export/pandoc-wasm.zip
```

The binary loads lazily — only when you click Export — so it does not affect page load. If you skip the download, the Export button appears but returns an error when clicked.

## CDN Dependencies

| Dep | Purpose |
|---|---|
| Docsify 4 | Routing, sidebar, search, markdown |
| HTMX 2.0.3 | Tab content swapping |
| Tailwind CSS v4 (browser) | Component styling |
| Prism.js + languages | Syntax highlighting |
| Mermaid 10.9 | Diagrams |
| js-yaml | YAML parsing for code fence components |

## Project Structure

```
├── lib/                        # Framework library
│   ├── components/             # Data-driven template literal components
│   ├── plugins/                # Docsify plugins
│   │   ├── component-renderer.js  # Code fence → component pipeline + tabs
│   │   ├── htmx-virtual.js        # HTMX /api/switch/* interceptor
│   │   └── latex-export.js        # Export button plugin
│   ├── styles/
│   │   └── theme.css           # Theme overrides
│   └── export/                 # Pandoc WASM export pipeline
│       ├── pandoc.js           # Official Pandoc WASI interface
│       └── pandoc.wasm         # Binary (~56 MB, not in repo — see above)
└── docs/                       # Documentation content (served by Docsify)
    ├── index.html              # Entry point: CDN deps + component scripts
    ├── _sidebar.md             # Navigation tree
    ├── README.md               # Home page
    └── content/                # Your documentation pages
```
