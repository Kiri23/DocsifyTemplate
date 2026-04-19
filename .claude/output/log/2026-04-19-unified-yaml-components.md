# Session Log — 2026-04-19
**Branch:** `explore/unified-yaml-components`
**PR:** #20

---

## What we did

### 1. Moved `lib/` → `packages/docsify-plugin/src/`
Single source of truth. `docs/index.html` now loads one `<script type="module">` entry point instead of 8+ script tags.

### 2. Created `packages/docsify-plugin/` as distributable npm package
- `package.json` with exports map: `.`, `./renderers/preact`, `./components`
- Package name: `docsify-yaml-components` (honest about what it does)

### 3. Explicit public API — `createPlugin({ renderer, components })`
Renderer and components are now explicit, not hidden. Auto-calls itself with defaults on load so Docsify consumers get zero-config behavior.

### 4. Split `registry.js` — pure Map vs Preact bridge
- `core/registry.js` — pure Map, zero framework dependency
- `renderers/preact.js` — Preact-specific: `createPlaceholder`, `mountAll`, `renderToString`, `buildTransforms()`

### 5. `components/index.js` — zero side effects
Exports `defaultComponents` map. No longer calls `registerAll` on import. Registration is caller's responsibility.

### 6. Refactored `markdown-transform.js` — proper unified plugin
`yamlComponents` is now a real unified plugin `(options) => (tree) => void` that operates on the AST, not string offsets.

### 7. Created `core/yaml-components.js` — public composable API
Re-exports `yamlComponents` + four ready-made transform maps:
- `preactTransforms` — lazy Proxy over Preact registry (browser HTML)
- `latexTransforms` — `\commands` for LaTeX
- `typstTransforms` — `#functions` for Typst
- `markdownTransforms` — readable markdown for LLM export

### 8. Cleanup agent pass
- No dead code found in the new structure
- Fixed stale `lib/` path references in comments and docs content

---

## Key insight discovered

The export pipeline (`pipeline.js`) uses **Pandoc WASM + Lua filters** — completely separate from the `yamlComponents` unified plugin. The `latexTransforms`/`typstTransforms`/`markdownTransforms` JS renderers exist for a future JS-only path but are not wired into the current export UI.

`createExportRenderer` was dead code on this branch (already removed or never landed).

---

## Architecture understanding — YAML → AST → output

```
YAML in markdown code fence
    ↓ remark-parse → MDAST
    ↓ yamlComponents visits 'code' nodes
    ↓ parseYaml(node.value) → JS object
    ↓ transforms[lang](data) → string
    ↓ replaces node with { type: 'html', value: string }
Output string (Docsify renders to DOM)
```

The `transforms` map decides the output format. Same YAML, four outputs. That is the whole design.

---

## Exploration: other unified input formats

Question raised: besides Markdown, what other hierarchical structures can unified process where YAML could be embedded?

Answer: any format with a unified parser. Rehype (HTML) is the most relevant:
```html
<script type="application/yaml" data-component="entity-schema">
name: User
fields:
  - name: id
</script>
```
The `yamlComponents` plugin logic is the same — only the visited node type changes (`'element'` instead of `'code'`).

---

## Files changed
- `packages/docsify-plugin/src/index.js` — entry point + `createPlugin` API
- `packages/docsify-plugin/src/core/registry.js` — pure Map
- `packages/docsify-plugin/src/core/markdown-transform.js` — `yamlComponents` unified plugin
- `packages/docsify-plugin/src/core/yaml-components.js` — public composable API (new)
- `packages/docsify-plugin/src/core/export-renderers.js` — latex/typst/markdown renderers
- `packages/docsify-plugin/src/renderers/preact.js` — Preact bridge + `buildTransforms()`
- `packages/docsify-plugin/src/components/index.js` — zero side effects, exports `defaultComponents`
- `packages/docsify-plugin/package.json` — npm package config
- `docs/index.html` — simplified to single module entry point
- `docs/content/guide/*.md` — updated path references

---

## Second half of session — IoC + DAG cleanup

### Key insight: don't wrap libraries, extend them
Identified the same anti-pattern twice in the codebase:
- Docsify: wrapping instead of extending via `$docsify.plugins`
- unified: `transformMarkdown` hiding unified inside instead of exposing `yamlComponents` as a plugin

Saved to global CLAUDE.md as behavioral rule.

### IoC refactor: Docsify wiring moved to adapter
`index.js` was mixing core API + Docsify hooks (`$docsify.plugins`, `hook.beforeEach`, `hook.doneEach`).
- `adapters/docsify/index.js` — all Docsify-specific wiring
- `src/index.js` — pure re-exports, no DOM, no Docsify
- `docs/index.html` now imports from `adapters/docsify/index.js` explicitly
- `renderer.js` deleted (orphaned)
- Bug fix: `yamlComponents` now preserves `node.position` so `serializeToMarkdown` can apply replacements

### DAG cleanup — each layer depends only on layers below
```
core/        ← pure functions (no deps)
utils/       ← browser utils (dom-transform.js moved here)
renderers/   ← outputs to DOM (preact.js only)
serializers/ ← outputs text strings (latex, typst, markdown)
index.js     ← assembles everything
adapters/    ← framework-specific wiring
```

Changes:
- `dom-transform.js` → `utils/` (DOM ≠ pure core)
- `config.js` — removed `window` fallback; adapter calls `initConfig()` explicitly
- `export-renderers.js` split → `serializers/latex.js`, `typst.js`, `markdown.js`
- `core/yaml-components.js` deleted — assembly moved to `src/index.js` (no core→renderers edge)
- `COMPONENT_REGISTRY` removed from `markdown-utils.js` — was duplicate of `Object.keys(defaultComponents)`
- Astro adapter refactored: accepts `{ components }` param instead of reading global list

### Renderers vs Serializers distinction
Preact renders to DOM — it IS the output.
latex/typst/markdown serialize to text — need external tool to produce visible output:
- `latexRenderers` → `\commands` → Pandoc WASM → PDF
- `typstRenderers` → `#functions` → Typst WASM → PDF
- `markdownRenderers` → markdown text → Docsify → HTML
Added `serializers/README.md` documenting the distinction.

---

## Planned next steps

### Eliminate Lua filters (future)
Currently export pipeline: `markdown → Pandoc+LuaFilters → LaTeX/Typst → PDF`
Target: `markdown → JS serializers (pre-process YAML fences) → clean text → Pandoc (no filters) → PDF`
Pandoc would stop knowing YAML components exist. JS serializers become the single source of truth.

### Verify Astro adapter
Refactored but not tested against a real Astro project.

### Clean up `transformMarkdown`
Backwards-compat wrapper. Remove when all callers use `yamlComponents` unified plugin directly.

### Package rename
`packages/docsify-plugin/` is a misleading name — core has nothing to do with Docsify.

### Fix and run the build
`build.mjs` uses esbuild IIFE, but entry point is `src/index.js` (now a pure re-export).
Needs two fixes before `npm run build` works:
1. Entry point → `src/adapters/docsify/index.js` (the thing that actually wires Docsify)
2. `package.json` exports map — update to reflect new folders (`serializers/`, `utils/`)
Also: decide which CDN deps (preact, unified, remark-parse) should be `external` in esbuild vs bundled.

### Deploy + index.html production test
After build: swap `docs/index.html` from importing `src/adapters/docsify/index.js` (dev, needs importmap)
to loading `dist/docsify-kiri.min.js` (prod, single script tag, no importmap needed).
Verify full page renders correctly in production mode.
