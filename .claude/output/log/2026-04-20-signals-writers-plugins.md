# Session Log — 2026-04-20: Signals, Writers, and the Plugin Mental Model

## What we built

### Signals POC — migration complete
- Moved `lib/state/demo-store.js` → `packages/docs-engine/src/state/demo-store.js`
- Moved `lib/components/node-list.js` and `node-panel.js` → `packages/docs-engine/src/components/`
- Registered `node-list` and `node-panel` in `defaultComponents`
- Deleted `lib/` entirely — no dead code
- **Verified: signals work across two Custom Elements with no shared parent in the DOM**

## Key insights discovered this session

### 1. Signals + Custom Elements = cable invisible entre islas
Two custom elements, no shared parent, no React context, no framework tree. One signal module (ES module singleton). The browser guarantees exactly one instance — that's all you need. Three browser primitives working together:
- **YAML** = transport
- **Custom Elements** = islands
- **Signals** = the invisible wire between islands

### 2. The store is not for user events — it's for computed knowledge
Any process can write to the store before or during render. The "writer" doesn't have to be a user action:
- Prebuild graph scan
- ML embeddings
- AI inference
- Graph algorithms (PageRank, community detection)
- Code drift detection

This is forward pass / backward pass applied to docs: writers compute the graph (forward), components are projections (reverse traversal).

### 3. Engine is closed for modification, open for extension
Writers are plugins. Each is an independent package:
- `@docs-engine/backlinks` — builds inverse link graph, writes to store
- `@docs-engine/drift-detection` — maps docs↔code, computes staleness transitively
- `@docs-engine/chat` — Gemma 4 WebGPU inference, writes chat responses to store
- `@docs-engine/embeddings` — semantic similarity (future)
- `@docs-engine/graph-rank` — PageRank over docs (future)

Components (views) read reactively — they never know who wrote or how. Signals are the only contract between writers and views. Core never changes for a new feature.

## Preact ecosystem research
- `preact/compat` — makes any React library work in Preact via importmap alias. Not needed now, unlock for future React ecosystem integrations.
- `preact-iso` — islands routing + lazy loading. Blocked by Docsify owning the router. Current Custom Elements approach is already islands without it.
- Option hooks (`options._render`) — how signals integrates deeply with Preact internals. Not needed directly.

## GitHub issues updated
- **#12** — reframed as `@docs-engine/backlinks` writer package + Plugin label
- **#13** — reframed as `<dependency-graph>` view/component reading from store
- **#14** — reframed as `@docs-engine/drift-detection` writer package + Plugin label
- **#23** — new issue: `@docs-engine/chat` Gemma 4 plugin
- Labels created: `Frontend`, `CI/CD`, `AI`, `Plugin`, `Kiri Editor`

## CLAUDE.md updated
Added critical rule: **engine is closed for modification, open for extension**. Writers write to signal store. Components read reactively. Core never grows for a new feature.

## Branch state
- `feat/signals-poc` — pushed, PR #16 open and ready to merge
- All signals POC files in correct location under `packages/docs-engine/src/`
- `lib/` deleted
