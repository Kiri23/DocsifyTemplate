# 2026-04-22 — docs-engine npm publish setup

## What we did

Made `packages/docs-engine` a properly publishable npm package and wired up CI to publish automatically on GitHub Release.

## Changes

**`packages/docs-engine/build.mjs`**
- Replaced IIFE build with two ESM outputs:
  - `dist/docs-engine.esm.js` — core library, peer deps external
  - `dist/docsify-adapter.js` — Docsify plugin, peer deps external (resolved via importmap)
- Build also mirrors artifacts to `docs/vendor/docs-engine/` for the demo site

**`packages/docs-engine/package.json`**
- Updated `exports` field: `.` → ESM core, `./docsify` → adapter, `./style` → CSS
- Added `preact-custom-element@^4.6.0` to devDependencies
- Excluded `pandoc.wasm`, `pandoc.wasm.bak`, `vendor/` from npm publish (32MB → 75KB)

**`packages/docs-engine/src/index.js`**
- Added `initConfig`, `getConfig`, `getThemeCSS`, `isFeatureEnabled` to public exports

**`docs/index.html`**
- Switched from absolute `/packages/docs-engine/src/...` paths to relative `./vendor/docs-engine/...`
- Simplified Tailwind @theme setup using `getThemeCSS()`
- Fixed `config.js` path from `/docs/config.js` → `./config.js`

**`.github/workflows/publish.yml`**
- GitHub Actions workflow: triggers on Release → build → npm publish
- Uses npm Trusted Publishing (OIDC) — no NPM_TOKEN secret needed

## Key learnings

**npm Trusted Publishing gotchas:**
- `setup-node` with `registry-url` is required (tells npm the registry)
- Must run `npm install -g npm@latest` — npm < 9.5 doesn't support Trusted Publishing
- Do NOT set `NPM_CONFIG_USERCONFIG=/dev/null` — breaks OIDC entirely
- No `NODE_AUTH_TOKEN` needed
- Trusted Publisher must be configured on npmjs.com before first CI publish

**Android build workaround:**
- `npm install` fails in `/storage/emulated/0/...` (symlinks not supported)
- Build from `$HOME`: copy package → install → build → copy dist back
- CI runs natively without this workaround

**CDN delivery:**
- npm is the origin; esm.sh/jsDelivr mirror automatically
- Docsify users: `<script type="module" src="https://esm.sh/docs-engine/docsify">`
- No IIFE needed — `<script type="module">` supports ESM natively

## Published

`docs-engine@0.1.6` on npm — first version published manually, CI working from v0.1.6 onwards.

---

## Session 2 — Two adapter builds (v0.1.8)

### Problem
`?bundle` on esm.sh caused two separate preact instances: the adapter bundled its own preact, and `@preact/signals` bundled its own. Both anonymous copies → no shared module singleton → `n.setState is not a function` / signals broken.

### Fix
Two adapter builds via esbuild:

| Output | Externals | Use case |
|---|---|---|
| `dist/docsify-adapter.js` | none | `<script type="module">` — everything inlined, one preact instance |
| `dist/docsify-adapter.esm.js` | peer deps | `./docsify/esm` export — importmap users who control preact version |

esbuild handles the bundle in one pass → single preact instance shared between adapter and `@preact/signals` → signals work.

### Key changes
- **`build.mjs`**: added self-contained adapter build (no externals); removed vendor folder mirroring
- **`package.json`**: added `@preact/signals` to devDependencies (needed for self-contained bundle); added `./docsify/esm` export; bumped to v0.1.8
- **`docs/index.html`**: updated to `@0.1.8`, removed `?bundle` — no longer needed since dist file is already self-contained

### CDN usage after v0.1.8
```html
<!-- Simple (self-contained, no importmap) -->
<script type="module" src="https://esm.sh/docs-engine@0.1.8/docsify"></script>

<!-- Advanced (importmap, user controls preact version) -->
<script type="module" src="https://esm.sh/docs-engine@0.1.8/docsify/esm"></script>
```

### Android build gotcha
Self-contained build requires `@preact/signals` resolvable at build time. Must be in devDependencies — was missing, caused `Could not resolve "@preact/signals"` esbuild error.
