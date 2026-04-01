# Framework Reference

Technical reference for DocsifyTemplate's project structure, plugin lifecycle, routing, configuration, and dependencies.

For component YAML APIs, see [Components Reference](/content/guide/components-reference).

## Project Structure

```
DocsifyTemplate/
├── package.json
├── CLAUDE.md
├── lib/                         # Framework library
│   ├── components/              # Data-driven template literal components
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
│   ├── plugins/
│   │   ├── component-renderer-engine.js  # Pure transformation functions
│   │   ├── component-renderer.js         # Docsify plugin wiring
│   │   ├── htmx-virtual.js              # Tab switching interceptor
│   │   ├── tutorial-header.js           # Tutorial frontmatter banner
│   │   └── latex-export.js              # Export UI
│   ├── styles/
│   │   └── theme.css                    # CSS custom properties (design tokens)
│   └── export/                          # Pandoc WASM export pipeline
│       ├── filters/                     # Lua filters (latex, typst, llm)
│       ├── templates/                   # LaTeX/Typst branded templates
│       ├── pandoc.js
│       ├── pipeline.js
│       ├── mermaid-capture.js
│       └── wasm-loaders.js
├── docs/                                # Documentation content
│   ├── index.html                       # Entry point (loads from ../lib/)
│   ├── _sidebar.md
│   ├── README.md
│   └── content/
│       ├── guide/                       # Tutorials, reference, explanation
│       ├── howto/                        # How-to guides
│       └── examples/                    # Showcases
└── test/                                # Test pages
```

## Component Registration

Every component requires registration in two places:

| Location | What to add |
|----------|-------------|
| `docs/index.html` | `<script src="../lib/components/{name}.js"></script>` before Docsify core |
| `lib/plugins/component-renderer-engine.js` | Component name string in `COMPONENT_REGISTRY` array |

### Registry Components

Components in `COMPONENT_REGISTRY` are available as YAML code fences in markdown. The engine scans rendered HTML for `<code class="lang-{name}">`, parses the YAML content, and calls `window.ComponentName(data)`.

Current registry:

| Component | Global function | Code fence name |
|-----------|----------------|-----------------|
| Entity Schema | `window.EntitySchema()` | `entity-schema` |
| API Endpoint | `window.ApiEndpoint()` | `api-endpoint` |
| Status Flow | `window.StatusFlow()` | `status-flow` |
| Directive Table | `window.DirectiveTable()` | `directive-table` |
| Step Type | `window.StepType()` | `step-type` |
| Config Example | `window.ConfigExample()` | `config-example` |
| Card Grid | `window.CardGrid()` | `card-grid` |
| Side by Side | `window.SideBySide()` | `side-by-side` |

### Utility Components

These are not in the registry and cannot be used as YAML code fences. They are called programmatically by the framework or via HTML directives.

| Component | Global function | Used by |
|-----------|----------------|---------|
| Tabs | `window.Tabs()` | `component-renderer-engine.js` (tab splitting) |
| Code Block | `window.CodeBlock()` | Other components (syntax-highlighted snippets) |
| Region Toggle | `window.RegionToggle()` | `data-region` HTML directives |

## Plugin Lifecycle

`component-renderer.js` registers three Docsify hooks that run in order on every page navigation.

### beforeEach(markdown)

Receives the raw markdown string before Docsify renders it.

| Action | Detail |
|--------|--------|
| Detect frontmatter | Checks for `---` delimiters at the top of the file |
| Parse frontmatter | Extracts key-value pairs into an object |
| Store metadata | Sets `window.__pageMetadata` |
| Strip frontmatter | Returns markdown without the `---` block |

### afterEach(html, next)

Receives the rendered HTML string after Docsify converts markdown to HTML.

**Code fence component rendering:**

1. Regex scans for `<code class="lang-{registered-name}">`
2. Extracts text content from each match
3. Parses YAML with `jsyaml.load()`
4. Calls `window.ComponentName(data)`
5. Replaces the `<pre>` block with the returned HTML string

**Tab splitting** (requires frontmatter with `type: guide` AND a `## Technical Reference` heading):

1. Splits HTML at the `<h2>` containing "Technical Reference"
2. Stores both sections in `window.__pageSections`
3. Wraps content in `window.Tabs()` UI
4. Shows Quick Start tab by default

If frontmatter exists but the heading is missing, all content stays in a single view.

### doneEach()

Runs after the DOM is updated. No arguments.

