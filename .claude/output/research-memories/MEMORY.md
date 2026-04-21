## Vision (load first — frames everything else)
- [DocsifyTemplate — vision and mental model](vision_docs_intelligence_engine.md) — docs intelligence engine, plugin architecture, writer/view pattern, DAG mental model

## Architecture Decisions (why things are built the way they are)
- [Why classic scripts](architecture/why-classic-scripts.md) — Docsify 4 requires sync `<script>`, ES modules execute too late
- [Engine vs hooks separation](architecture/engine-vs-hooks-separation.md) — split component-renderer into pure functions + thin Docsify wiring

## Key Insights (discoveries that shaped the system)
- [Signals + Custom Elements — el cable invisible](insight_signals_islands.md) — YAML=transporte, Custom Elements=islas, Signals=cable. Tres primitivos del browser sin framework overhead. Usar al documentar.
- [Store writers como paquetes — forward/backward pass](insight_store_writers.md) — writers escriben al store (forward), componentes leen reactivamente (backward). Engine nunca cambia.

## Behavioral Feedback (how to work with Christian)
- [Mobile touch-first UX](feedback_mobile_touch_first.md) — Pixel Chrome; no hover-only, prefer tap/footer patterns
- [Update skill after export changes](feedback_skill_update.md) — remind to update export skill refs after modifying filters/templates
- [Claude Code auto-update breaks Termux](feedback_claude_autoupdate.md) — pin v2.1.112, disable autoUpdaterStatus after every reinstall

## Research (external knowledge that informed decisions)
- [Preact ecosystem features](research_preact_ecosystem.md) — preact/compat (React libs via importmap), preact-iso (NO usar con Docsify), option hooks internals
- [Plugin system design](research_plugin_system.md) — Starlight-inspired plugin architecture: hooks, lifecycle, AI tool registration
- [Doc generator comparison](research_doc_generators.md) — Starlight/Nextra/etc fall short for custom use cases
- [Gemma 4 ecosystem](research_gemma4_ecosystem.md) — inference providers/pricing, Node.js options (Ollama, Transformers.js v4 CUDA)
- [Android AI Edge & on-device ML](research_android_ai_edge.md) — Google AI Edge stack, Pixel Tensor, Termux ML runtimes
- [ML weights portability & training](research_ml_weights_portability.md) — Modal GPU ($0.19/run), local embeddings, enterprise value
- [Termux ML blockers](feedback_termux_ml_blockers.md) — PyTorch/ONNX fail in Termux; HF API works, proot Ubuntu, VPS
- [ML Pipeline: paper → phone](research_ml_pipeline_actionable.md) — full pipeline: paper2code → Modal → HuggingFace → ONNX → LiteRT/browser

## References
- [PyImageSearch tutorial index](reference_pyimagesearch.md) — 774 tutorials, grep sitemap at aiDocs/pyimagesearch/SITEMAP_URLS.txt before crawling

## User & Audience
- [Documentation audience](user_audience.md) — internal company docs, non-technical stakeholders, SEO irrelevant

## Planned Work
- [Plan: Diataxis Audit](plans/diataxis-audit/overview.md) — restructure docs by Diataxis type (5 tasks, sequential)
- [WASM capabilities page](plans/wasm-capabilities-page.md) — document Pandoc export + future WASM ideas
