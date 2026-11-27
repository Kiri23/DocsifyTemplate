# 5. WebMCP y la herramienta `read`

Hasta acá llamamos a `window.agent` directo desde JavaScript. ¿Cómo hace un navegador con soporte nativo para descubrir esas herramientas sin Playwright?

## WebMCP: document.modelContext

Chrome 158 con el flag **Experimental Web Platform features** expone `document.modelContext`. En `packages/docs-site/plugins/ui-sdk.js:36-44`, cuando esa API existe en la página, UI SDK registra sus tres herramientas (`snapshot`, `query`, `act`) y DocsifyTemplate suma una cuarta (`read`):

```js
// packages/docs-site/plugins/ui-sdk.js:36-44
const context = document.modelContext;
if (context) {
  registerTools(agent, { allow });
  context.registerTool?.({
    ...read.tool,
    annotations: { readOnlyHint: true, untrustedContentHint: true, consequentialHint: false },
    execute: (input) => read.run(input),
  })?.catch?.(() => {});
}
```

## Por qué existe read

El `snapshot()` de UI SDK devuelve los componentes, su estado (`open`, `value`) y sus acciones — pero **no trae la prosa de la página**. El texto dentro de un panel cerrado, un párrafo normal, o la definición de un término como <dfn class="term" data-tip="La API experimental del navegador (document.modelContext) donde una página registra herramientas para que un agente nativo del navegador las descubra.">WebMCP</dfn> o <dfn class="term" data-tip="El objeto que UI SDK crea en la página con createAgent({ allow }) y expone snapshot, query y act.">window.agent</dfn> nunca viaja en `snapshot()`.

Por eso `packages/docs-site/plugins/page-text.js` guarda el Markdown crudo de la página actual en `hook.beforeEach` y expone `window.pageText = { read: read.run, tool: read.tool }` **al lado de `window.agent`, sin modificar el objeto de UI SDK**:

- `snapshot`, `query` y `act` → son de **UI SDK** (`@ui-sdk/core@0.1.0-beta.17`).
- `read` → es **nuestra** (`plugins/page-text.js`). Sin argumentos devuelve las secciones y los `<dfn>`; con `{ section: "Por qué existe read" }` devuelve el Markdown de esa sección.

## Probalo vivo acá mismo

Podés inspeccionar si `document.modelContext` está activo en este navegador, simular el registro real con `registerTools(window.agent, { allow })` para ver las 4 herramientas exactas que recibe Chrome, y ejecutar `window.pageText.read()` sobre esta misma página:

<!-- as: ui-demo paso="webmcp" -->
Demo interactiva de WebMCP (`registerTools`) y `window.pageText.read` (`--components propios/ui-sdk-demos.js`).

## Qué registra la página en WebMCP

<!-- as: terminal command="document.modelContext · 4 herramientas registradas" line-ms="90" exit="0" -->
```console
Herramientas en document.modelContext:
  1. snapshot  [UI SDK]  readOnlyHint: true   — lista componentes visibles, estado y acciones
  2. query     [UI SDK]  readOnlyHint: false  — busca por text, kind, closed, within/from
  3. act       [UI SDK]  readOnlyHint: false  — ejecuta steps [{ ref, action, args }] pasando por allow
  4. read      [propia]  readOnlyHint: true   — lee el Markdown por sección y los términos <dfn>

> window.pageText.read()
{"page":"ui-sdk/05-webmcp.md","sections":["(top)","WebMCP: document.modelContext","Por qué existe read","Probalo vivo acá mismo","Qué registra la página en WebMCP"],"terms":[{"term":"WebMCP",…},{"term":"window.agent",…}]}
```
