# Export — Gotchas

## API Gotchas

### "Unknown option lua-filter"

**Wrong:** `options['lua-filter'] = ['/filter.lua']`
**Right:** `options.filters = ['filter.lua']`

The Pandoc WASM JSON API uses `filters`, not `lua-filter`. This differs from the CLI flag `--lua-filter`.

### "Could not find data file templates/..."

**Wrong:** `files['/template.tex']` with `options.template = '/template.tex'`
**Right:** `files['branded.tex']` with `options.template = 'branded.tex'`

File keys must be plain filenames without leading `/`. The Pandoc WASM virtual filesystem maps keys directly.

### Empty output (0 bytes)

Check `result.stderr` — it contains the error message. Common causes:
- Wrong option names (see above)
- Filter has Lua syntax error
- Template has Pandoc template syntax error

## Lua Filter Gotchas

### No YAML parser in Pandoc Lua

Pandoc's Lua environment does NOT include a YAML library. The parser lives in `yaml-parser.lua` and is concatenated with each filter at runtime by `latex-export.js`. `dofile()` and `require()` do not work in WASM (no filesystem access at the Lua level), which is why we concatenate in JS instead.

Filter files start with `-- REQUIRES: yaml-parser.lua` and assume `trim()`, `parse_yaml()`, `parse_value()` are available as globals.

### `$` breaks Pandoc template engine

Dollar signs in templates AND in `RawBlock("latex", ...)` content are interpreted as Pandoc template variables, NOT passed through as literal text.

**In templates:** Use `$$` to produce a literal `$`. Example: `$$\rightarrow$$` not `$\rightarrow$`.

**In filter output:** Use `escape_verbatim()` which replaces `$` with `\$` for content inside verbatim blocks (response/example code).

### `{}` in code blocks

Curly braces inside `lstlisting` can confuse LaTeX if the environment isn't properly set up. Use `\begin{verbatim}...\end{verbatim}` for raw code content instead of `lstlisting` when the content contains arbitrary JSON/code with braces.

### Filter return format

Must return a list of lists:
```lua
return {{CodeBlock = CodeBlock}}  -- Double braces!
```
Single braces = filter won't be applied (silent failure).

### Component not transforming

If a YAML code fence passes through as a raw code block:
1. Check `component_map` has the exact kebab-case name: `["card-grid"]`
2. Check `block.classes[1]` matches — Pandoc stores the fence language as the first class
3. Check YAML parsing doesn't fail silently — add print() for debugging

## WASM Gotchas

### CORS with remote WASM

`pandoc.wasm` MUST be served from the same origin as the page. Fetching from `pandoc.org` will fail with CORS error. The file must be local (or proxied).

### 56MB payload

The WASM binary is large. Mitigations:
- Lazy loading (only on first Export click)
- `cache: "force-cache"` on the fetch
- Git LFS for the repo (don't commit 56MB as a regular file)
- After first load, browser caches it

### Git LFS required

The `pandoc.wasm` file is tracked via Git LFS. After cloning:
```bash
git lfs install
git lfs pull
```
Without this, the file will be a tiny LFS pointer, not the actual binary.

## LaTeX Template Gotchas

### etoolbox required for \ifstrequal

The `\methodcolor` command uses `\ifstrequal` from the `etoolbox` package. Ensure `\usepackage{etoolbox}` is in the template.

### tcolorbox environments can't nest in certain ways

`tcolorbox` environments don't support nesting by default. If a component generates a tcolorbox inside another tcolorbox, add `breakable` and ensure the inner box uses compatible options.

### Compiling the .tex file

The generated `.tex` requires `pdflatex` with these packages: `tcolorbox`, `fancyhdr`, `booktabs`, `tabularx`, `longtable`, `listings`, `tikz`, `xcolor`, `etoolbox`, `geometry`, `hyperref`. All are available on Overleaf (free, online). `pdflatex` does NOT run in Termux.

Pandoc.org/app uses Typst for PDF, not pdflatex — so the branded template won't compile there.

## Debugging

### test-export.html

A standalone debug page at `docs/test-export.html` that runs conversion tests and shows results inline. Load it at `http://localhost:3000/test-export.html` to test filter/template changes without navigating through Docsify.

### Chrome DevTools

Export errors appear in the browser console. The plugin logs `pandoc stderr` and `pandoc warnings` to console.warn.
