# Export — API

## Pandoc WASM convert() Function

The core conversion API from `pandoc.js`:

```javascript
const { convert, query } = await import('./pandoc.js');

// Convert markdown to another format
const result = await convert(options, stdin, files);
// result = { stdout: string, stderr: string, warnings: array }

// Query pandoc capabilities
const version = await query({ query: "version" });
const formats = await query({ query: "output-formats" });
```

### convert(options, stdin, files)

| Parameter | Type | Description |
|-----------|------|-------------|
| `options` | Object | Pandoc options as JSON (mirrors default file format) |
| `stdin` | String or null | Input text (the markdown) |
| `files` | Object | `{ "filename": Blob }` — virtual files available to pandoc |

### Options Object

```javascript
{
  from: "markdown",           // Input format
  to: "latex",                // Output format
  standalone: true,           // Include document wrapper
  filters: ["filter.lua"],    // Array of Lua filter filenames
  template: "branded.tex",    // Template filename
  metadata: { title: "..." }, // Document metadata
}
```

### Files Object

Files are passed as Blobs with plain filenames (NO leading `/`):

```javascript
{
  "filter.lua": new Blob([luaCode], { type: "text/plain" }),
  "branded.tex": new Blob([templateCode], { type: "text/plain" })
}
```

## latex-export.js Plugin

### FORMAT_DEFS Array

Each export format is defined as:

```javascript
{
  value: 'latex-branded',          // Select option value
  label: 'LaTeX (Branded)',        // Display label
  to: 'latex',                     // Pandoc output format
  filter: 'filters/latex-components.lua',  // Path to fetch (or null)
  template: 'templates/branded.tex',       // Path to fetch (or null)
  ext: '.tex',                     // Download file extension
  mime: 'text/x-tex'              // MIME type for download
}
```

To add a new export format, add an entry to `FORMAT_DEFS`.

### Filter/Template Loading

Files are fetched from the docs directory and cached in memory:

```javascript
var filterCode = await fetchText('filters/my-filter.lua');
files['filter.lua'] = new Blob([filterCode], { type: 'text/plain' });
options.filters = ['filter.lua'];
```

## Lua Filter API

### CodeBlock Handler

Filters intercept code blocks by class name:

```lua
function CodeBlock(block)
  local cls = block.classes[1]  -- "card-grid", "api-endpoint", etc.
  local yaml = block.text       -- Raw YAML content
  -- Return transformed block:
  return pandoc.RawBlock("latex", "\\begin{...}...")  -- For LaTeX
  -- Or parse as markdown for re-processing:
  local doc = pandoc.read(markdown_string, "markdown")
  return doc.blocks
end

return {{CodeBlock = CodeBlock}}
```

### YAML Parser Functions

Both filters embed these parsing functions:

| Function | Purpose |
|----------|---------|
| `parse_yaml(text)` | Parse YAML string → Lua table |
| `trim(s)` | Strip whitespace |
| `unquote(s)` | Remove surrounding quotes |
| `parse_value(s)` | Convert string to typed value (bool, number, array, string) |

### LaTeX Helpers (latex-components.lua)

| Function | Purpose |
|----------|---------|
| `escape_latex(s)` | Escape `# $ % & _ { } < > ~ ^` for LaTeX text |
| `escape_verbatim(s)` | Only escape `$` (for verbatim/lstlisting blocks) |
| `raw(s)` | Shorthand for `pandoc.RawBlock("latex", s)` |

### Component Renderers

Each filter has a `renderers` table mapping component names to functions:

```lua
local component_map = {
  ["card-grid"]       = renderers.card_grid,
  ["entity-schema"]   = renderers.entity_schema,
  ["api-endpoint"]    = renderers.api_endpoint,
  ["status-flow"]     = renderers.status_flow,
  ["directive-table"] = renderers.directive_table,
  ["step-type"]       = renderers.step_type,
  ["config-example"]  = renderers.config_example,
  ["side-by-side"]    = renderers.side_by_side,
}
```

## LaTeX Template Variables

The `branded.tex` template uses Pandoc template syntax (`$if(var)$...$endif$`):

| Variable | Source | Used for |
|----------|--------|----------|
| `$title$` | `metadata.title` | Title page, header |
| `$subtitle$` | `metadata.subtitle` | Title page |
| `$author$` | `metadata.author` | Title page |
| `$date$` | `metadata.date` | Title page (defaults to `\today`) |
| `$toc$` | `metadata.toc` | Table of contents |
| `$body$` | Conversion output | Document content |

## LaTeX Custom Environments

Defined in `branded.tex`, used by `latex-components.lua`:

| Environment | Arguments | Component |
|-------------|-----------|-----------|
| `cardgrid` | — | card-grid |
| `entityschema` | `{Name extends Parent}` | entity-schema |
| `apiendpoint` | `{METHOD}{/path}` | api-endpoint |
| `statusflow` | — | status-flow |
| `steptype` | `{Name}{\asyncbadge}` | step-type |
| `sidebyside` | — | side-by-side |
| `mermaidplaceholder` | — | mermaid (placeholder) |
| `annotationlist` | — | config-example annotations |

Custom commands: `\card`, `\state`, `\annotation`, `\required`, `\typebadge`, `\asyncbadge`, `\syncbadge`, `\methodcolor`.
