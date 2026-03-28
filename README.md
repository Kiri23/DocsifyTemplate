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

## LaTeX Export (Pandoc WASM)

Every page includes an "Export to LaTeX" button that converts the current Markdown to LaTeX (or HTML, RST, Org) using Pandoc compiled to WebAssembly. The conversion runs entirely in the browser — no server needed.

The `pandoc.wasm` binary (~56MB) is stored via Git LFS. After cloning, ensure you have the actual binary:

```bash
# Install git-lfs if you don't have it
# macOS: brew install git-lfs
# Ubuntu: apt install git-lfs
# Termux: pkg install git-lfs

git lfs install
git lfs pull
```

If you cloned without LFS, or the file is missing, download it manually:

```bash
curl -L -o docs/pandoc.wasm \
  "https://pandoc.org/app/pandoc.wasm?sha1=f0b56b0bce5b0c504d66b4c6e45d9fdf67f41da1"
```

The WASM loads lazily — only when the user clicks "Export to LaTeX" — so it doesn't affect page load.

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
docs/
├── index.html              # Entry point: CDN deps + component scripts
├── _sidebar.md             # Navigation tree
├── README.md               # Home page
├── components/             # Data-driven template literal components
├── pandoc.wasm              # Pandoc WASM binary (Git LFS, ~56MB)
├── plugins/
│   ├── component-renderer.js  # Code fence → component pipeline + tabs
│   ├── htmx-virtual.js        # HTMX /api/switch/* interceptor
│   ├── latex-export.js        # "Export to LaTeX" button plugin
│   └── pandoc.js              # Official Pandoc WASI interface
├── styles/
│   └── theme.css           # Theme overrides
└── content/                # Your documentation pages
```
