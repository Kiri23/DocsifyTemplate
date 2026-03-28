# Components — Configuration

How components are discovered, registered, and loaded.

## Registration (Two Places)

### 1. Script tag in `docs/index.html`

Add before the component-renderer plugin script:

```html
<script src="components/my-component.js"></script>
```

Order matters: component scripts must load BEFORE `plugins/component-renderer.js`.

### 2. Registry array in `docs/plugins/component-renderer.js`

```javascript
const COMPONENT_REGISTRY = [
  'entity-schema', 'api-endpoint', 'status-flow', 'directive-table',
  'step-type', 'config-example', 'card-grid', 'side-by-side',
  'my-component'  // ← add here
];
```

### Name Conversion

The registry uses kebab-case. The renderer converts to PascalCase to find the global function:

```
my-component → MyComponent → window.MyComponent(data)
card-grid → CardGrid → window.CardGrid(data)
```

This conversion is done by `toCamelCase()` in component-renderer.js.

## Component File Convention

Location: `docs/components/<name>.js`

```javascript
window.MyComponent = function(data) {
  // data = parsed YAML object
  return `
    <div class="rounded-xl overflow-hidden border border-gray-700/60 bg-gray-900 my-5 shadow-md">
      ${/* HTML using data */}
    </div>
  `;
};
```

Rules:
- **Pure function** — no side effects, no DOM queries, no external state
- **Returns HTML string** — template literals with embedded expressions
- **Uses Tailwind + CSS variables** — no inline styles with hardcoded values
- **Global on window** — `window.PascalCaseName = function(data)`
- **Unique IDs via Math.random()** — for collapsible/interactive elements

## Component Renderer Pipeline

The `component-renderer.js` plugin has three hooks:

### beforeEach(content)
- Detects and strips YAML frontmatter
- Stores metadata in `window.__pageMetadata`
- Returns cleaned markdown

### afterEach(html)
- Scans for `<code class="lang-{componentName}">`
- For each match: parses YAML → calls component function → replaces `<pre>` block
- If frontmatter exists: splits page at `## Quick Start` / `## Technical Reference`
- Stores sections in `window.__pageSections`
- Returns final HTML

### doneEach()
- `Prism.highlightAll()` — re-highlight code blocks
- `mermaid.run()` — render mermaid diagrams
- `processRegionDirectives()` — handle `data-region` attributes
- `htmx.process()` — activate HTMX attributes
- Scroll-reveal animation setup

## Load Order in index.html

```
1. CDN dependencies (Docsify, HTMX, Tailwind, Prism, Mermaid, js-yaml)
2. Component scripts (card-grid.js, entity-schema.js, etc.)
3. Utility scripts (code-block.js, tabs.js, region-toggle.js)
4. Plugin scripts (component-renderer.js, htmx-virtual.js, latex-export.js)
5. Docsify initialization (window.$docsify config + docsify.min.js)
```

## See Also

- `references/plugins/api.md` — deep dive into component-renderer.js hooks
- `references/components/api.md` — YAML schemas for all components
