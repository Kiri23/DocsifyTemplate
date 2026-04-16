# Signals POC — reactive state between code fences

Two Preact components mounted via **separate code fences** share state through `@preact/signals`. Click an item in fence 1; fence 2 updates instantly. No parent component, no props, no context — just a module-level signal read by both.

> Motivation and design: [issue #15 — Add @preact/signals for cross-component reactive state](https://github.com/Kiri23/DocsifyTemplate/issues/15)

---

## Fence 1 — Node list

```node-list
_: _
```

Plain markdown here. **The two components have no shared parent in the DOM.** This paragraph lives between them; there is no React/Preact context wrapping both. The only connection between fence 1 and fence 2 is a signal imported from `lib/state/demo-store.js`.

## Fence 2 — Node panel

```node-panel
_: _
```

---

## How it works

Both components import from the same store module:

```js
// lib/state/demo-store.js
import { signal, computed } from '@preact/signals';

export const selectedId = signal(null);
export const selectedNode = computed(
  () => nodes.find((n) => n.id === selectedId.value) ?? null
);
```

**Fence 1 writes** on click:

```js
onClick={() => (selectedId.value = node.id)}
```

**Fence 2 reads** during render:

```js
const node = selectedNode.value;
```

That's the entire wiring. No provider, no selector, no subscription — reading `selectedNode.value` **is** the subscription. Preact's signals runtime tracks the read and re-runs the reader when the value changes.

## The DAG that emerges

```
nodes (static array) ──┐
                       ├──> selectedNode (computed)
selectedId (signal)  ──┘           │
                                   ▼
                          Fence 2 — Node panel
       ▲
       │ (mutation)
Fence 1 — Node list
```

Fence 1 has one edge out (writes `selectedId`). The `computed` signal has two edges in (reads `selectedId` and `nodes`). Fence 2 has one edge in (reads `selectedNode`). **This DAG was never declared.** It emerged from the act of reading and writing signals.

## Why this is the correct fit for DocsifyTemplate

- **Zero-build-step preserved** — `@preact/signals` loads via the existing importmap, same as Preact itself. No bundler added, no Vite, no webpack.
- **No component tree restructuring** — you do not need a common parent; code fences stay independent.
- **DOM-level reactivity** — Preact patches only the affected nodes; the other fence component does not re-render when the signal changes (open devtools → elements panel and watch the highlight).
- **Structure-first** — state lives in a module (the structure); components are views over it. Aligned with the framework's architecture.

## What this unblocks

- **#12** backlinks — a reactive map of "who links to whom" read by every note page. See the working POC at [Backlinks Demo](/content/examples/backlinks-demo).
- **#13** dependency graph visual — a `GraphViewer` fence can write the hovered node id; a sidebar panel reads it.
- **#14** impact analysis — a global filter signal read by multiple drift-detection views.

All three require shared state between independent fence components. Without signals, each would need to re-implement pub/sub. With signals, each is a `.value = x` / `.value` read.