| Action | Detail |
|--------|--------|
| `Prism.highlightAll()` | Syntax highlighting for code blocks |
| Mermaid processing | Converts mermaid code fences to `<div class="mermaid">` and runs `mermaid.run()` |
| `processRegionDirectives()` | Processes `data-region` directives (if function exists) |
| `htmx.process()` | Initializes HTMX on new DOM content |

## HTMX Virtual Routing

`htmx-virtual.js` (~30 lines) intercepts HTMX requests to swap tab content without HTTP calls.

### Request Flow

1. User clicks a tab button (e.g., `hx-get="/api/switch/technical"`)
2. HTMX fires the `htmx:configRequest` event before making the HTTP request
3. The interceptor checks if the URL matches `/api/switch/*`
4. Extracts the view type from the URL (e.g., `technical`)
5. Reads pre-stored HTML from `window.__pageSections[viewType]`
6. Sets the target element's `innerHTML` directly
7. Re-runs post-render hooks (Prism, mermaid, region directives)
8. Cancels the HTMX request — no HTTP call is made

### Route Pattern

All virtual routes follow the pattern `/api/switch/{section-name}`. These are not real HTTP endpoints.

| Route | Section |
|-------|---------|
| `/api/switch/quick-start` | Quick Start tab content |
| `/api/switch/technical` | Technical Reference tab content |

## Global Variables

| Variable | Set by | Used by | Type | Purpose |
|----------|--------|---------|------|---------|
| `window.__pageMetadata` | `beforeEach` | Tab splitting, `tutorial-header.js` | `Object \| null` | Parsed frontmatter key-value pairs |
| `window.__pageSections` | `afterEach` | `htmx-virtual.js` | `Object \| null` | Stored HTML for each tab section |
| `window.__rawMarkdown` | `beforeEach` | `afterEach` (tab splitting) | `string` | Raw markdown before frontmatter stripping |
| `window.__CREngine` | `component-renderer-engine.js` | `component-renderer.js` | `Object` | Engine API (pure transformation functions) |
| `window.$docsify` | `index.html` | Docsify core | `Object` | Docsify configuration |

## Frontmatter

### Format

```yaml
---
key: value
list: [a, b, c]
---
```

### Parser Limitations

The frontmatter parser uses a simple regex, not `js-yaml`. It handles:

| Syntax | Supported |
|--------|-----------|
| `key: value` | Yes |
| `key: [a, b, c]` | Yes |
| Nested objects | No |
| Multi-line values | No |
| YAML anchors/aliases | No |

### Recognized Keys

| Key | Type | Used by | Purpose |
|-----|------|---------|---------|
| `type` | `string` | `afterEach` | Page type — `guide` triggers tab splitting |
| `category` | `string` | — | Content categorization |
| `tags` | `array` | — | Content tagging |
| `time` | `string` | `tutorial-header.js` | Estimated reading/completion time |
| `difficulty` | `string` | `tutorial-header.js` | Difficulty level |
| `outcome` | `string` | `tutorial-header.js` | What the reader will achieve |

## CDN Dependencies

| Dependency | Version | CDN URL | Purpose |
|------------|---------|---------|---------|
| Docsify | 4.x | `cdn.jsdelivr.net/npm/docsify@4` | Routing, sidebar, search, markdown rendering |
| Docsify Search | 4.x | `cdn.jsdelivr.net/npm/docsify@4/lib/plugins/search.min.js` | Full-text search |
| HTMX | 2.0.3 | `cdn.jsdelivr.net/npm/htmx.org@2.0.3/dist/htmx.min.js` | Tab content swapping |
| Tailwind CSS | 4.x (browser) | `cdn.jsdelivr.net/npm/@tailwindcss/browser@4` | Component styling |
| Prism.js | 1.x | `cdn.jsdelivr.net/npm/prismjs@1` | Syntax highlighting |
| Mermaid | 10.9 | `cdn.jsdelivr.net/npm/mermaid@10.9/dist/mermaid.min.js` | Diagrams |
| js-yaml | 4.x | `cdn.jsdelivr.net/npm/js-yaml@4/dist/js-yaml.min.js` | YAML parsing for code fence components |

### Prism Languages Loaded

`javascript`, `json`, `yaml`, `bash`, `csharp`, `markdown`

To add more, see [How to add a Prism language](/content/howto/add-prism-language).

## Brand Colors

Primary brand color is defined in two locations that must stay in sync:

| Location | Variable | Default |
|----------|----------|---------|
| `lib/styles/theme.css` | `:root` CSS custom properties | `#0891b2` |
| `docs/index.html` | `@theme { --color-primary }` in Tailwind config | `#0891b2` |

To change brand colors, see [How to change brand colors](/content/howto/change-brand-colors).
