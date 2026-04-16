# Backlinks — reactive cross-doc graph

Every page below the sidebar gets scanned once at load. The reverse index
(`target → who links to it`) lives in a module-level signal. The panel on this
page re-renders whenever you navigate — no component tree, no provider, no
subscription boilerplate.

> Background: [issue #12 — Backlinks entre docs](https://github.com/Kiri23/DocsifyTemplate/issues/12) · [issue #15 — signals POC](https://github.com/Kiri23/DocsifyTemplate/issues/15) · [PR #16](https://github.com/Kiri23/DocsifyTemplate/pull/16)

---

## Mentioned by

```backlinks-panel
_: _
```

Navigate to any other page in the sidebar — [Getting Started](/content/guide/getting-started), [Architecture](/content/guide/architecture), [Component Showcase](/content/examples/component-showcase), or [Signals POC](/content/examples/signals-poc) — and come back. The panel above updated while you were away; the list is whichever pages reference the doc you are currently viewing.

## Reactive echo (separate fence, same store)

```backlinks-echo
_: _
```

Both fences read from `lib/state/backlinks-store.js`. No parent wraps them. Hover an item in the panel above — `hoveredDoc` flips, `highlightTarget` recomputes, the echo re-renders. The panel **does not** re-render, because it reads `incomingLinks`, not `highlightTarget`. Preact tracks each read independently.

---

## The DAG you just used

```
      ┌── backlinksIndex (signal)  ──────┐
      │   (fetched once at boot)          │
      │                                   ├── incomingLinks (computed)
  currentDoc (signal) ────────────────────┤         │
      ▲   (hashchange → set)              │         ▼
      │                                   │   <backlinks-panel>
      │                                   │
      └── hoveredDoc  (signal) ──┐        │
          (mouseenter → set)      ├── highlightTarget (computed)
                                  │                   │
                                  │                   ▼
                                  │            <backlinks-echo>
                                  └─────  also feeds future:
                                           sidebar highlight,
                                           mini-graph hover,
                                           #13 dependency viewer
```

Three writable signals (only three places in the whole app set values). Two computed derivatives. Two components that are views over the computed nodes. Adding a third component that wants to react to hover (say, a sidebar highlight) is literally one `import { highlightTarget } from '.../backlinks-store.js'` — zero wiring.

## Why this isn't "just a selector"

You are right that it **is** a selector in the Redux/Recoil sense. The difference is:

- **No provider, no store context** — `import` is the subscription.
- **No action/reducer boilerplate** — `signal.value = x` is the write.
- **Fine-grained DOM updates** — Preact patches only the text nodes that read the changing signal; sibling components in the same tree are untouched.
- **Composes across code fences** — the feature that makes this project's architecture work. React Context would break here because docsify re-renders the content area on route change, severing the provider.

## What this unlocks next

- **#12** — this page. Done as a POC.
- **#13** — reuse `backlinksIndex` + add `currentDoc` → render a mini graph. The same store.
- **#14** — frontmatter `source:` field + file hash compare. Still the same `backlinksIndex` shape, just with `code.js → doc.md` edges layered in.

The DAG scales. That is the whole point — structure first, views over it.

## Debugging: named actions beat raw writes

Nothing writes `hoveredDoc.value = x` directly. The store exports:

```js
export function setHovered(path) { hoveredDoc.value = path; }
export function clearHovered()    { hoveredDoc.value = null; }
```

Grep `setHovered` → you find every writer. That is the signals equivalent of "search for `dispatch({ type: 'SET_HOVERED' })`" — and it costs zero ceremony. For extra introspection in dev, add `effect(() => console.log('hover →', hoveredDoc.value))` anywhere, remove before ship.
