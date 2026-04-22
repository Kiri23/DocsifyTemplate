# docs-engine

Framework-agnostic docs intelligence engine. YAML code fences → Custom Elements → reactive UI. First adapter: Docsify.

## Consumer

### Quick start — Docsify

```html
<!-- 1. js-yaml global (sync, must load before the module) -->
<script src="https://cdn.jsdelivr.net/npm/js-yaml@4/dist/js-yaml.min.js"></script>

<!-- 2. Self-contained adapter — no importmap needed -->
<script type="module" src="https://esm.sh/docs-engine/docsify"></script>

<!-- 3. Styles -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/docs-engine/dist/theme.css">

<!-- 4. Docsify (deferred — module registers hooks first) -->
<script defer src="https://cdn.jsdelivr.net/npm/docsify@4"></script>
```

### Importmap variant (share preact with your own code)

```html
<script type="importmap">
{
  "imports": {
    "preact":               "https://esm.sh/preact@10",
    "preact/hooks":         "https://esm.sh/preact@10/hooks",
    "@preact/signals":      "https://esm.sh/@preact/signals",
    "preact-custom-element":"https://esm.sh/preact-custom-element@4",
    "htm":                  "https://esm.sh/htm@3",
    "unified":              "https://esm.sh/unified@11",
    "remark-parse":         "https://esm.sh/remark-parse@11",
    "unist-util-visit":     "https://esm.sh/unist-util-visit@5"
  }
}
</script>
<script type="module" src="https://esm.sh/docs-engine/docsify/esm"></script>
```

### Exports

| Export | File | Description |
|---|---|---|
| `docs-engine` | `dist/docs-engine.esm.js` | Core library (peer deps external) |
| `docs-engine/docsify` | `dist/docsify-adapter.js` | Self-contained Docsify plugin |
| `docs-engine/docsify/esm` | `dist/docsify-adapter.esm.js` | Docsify plugin, peer deps external |
| `docs-engine/style` | `dist/theme.css` | Component styles |

### Peer dependencies

Only needed when using the `/docsify/esm` or core exports:

`preact`, `preact-custom-element`, `@preact/signals`, `htm`, `unified`, `remark-parse`, `unist-util-visit`, `js-yaml`

---

## Maintainer

### Build

`npm install` fails under `/storage/emulated/0/...` (Android shared storage — no symlinks). Build from `$HOME`:

```bash
cp -r packages/docs-engine ~/docs-engine-build
cd ~/docs-engine-build && npm install && npm run build
cp -r ~/docs-engine-build/dist/* packages/docs-engine/dist/
```

CI (GitHub Actions) runs natively — no workaround needed.

### Outputs

| File | Externals | Size |
|---|---|---|
| `dist/docs-engine.esm.js` | peer deps | ~56KB |
| `dist/docsify-adapter.js` | none (self-contained) | ~136KB |
| `dist/docsify-adapter.esm.js` | peer deps | ~42KB |
| `dist/theme.css` | — | ~22KB |

### Publish

```bash
# 1. Bump version in package.json
# 2. Build (see above) + commit + push
git push

# 3. Create GitHub Release → CI publishes automatically via npm Trusted Publishing (OIDC)
gh release create vX.Y.Z --title "vX.Y.Z" --notes "..." --latest
```

**CI gotchas:**
- `setup-node` with `registry-url` is required (creates `.npmrc`)
- Must run `npm install -g npm@latest` — Trusted Publishing requires npm ≥ 9.5
- Do NOT set `NPM_CONFIG_USERCONFIG=/dev/null` — breaks OIDC
- No `NODE_AUTH_TOKEN` needed — OIDC handles auth
- Trusted Publisher must be configured on npmjs.com (owner: `Kiri23`, repo: `DocsifyTemplate`, workflow: `publish.yml`)

### Why two adapter builds?

`?bundle` on esm.sh creates two anonymous preact copies (one in the adapter, one inside `@preact/signals`) — no shared module singleton → signals crash with `n.setState is not a function`. The self-contained build lets esbuild resolve everything in one pass → single preact instance. The ESM variant is for consumers who manage their own preact via importmap.
