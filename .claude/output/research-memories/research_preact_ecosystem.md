---
name: Preact ecosystem features
description: Preact packages beyond signals — compat, iso, SSR, option hooks — for future docs-engine decisions
type: project
---
## preact/compat — React ecosystem compatibility

Añadir dos líneas al importmap hace que cualquier librería React funcione en Preact sin reescribirla:

```js
{
  "react": "https://esm.sh/preact/compat",
  "react-dom": "https://esm.sh/preact/compat"
}
```

**Why:** evita reescribir librerías que solo existen para React (react-table, date pickers, rich text editors, chart libraries). Actualmente no se necesita — componentes son Preact puro. Considerar cuando se quiera integrar algo del ecosistema React en docs-engine.

**Trade-off:** añade algo de peso, solo vale si hay librerías React externas involucradas.

## preact-iso — islands architecture

Routing async-aware + `lazy()` para code splitting + `prerender()` para HTML estático. NO usar — Docsify ya controla el routing y los Custom Elements ya dan islands nativos sin necesitarlo.

## preact-render-to-string — SSR

SSR con streaming. Los mismos componentes Preact que se usan en browser se pueden serializar a string en servidor — mismo patrón engine/transport. Útil solo si se agrega un build step o servidor.

## Option Hooks — cómo signals se integra internamente

`options._render`, `options._diff`, `options._unmount` son hooks internos de Preact que interceptan su ciclo de vida. `@preact/signals` los usa para rastrear qué señales lee cada componente durante render — por eso solo ese componente se actualiza, no el árbol entero. No se necesita tocar esto directamente.
