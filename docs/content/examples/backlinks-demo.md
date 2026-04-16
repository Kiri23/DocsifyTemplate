# Backlinks — reactive cross-doc graph

Every page below the sidebar gets scanned once at load. The reverse index
(`target → who links to it`) lives in a module-level signal. The panel on this
page re-renders whenever you navigate — no component tree, no provider, no
subscription boilerplate.

> Background: [issue #12 — Backlinks entre docs](https://github.com/Kiri23/DocsifyTemplate/issues/12) · [issue #15 — signals POC](https://github.com/Kiri23/DocsifyTemplate/issues/15) · [PR #16](https://github.com/Kiri23/DocsifyTemplate/pull/16)

---

## Related pages

```backlinks-panel
_: _
```

Tap any item to navigate. Then jump to [Getting Started](/content/guide/getting-started), [Architecture](/content/guide/architecture), [Component Showcase](/content/examples/component-showcase), or [Signals POC](/content/examples/signals-poc) and come back — the list rewrote itself between route changes.

## Reactive echo (separate fence, same store)

```backlinks-echo
_: _
```

Both fences read from `lib/state/backlinks-store.js`. No parent wraps them. Navigate to another page — `currentDoc` flips on `hashchange`, `incomingLinks` recomputes, both fences update. The DOM nodes inside the panel that didn't actually change are left alone; Preact patches only the text nodes that read the changed signals.

---

## The DAG you just used

```
  backlinksIndex (signal, fetched once at boot) ──┐
                                                   ├── incomingLinks (computed)
  currentDoc (signal, hashchange → set) ──────────┤         │
                                                   │         ├──> <backlinks-panel>
                                                   │         │
                                                   │         └──> <backlinks-echo>
                                                   │
                                                   └────► future: mini-graph (#13),
                                                          drift viewer (#14)
```

Two writable signals (the only two places in the whole app that set values). One computed derivative. Two components that are independent views over the same store. Adding a third component is one `import` — zero wiring.

`hoveredDoc` / `highlightTarget` exist in the store for desktop hover affordances and future features, but are unused by the touch-first UI on this page.

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

No component writes `hoveredDoc.value = x` directly — the store exports named actions (`setHovered(path)`, `clearHovered()`). Grep the action name → you find every writer. That is the signals equivalent of "search for a dispatched action" and it costs zero ceremony. For extra introspection in dev, add `effect(() => console.log('hover →', hoveredDoc.value))` anywhere, remove before ship.
