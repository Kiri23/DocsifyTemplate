---
name: Engine vs hooks separation in component-renderer
description: Decision to split component-renderer.js into engine (pure functions) + hooks (Docsify wiring) as two files using window globals
type: project
---

## Decision: Separate engine from hooks in component-renderer.js

Split into two files:
- `component-renderer-engine.js` — pure functions, no Docsify dependency
- `component-renderer.js` — thin Docsify hooks that call engine functions

**Why:** The plugin mixes pure transformations (frontmatter parsing, section extraction, mermaid processing, scroll-reveal) with Docsify hook wiring. Separating them makes hooks read as declarative recipes ("what happens") while engine functions express intention ("how it works"). Aligns with Christian's Engineering DNA: separation of engine from transport.

**How to apply:**
- Engine exposes via `window.__CREngine = { ... }` (not ES modules — see `why-classic-scripts.md`)
- Engine loads as `<script>` before the plugin in `index.html`
- Hooks become thin: each hook body is 3-5 lines calling named engine functions
- NOT a utils file — these functions are specific to this plugin's engine, not generic reusables
- `toCamelCase` and `stripFrontmatter` are duplicated in other files but don't justify a shared utils file yet (2 functions, ~5 lines each — wait for a third duplication)
