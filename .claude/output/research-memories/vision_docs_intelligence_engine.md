---
name: DocsifyTemplate — vision and mental model
description: What we are building, why, and the core mental model. Load this first in every session.
type: project
originSessionId: b6f7b07d-9ca1-4519-a27b-bf59b55d4b0a
---
## What we are building

A **docs intelligence engine** — not a docs framework. The difference: a framework gives you structure; an engine gives you computation over that structure.

DocsifyTemplate is becoming a system where docs are a **live graph** — interconnected, reactive, aware of the code they document, queryable by AI. Docsify is the first adapter. The engine works without it.

## The three-layer mental model

```
YAML        = transport      (structured data in code fences, machine-generated)
Custom El.  = islands        (browser-native mount points, framework-agnostic)
Signals     = wire           (reactive state shared across islands, no parent needed)
```

Author writes markdown. Fences carry YAML. Engine transforms YAML → Custom Elements. Browser mounts Preact into each element. Signals connect elements that have no common parent in the DOM.

## The plugin architecture (CRITICAL rule for new sessions)

**The engine is closed for modification, open for extension.**

- **Writers (plugins)** — compute knowledge, write to the signal store. Each is an independent package.
  - `@docs-engine/backlinks` — inverse link graph across all docs
  - `@docs-engine/drift-detection` — docs ↔ code staleness via transitive DAG traversal
  - `@docs-engine/chat` — Gemma 4 WebGPU inference
  - `@docs-engine/embeddings` — semantic similarity (future)
  - Any ML model, graph algorithm, or AI process = a writer

- **Components (views)** — read from the signal store reactively. Never know who wrote or how.

- **Signals** — the only contract between writers and views. ES module singleton = one instance per page guaranteed by the browser.

- **Core** — never grows for a new feature. A new feature = a new plugin.

When suggesting anything: ask "what writes to the store, and what reads from it?" before touching core/.

## The DAG pattern

Forward pass = writers compute the graph.
Backward pass = components project the graph as views.

Same as backprop: forward builds, reverse traversal distributes credit. Same as Bazel: declared DAG, transitive invalidation, deterministic.

## Package structure

```
engine (framework-agnostic core)
  + adapters  (Docsify, Astro — framework wiring only)
  + plugins   (writers: backlinks, drift, chat, embeddings)
  + components (views: pure Preact functions, zero renderer knowledge)
  + serializers (text output: LaTeX, Typst, Markdown)
```

Same pattern as: React (reconciler + react-dom), unified (AST + remark/rehype), webpack (core + loaders).

## Distribution model (unlocked in v0.1.8)

`docs-engine` is now a published npm package. This makes the plugin model real — not just architectural aspiration.

**How a writer is distributed:**

```
npm create @docs-engine/backlinks
  peerDependencies: { "docs-engine": ">=0.1.8" }
  imports: signal store from docs-engine core
  writes: backlink data into signals
  exports: a Docsify plugin function
```

Consumer installs only what they need:
```bash
# minimal — just the engine
<script src="esm.sh/docs-engine/docsify">

# with backlinks writer
<script src="esm.sh/@docs-engine/backlinks/docsify">

# with chat writer
<script src="esm.sh/@docs-engine/chat/docsify">
```

Each writer is an independent package. `docs-engine` is the peer dep. Same model as `@preact/signals` is separate from `preact`.

**Next: `packages/chat` → `@docs-engine/chat`**

The chat package already exists in the repo. Currently it writes to the DOM directly. Converting it to a proper writer means: it writes chat state into signals → components read reactively → chat becomes composable with any other writer. That's the next session goal.

## What makes this different from existing doc tools

Existing tools (Mintlify, GitBook, Docusaurus) are frameworks — they own the pipeline. This is an engine — it exposes primitives that anyone can compose. The docs themselves are a graph; components are views over that graph; plugins enrich the graph with computed knowledge.

The long-term vision: docs that know what they document, detect when they go stale, surface related content semantically, and accept AI queries — all without a server.
