---
name: Signals + Custom Elements — el cable invisible entre islas
description: Insight clave para documentar: cómo signals conectan custom elements separados en el DOM sin framework overhead
type: project
---
YAML es el transporte, Custom Elements son las islas, Signals son el cable invisible entre islas.

El autor escribe dos fences separados en markdown. El DOM resultante son dos custom elements sin parent compartido, sin contexto React, sin árbol de componentes. Y aun así el estado fluye entre ellos instantáneamente — porque el signal es un singleton de módulo ES: el browser garantiza exactamente una instancia de `demo-store.js` en la página.

**Why:** la mayoría de soluciones de docs interactivos (Storybook, Docusaurus, MDX) resuelven esto metiendo todo en un árbol React/Vue. DocsifyTemplate no tiene árbol — tiene islas sueltas en un mar de markdown, conectadas solo por un signal importado como módulo ES. Tres primitivos del browser (Custom Elements + ES modules + Signals) trabajando juntos sin framework overhead.

**How to apply:** cuando se documente el engine, este es el insight central que diferencia la arquitectura. No es "Preact en Docsify" — es islas reactivas conectadas por signals sobre markdown estático.
