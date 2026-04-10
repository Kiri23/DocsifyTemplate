---
name: WASM capabilities documentation page
description: Document current Pandoc WASM export feature and future WASM possibilities (semantic search, executable code blocks, local RAG, isomorphic-git)
type: project
---

## Task: WASM Capabilities Page

**Status:** done

### Objective

Create a documentation page that covers:
1. **Current: Pandoc WASM export pipeline** — how it works, what it enables (branded PDFs via LaTeX/Typst templates, Lua filters), why no competitor offers this (Docusaurus/VitePress/MkDocs/GitBook all limited to print CSS or server-side).
2. **Future WASM possibilities** — what the architecture makes possible.

### WASM Ideas to Document

1. **Semantic Search** — Transformers.js (~25MB lazy), pre-compute doc embeddings, browser-side cosine similarity. "¿Cómo configuro exports?" finds the right section even without exact keyword match. Reference: SemanticFinder.
2. **Executable code blocks** — Pyodide (~11MB lazy), "Run" button on Python code fences. Or containerized environments (StackBlitz-style WebContainers, React JSON Schema preview in browser). Many solutions exist already — document the pattern, not reinvent it.
3. **Isomorphic-git integration** — clone/commit/push to GitHub from browser (~200KB). Related: Yjs + WebRTC for co-editing docs without a server (~30KB). Connects to Kiri editor.
4. **Local RAG** — PGlite + pgvector + Transformers.js + WebLLM = "chat with your docs", zero server.

### Reference Projects

- WordPress Playground — PHP + MySQL in browser via WASM
- StackBlitz WebContainers — Node.js in browser
- SemanticFinder — semantic search frontend-only
- wasm-service — HTMX + SW + Rust WASM proof of concept (closest to DocsifyTemplate stack)

### Also Cover

- Service Worker possibilities — how SW + WASM could extend the framework
- The "no SW/WASM unless JS can't solve it" rule from CLAUDE.md — when the rule bends and why (Pandoc WASM is the current example)

### Research Done (2026-03-31)

- Agent investigated PDF export across competitors: none offer branded PDF with custom LaTeX/Typst templates. MkDocs closest with CSS cover pages via WeasyPrint. DocsifyTemplate's browser-side Pandoc WASM pipeline is unique.
- The export feature is proof that the framework's transparent architecture enables deep extensions that pre-built frameworks can't match.

### Where It Goes

- Likely a new page: `docs/content/guide/wasm-capabilities.md` or similar
- Could also add a brief mention in design-decisions.md (zero-config section) pointing to this page
- Sidebar update needed

### Dependencies

- Export button must be working (fixed: stray 'P' in latex-export.js, commit 891ec03)

## Session Log
<!-- append-only: each session adds an entry -->
- 2026-04-01: Starting WASM capabilities page creation.
- 2026-04-01: Completed. Created `docs/content/guide/wasm-capabilities.md` (91 lines). Diataxis explanation type — covers export pipeline architecture, competitor comparison, WASM justification rule, and four future possibilities (semantic search, executable code blocks, isomorphic-git, local RAG). Added to sidebar. Added cross-reference from design-decisions.md zero-config section.
