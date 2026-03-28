# Plugins — Configuration

## Docsify Configuration

In `docs/index.html`, `window.$docsify` object:

```javascript
window.$docsify = {
  name: 'Site Name',
  loadSidebar: true,      // Uses _sidebar.md
  subMaxLevel: 3,         // TOC depth in sidebar
  search: 'auto',         // Full-text search plugin
  auto2top: true,         // Scroll to top on page change
  // ... plugins array
};
```

Docsify plugins are added to the `plugins` array. component-renderer.js registers itself here with its three hooks.

## CDN Dependencies

Loaded in `docs/index.html` `<head>`:

| Dependency | Purpose | Required |
|-----------|---------|----------|
| Docsify 4.x | Core framework | Yes |
| docsify-search | Full-text search | Yes |
| HTMX 2.0.3 | Tab switching | Yes (for tabs) |
| Tailwind CSS v4 (browser) | Utility classes | Yes |
| Prism.js + languages | Syntax highlighting | Yes |
| Mermaid 10.9 | Diagrams | Yes (for diagrams) |
| js-yaml 4.x | YAML parsing | Yes (for components) |

### Tailwind Browser Config

In `index.html`, a `<style type="text/tailwindcss">` block configures the `@theme`:

```html
<style type="text/tailwindcss">
  @theme {
    --color-primary: #0891b2;
    --color-brand: #your-secondary;
  }
</style>
```

This must match `:root` colors in `theme.css` when rebranding.

## LaTeX Export Setup

### pandoc.wasm

- Location: `docs/pandoc.wasm` (~56MB)
- Stored via Git LFS (`.gitattributes` tracks it)
- Loads lazily on first "Export to LaTeX" click
- Download if missing: `curl -L -o docs/pandoc.wasm "https://pandoc.org/app/pandoc.wasm?sha1=f0b56b0bce5b0c504d66b4c6e45d9fdf67f41da1"`

### Plugin files

- `docs/plugins/latex-export.js` — button UI + format selector + triggers conversion
- `docs/plugins/pandoc.js` — JavaScript WASI wrapper for the WASM binary

### Disabling LaTeX export

Remove from `index.html`:
1. `<script src="plugins/pandoc.js"></script>`
2. `<script src="plugins/latex-export.js"></script>`
3. Optionally delete `docs/pandoc.wasm` and its `.gitattributes` entry

## Plugin Load Order

In `index.html`, scripts must load in this order:

```
1. CDN deps (Docsify core, HTMX, Tailwind, Prism, Mermaid, js-yaml)
2. Component JS files (card-grid.js, entity-schema.js, etc.)
3. Utility JS files (code-block.js, tabs.js, region-toggle.js)
4. Plugin JS files (component-renderer.js, htmx-virtual.js)
5. Optional plugins (latex-export.js, pandoc.js)
6. Docsify init (<script src="//cdn.../docsify.min.js"></script>)
```

component-renderer.js MUST load after all component scripts (it references them).
htmx-virtual.js MUST load after HTMX CDN.
Docsify init MUST be last (it reads `window.$docsify` and starts the app).

## Running the Server

```bash
npm run serve  # → http://localhost:3009
```

Uses `docsify-cli serve` — serves `docs/` directory with live reload.

## See Also

- `references/styling/api.md` — CSS custom properties that components and plugins reference
- `references/plugins/api.md` — detailed hook documentation
