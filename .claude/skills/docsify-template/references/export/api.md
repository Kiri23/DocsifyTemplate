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

Both filters have a `component_map` dispatching by code fence class name. The architecture differs:

**LaTeX filter** — renderers emit macro calls (data only), template defines rendering:
```lua
-- Filter emits:          Template defines:
-- \card{U}{Title}{Desc}  \newcommand{\card}[3]{ ...tcolorbox... }
-- \apiparam{n}{t}{req}   \newcommand{\apiparam}[3]{ ...tabular... }
```

**LLM filter** — `fmt.*` functions receive parsed data tables, return markdown:
```lua
-- Dispatcher parses YAML, then calls:
function fmt.card_grid(data)     -- data = [{title, description, icon}]
  -- returns "- **Title**: Description\n..."
end
function fmt.api_endpoint(data)  -- data = {method, path, params, response}
  -- returns "### POST `/path`\n..."
end
```

The `component_map` (CLOSED) routes to format functions (OPEN):
```lua
local component_map = {
  ["card-grid"]       = fmt.card_grid,
  ["entity-schema"]   = fmt.entity_schema,
  ["api-endpoint"]    = fmt.api_endpoint,
  ["status-flow"]     = fmt.status_flow,
  ["directive-table"] = fmt.directive_table,
  ["step-type"]       = fmt.step_type,
  ["config-example"]  = fmt.config_example,
  ["side-by-side"]    = fmt.side_by_side,
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

## Typst WASM API

For PDF export, after Pandoc generates Typst source, the Typst WASM compiler converts it to PDF:

```javascript
// Lazy-load (loaded once, from CDN)
// CDN: @myriaddreamin/typst-all-in-one.ts@0.7.0-rc2
// Exposes global: $typst

$typst.resetShadow();                                    // Clear virtual FS
$typst.mapShadow('/main.typ', typstBytesUint8Array);     // Map file
$typst.mapShadow('main.typ', typstBytesUint8Array);      // Also without /
const pdfData = await $typst.pdf({ mainFilePath: '/main.typ' });  // Compile
// pdfData = Uint8Array of PDF bytes
```

Key gotchas:
- Map files with BOTH `/main.typ` and `main.typ` paths
- `resetShadow()` before each compilation
- Returns `Uint8Array`, not `Blob` — wrap with `new Blob([pdfData], { type: 'application/pdf' })`
- Error messages are in format `[SourceDiagnostic { message: "..." }]` — extract with regex

## Typst Function Contract (Filter → Template)

The Typst filter emits function calls. The template (`branded.typ`) defines them with `#let`.

| Function | Args | Component |
|----------|------|-----------|
| `cardgridbegin()` | — | card-grid |
| `card` | `(icon, title, desc)` | card-grid |
| `cardgridend()` | — | card-grid |
| `entitybegin` | `(name, parent)` | entity-schema |
| `entityfield` | `(name, type, req, desc, values)` | entity-schema |
| `entityend()` | — | entity-schema |
| `apibegin` | `(method, path)` | api-endpoint |
| `apidesc` | `(text)` | api-endpoint |
| `apiparam` | `(name, type, req)` | api-endpoint |
| `apiresponse` | `(code)` | api-endpoint |
| `apiend()` | — | api-endpoint |
| `flowbegin()` | — | status-flow |
| `flowstate` | `(label, trigger, next, effects, islast)` | status-flow |
| `flowend()` | — | status-flow |
| `directivebegin` | `(title)` | directive-table |
| `directivecategory` | `(name)` | directive-table |
| `directive` | `(name, type, default, desc)` | directive-table |
| `directiveend()` | — | directive-table |
| `stepbegin` | `(name, category)` | step-type |
| `stepdesc` | `(text)` | step-type |
| `stepprop` | `(name, type, req, desc)` | step-type |
| `stepexample` | `(code)` | step-type |
| `stepend()` | — | step-type |
| `configbegin` | `(title, lang)` | config-example |
| `configcode` | `(code)` | config-example |
| `configannotation` | `(line, text)` | config-example |
| `configend()` | — | config-example |
| `sidebegin()` | — | side-by-side |
| `sidepanel` | `(title, content, lang)` | side-by-side |
| `sideend()` | — | side-by-side |

