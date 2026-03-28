# Plugins — API

## component-renderer.js

### beforeEach(content) → string

Receives raw markdown content. Detects YAML frontmatter between `---` markers. Strips it and stores parsed result in `window.__pageMetadata`.

Frontmatter parser is regex-based (NOT js-yaml):
- Handles `key: value` and `key: [a, b, c]`
- Does NOT handle nested objects
- Stores as flat key-value pairs

Returns: cleaned markdown without frontmatter.

### afterEach(html) → string

Receives Docsify-rendered HTML. Does two things:

**1. Component rendering:**
- Iterates `COMPONENT_REGISTRY` array
- For each name, finds `<code class="lang-{name}">` elements
- Extracts text content, parses as YAML via `jsyaml.load()`
- Converts kebab to PascalCase via `toCamelCase()`
- Calls `window[PascalCaseName](parsedYaml)`
- Replaces the entire `<pre>` parent with returned HTML

**2. Tab splitting (if frontmatter exists):**
- Looks for `<h2>` elements matching "Quick Start" and "Technical Reference"
- Splits HTML at those headings into sections
- Generates tab bar HTML via `window.Tabs()`
- Stores each section in `window.__pageSections = { "quick-start": html, "technical": html }`
- Returns: intro + tab bar + first section content in `#tab-content` div
- HTMX attributes on tab buttons: `hx-get="/api/switch/{section}" hx-target="#tab-content" hx-swap="innerHTML"`

Returns: processed HTML with components rendered and tabs set up.

### doneEach()

Runs after DOM is updated. No return value.

Post-render sequence:
1. `Prism.highlightAll()` — syntax highlighting for any new code blocks
2. `mermaid.run({ querySelector: '.mermaid' })` — render diagrams
3. `processRegionDirectives()` — handle `data-region` attributes (from region-toggle.js)
4. `htmx.process(document.body)` — activate HTMX attributes on new DOM
5. Scroll-reveal setup — wraps h2 sections in `.scroll-reveal`, attaches `IntersectionObserver`

### Helper: toCamelCase(str)

Converts kebab-case to PascalCase:
```
"entity-schema" → "EntitySchema"
"card-grid" → "CardGrid"
"api-endpoint" → "ApiEndpoint"
```

## htmx-virtual.js

~30 lines. Listens for `htmx:configRequest` event on `document.body`.

```javascript
document.body.addEventListener('htmx:configRequest', function(evt) {
  const path = evt.detail.path;
  if (path.startsWith('/api/switch/')) {
    evt.preventDefault();
    const section = path.replace('/api/switch/', '');
    const content = window.__pageSections[section];
    if (content) {
      document.getElementById('tab-content').innerHTML = content;
      // Re-run post-render hooks
      Prism.highlightAll();
      if (window.mermaid) mermaid.run({ querySelector: '.mermaid' });
      if (window.processRegionDirectives) processRegionDirectives();
    }
  }
});
```

Key details:
- Intercepts ALL `/api/switch/*` paths — no real HTTP request
- Reads section HTML from `window.__pageSections`
- Re-runs Prism, Mermaid, and region directives after swap
- Tab buttons are styled by the Tabs component (active state managed via HTMX classes)

## latex-export.js

Docsify plugin that adds an "Export to LaTeX" floating button to every page.

### Lifecycle:
1. On `doneEach`: creates floating button bar (`.latex-export-bar`)
2. On click: shows format selector (LaTeX, HTML, RST, Org)
3. On format select: lazy-loads `pandoc.wasm` (~56MB, one-time download)
4. Converts current page's raw markdown via Pandoc WASI
5. Opens result in a new window / downloads as file

### Pandoc WASI Interface (pandoc.js):
- `createPandocProcessor(wasmUrl)` — loads and initializes the WASM module
- `processor.convert(markdown, fromFormat, toFormat)` — runs conversion
- Supported output: latex, html, rst, org, docx (limited)

## Key Global Variables

| Variable | Type | Set by | Read by |
|----------|------|--------|---------|
| `window.__pageMetadata` | Object | beforeEach | User code, tab logic |
| `window.__pageSections` | Object | afterEach | htmx-virtual.js |
| `window.$docsify` | Object | index.html | Docsify core |
| `window.processRegionDirectives` | Function | region-toggle.js | doneEach, htmx-virtual |
| `window.Tabs` | Function | tabs.js | afterEach (tab generation) |
| `window.CodeBlock` | Function | code-block.js | Other components |

## See Also

- `references/components/configuration.md` — component registration that feeds into afterEach
- `references/plugins/gotchas.md` — hook ordering issues
