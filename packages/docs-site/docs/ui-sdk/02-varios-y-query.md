# 2. Varios componentes y `query`

En una página real hay más de un componente. Con tres elementos `ui-*` montados a la vez:

- `<ui-segmented-control aria-label="Vista de diffs">` (`Split` / `Unified`)
- `<ui-accordion aria-label="Decisión: usar import map">` (cerrado)
- `<ui-collapsible aria-label="Detalles de caché">` (cerrado)

`window.agent.snapshot()` lista todos los componentes visibles ahora. Cuando querés encontrar uno sin traerte toda la página —o mirar adentro de secciones cerradas— usás la segunda herramienta de UI SDK: `window.agent.query(...)`.

Los filtros reales que acepta `query` en `@ui-sdk/core@0.1.0-beta.17`:

| Parámetro | Qué busca | Ejemplo |
| --- | --- | --- |
| `text` | palabras completas en etiquetas o ítems de una lista | `query({ text: "Unified" })` |
| `kind` | filtra por tipo de componente | `query({ kind: "accordion" })` |
| `closed` | incluye componentes dentro de secciones o pestañas cerradas | `query({ closed: true })` |
| `within` / `from` | pagina hasta 50 ítems dentro de una lista larga | `query({ within: "Country", from: 50 })` |

Y `act` acepta **varios pasos en una sola llamada** (`steps: [paso1, paso2]`). Los corre en orden y frena en el primero que falla.

## Probalo vivo acá mismo

<!-- as: ui-demo paso="query" -->
Demo interactiva con tres componentes `ui-*` y `query` (`--components propios/ui-sdk-demos.js`).

## Qué escribe el agente y qué contesta la página

<!-- as: terminal command="DevTools Console · query + act multipaso" line-ms="90" exit="0" -->
```console
> window.agent.query({ text: "Unified" })
[{"ref":"c1","component":"segmented-control","actions":["setValue"],"label":"Vista de diffs","value":"split","items":[{"value":"unified","label":"Unified"}]}]

> window.agent.query({ kind: "accordion" })
[{"ref":"c2","component":"accordion","actions":["setValue","open","close","toggle","openAll","closeAll"],"label":"Decisión: usar import map","value":[],"items":[{"value":"open","label":"Decisión: usar import map"}]}]

> await window.agent.act({ steps: [{ ref: "Vista de diffs", action: "setValue", args: ["unified"] }, { ref: "Detalles de caché", action: "setOpen", args: [true] }] })
{"ok":true,"steps":[{"step":0,"ref":"c1","changes":[{"component":"segmented-control","label":"Vista de diffs","key":"value","value":"unified"}]},{"step":1,"ref":"c3","changes":[{"component":"collapsible","label":"Detalles de caché","key":"open","value":true}]}],…}
```

En una sola llamada de `act` cambiaste el segmented control a `Unified` y abriste `"Detalles de caché"`. Sin selectores CSS, sin `.click()`, sin leer el DOM.