## LaTeX Macro Contract (Filter → Template)

The Lua filter emits these macros with pure data arguments. The template (`branded.tex`) defines what they render. To change appearance, edit only the `\newcommand` definitions in the template.

| Macro | Args | Emitted by | Component |
|-------|------|-----------|-----------|
| `\cardgridbegin` | — | card-grid | Container open |
| `\card` | `{icon}{title}{desc}` | card-grid | Single card |
| `\cardgridend` | — | card-grid | Container close |
| `\entitybegin` | `{name}{parent}` | entity-schema | Header |
| `\entityfield` | `{name}{type}{req}{desc}{values}` | entity-schema | Field row |
| `\entityend` | — | entity-schema | Close |
| `\apibegin` | `{method}{path}` | api-endpoint | Header with method badge |
| `\apidesc` | `{text}` | api-endpoint | Description |
| `\apiparam` | `{name}{type}{required}` | api-endpoint | Parameter |
| `\apiresponse` | `{code}` | api-endpoint | Response block |
| `\apiend` | — | api-endpoint | Close |
| `\flowbegin` | — | status-flow | Container open |
| `\flowstate` | `{label}{trigger}{next}{effects}{islast}` | status-flow | State node |
| `\flowend` | — | status-flow | Container close |
| `\directivebegin` | `{title}` | directive-table | Table header |
| `\directivecategory` | `{name}` | directive-table | Category row |
| `\directive` | `{name}{type}{default}{desc}` | directive-table | Directive row |
| `\directiveend` | — | directive-table | Table close |
| `\stepbegin` | `{name}{category}` | step-type | Header with badge |
| `\stepdesc` | `{text}` | step-type | Description |
| `\stepprop` | `{name}{type}{req}{desc}` | step-type | Property |
| `\stepexample` | `{code}` | step-type | Code example |
| `\stepend` | — | step-type | Close |
| `\configbegin` | `{title}{language}` | config-example | Header |
| `\configcode` | `{code}` | config-example | Code block |
| `\configannotation` | `{line}{text}` | config-example | Annotation |
| `\configend` | — | config-example | Close |
| `\sidebegin` | — | side-by-side | Container open |
| `\sidepanel` | `{title}{content}{language}` | side-by-side | Panel |
| `\sideend` | — | side-by-side | Container close |
| `\mermaidbegin` | — | mermaid | Placeholder open |
| `\mermaidend` | — | mermaid | Placeholder close |

Utility macros (defined in template, used by component macros):
`\required`, `\typebadge`, `\methodcolor`.

## LLM Format Functions Contract

Each `fmt.*` function in `llm-components.lua` receives a parsed Lua table and returns markdown. The data schemas match the YAML input:

| Function | Input data | Returns |
|----------|-----------|---------|
| `fmt.card_grid` | `[{title, description, icon}]` | Bullet list |
| `fmt.entity_schema` | `{name, parent, fields: [{name, type, required, description, values}]}` | Heading + table |
| `fmt.api_endpoint` | `{method, path, description, params: [{name, type, required}], response}` | Heading + params + code |
| `fmt.status_flow` | `{states: [{label, trigger, next, effects}]}` | Flow line + details |
| `fmt.directive_table` | `{title, categories: [{name, directives: [{name, type, default, description}]}]}` | Flat table |
| `fmt.step_type` | `{name, category, description, properties: [{name, type, required, description}], example}` | Heading + list + code |
| `fmt.config_example` | `{title, language, code, annotations: [{line, text}]}` | Code + annotations |
| `fmt.side_by_side` | `{left: {title, content, language}, right: {...}}` | Two labeled sections |
