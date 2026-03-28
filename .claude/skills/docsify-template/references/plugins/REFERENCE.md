# Plugins — Reference

The rendering pipeline that transforms markdown into interactive documentation.

## Architecture

```
Docsify loads markdown
  ↓
component-renderer.js (3 hooks)
  ├── beforeEach: strip frontmatter → window.__pageMetadata
  ├── afterEach: YAML→component rendering + tab splitting → window.__pageSections
  └── doneEach: Prism + Mermaid + region directives + HTMX + scroll-reveal
  ↓
htmx-virtual.js (tab switching)
  └── Intercepts /api/switch/* → reads window.__pageSections → swaps DOM
  ↓
latex-export.js (export button)
  └── Adds button → lazy-loads pandoc.wasm → converts markdown
```

## Plugin Files

| File | Lines | Purpose |
|------|-------|---------|
| `component-renderer.js` | ~250 | Core pipeline: frontmatter, components, tabs, post-render |
| `htmx-virtual.js` | ~30 | Virtual route interceptor for tab switching |
| `latex-export.js` | ~130 | Export button + Pandoc WASM integration |
| `pandoc.js` | ~170 | Official Pandoc WASI JavaScript interface |

## Page Lifecycle

1. User navigates to `/#/content/some-page`
2. Docsify fetches `content/some-page.md`
3. **beforeEach**: strips frontmatter, stores in `__pageMetadata`
4. Docsify renders markdown → HTML
5. **afterEach**: processes component code fences, splits tabs, stores in `__pageSections`
6. DOM is updated
7. **doneEach**: re-highlights code, renders diagrams, activates HTMX, sets up animations

## Tab Switch Lifecycle

1. User clicks tab button (`hx-get="/api/switch/technical"`)
2. HTMX fires `htmx:configRequest` event
3. `htmx-virtual.js` intercepts, cancels real HTTP request
4. Reads HTML from `window.__pageSections["technical"]`
5. Swaps `#tab-content` innerHTML
6. Re-runs Prism, Mermaid, region directives

## Reading Order

1. This file (overview)
2. `api.md` — hook internals, htmx-virtual details, latex-export API
3. `configuration.md` — Docsify config, CDN deps, latex/pandoc setup
4. `patterns.md` — creating new plugins, extending hooks
5. `gotchas.md` — hook ordering, mermaid timing, plugin conflicts

## See Also

- `references/components/configuration.md` — how components integrate with the pipeline
- `references/authoring/configuration.md` — frontmatter and tab heading requirements
