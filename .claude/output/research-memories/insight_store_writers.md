---
name: Store writers como paquetes — forward pass / backward pass en docs
description: El store de signals es el DAG vivo. Writers (prebuild, ML, graph) son paquetes que escriben. Componentes son vistas que leen. Engine no se modifica — se extiende.
type: project
---
El signal store no es para eventos de usuario — es para conocimiento computado. Cualquier proceso puede escribir al store antes o durante el render. Los componentes solo leen reactivamente — no saben quién escribió.

**Forward pass:** writers computan el grafo y escriben al store.
- `@docs-engine/backlinks` — parsea todos los docs, construye grafo de backlinks
- `@docs-engine/drift-detection` — mapea docs ↔ archivos de código, detecta desfase
- `@docs-engine/embeddings` — similitud semántica entre docs (ML)
- `@docs-engine/graph-rank` — PageRank de docs más importantes
- `@docs-engine/ai-interest` — auto-organización por interés artificial

**Backward pass:** componentes son vistas sobre el grafo — proyecciones distintas del mismo store.
- `<backlinks-panel>` lee `backlinksGraph.value[currentPage]`
- `<drift-indicator>` lee `driftSignal.value[currentFile]`
- `<related-docs>` lee `embeddings.value[currentPage].topK(5)`

**La separación clave:** quien escribe no sabe nada de los componentes. Los componentes no saben nada de quien escribió. Solo el signal en el medio. Exactamente backprop — forward construye, reverse traversal proyecta.

**El engine no se modifica — se extiende.** Cada writer es un paquete independiente que se conecta al store. Mismo patrón que unified (plugins), Docsify (plugins), webpack (loaders). La extensión es el mecanismo, no la modificación.

**Why:** esto escala infinito — alguien puede escribir un writer de ML sin tocar el engine. Un componente nuevo puede leer del grafo sin saber cómo se construyó. La arquitectura es abierta por diseño.

**How to apply:** cuando se diseñen nuevas features (backlinks, drift, AI), modelarlas siempre como writers que escriben al store + componentes que leen. Nunca mezclar computación con renderizado.
