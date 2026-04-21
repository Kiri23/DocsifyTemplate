- [Update skill after export changes](feedback_skill_update.md) — remind to update export skill refs after modifying filters/templates
- [Plan: Diataxis Audit](plans/diataxis-audit/overview.md) — restructure DocsifyTemplate docs by Diataxis type (5 tasks, sequential)

## Planned Work
- [WASM capabilities page](plans/wasm-capabilities-page.md) — document Pandoc export + future WASM ideas (semantic search, Pyodide, isomorphic-git, local RAG)

## User & Audience
- [Documentation audience](user_audience.md) — internal company docs, non-technical stakeholders, SEO irrelevant

## Research
- [Doc generator comparison](research_doc_generators.md) — Starlight/Nextra/etc fall short for custom use cases; frontmatter is an open opportunity but no specific fields identified yet
- [Plugin system design](research_plugin_system.md) — Starlight-inspired plugin architecture: hooks, lifecycle, AI tool registration, examples. Ready to implement.
- [Gemma 4 ecosystem](research_gemma4_ecosystem.md) — Community usage, inference providers/pricing ($0.14-0.40/M tokens), Node.js server options (Ollama, Transformers.js v4 CUDA), business model tiers.
- [Android AI Edge & on-device ML](research_android_ai_edge.md) — Google AI Edge stack (LiteRT, LiteRT-LM, MediaPipe, AICore), Pixel Tensor capabilities, Termux ML runtimes, MainAI tiered inference architecture.
- [ML weights portability & training](research_ml_weights_portability.md) — Weights run on any runtime (phone/browser/server). Cloud GPU via Modal ($0.19/run). Local embeddings for MemoryGraph. Enterprise value proposition.

## Key Insights (2026-04-20)
- [Signals + Custom Elements — el cable invisible](insight_signals_islands.md) — YAML=transporte, Custom Elements=islas, Signals=cable. Tres primitivos del browser sin framework overhead. Insight central para documentar el engine.
- [Store writers como paquetes — forward/backward pass](insight_store_writers.md) — writers (ML, graph, AI) escriben al store como forward pass; componentes leen como backward pass. Engine se extiende, no se modifica.
- [Preact ecosystem features](research_preact_ecosystem.md) — preact/compat (React libs en Preact), preact-iso (NO usar, Docsify bloquea router), SSR, option hooks internals.

## Architecture Decisions
- [Why classic scripts](architecture/why-classic-scripts.md) — Docsify 4 requires sync `<script>`, ES modules execute too late
- [Engine vs hooks separation](architecture/engine-vs-hooks-separation.md) — split component-renderer into pure functions + thin Docsify wiring
