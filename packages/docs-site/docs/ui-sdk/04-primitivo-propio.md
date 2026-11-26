# 4. Primitivo propio: `definePrimitive` (el stepper de #66)

Hasta acá usamos elementos que ya vienen en `@ui-sdk/web` (`ui-collapsible`, `ui-segmented-control`, `ui-accordion`). ¿Qué pasa cuando construís un componente propio que UI SDK no trae —como una terminal, un tablero o un stepper?

En DocsifyTemplate PR #66 (`feat-stepper-primitive`), el stepper se implementó como primitivo propio en dos archivos:

- **`packages/docs-site/plugins/stepper.js`**: define el primitivo con `definePrimitive` (estado `{ value, count }`, validación en `stepOf`, slots `root`/`list`/`tab`/`panel`/`previous`/`next`/`status`, y `agent: { actions: ["setValue", "next", "previous"] }`) y registra los custom elements `as-stepper-*` con `createParts`.
- **`packages/docs-site/components/stepper.js`**: la vista de Preact solo lee los `##` del Markdown y dibuja `<as-stepper>` con sus elementos hijos. Toda la lógica de estado, teclado y agente vive en el primitivo.

```js
// packages/docs-site/plugins/stepper.js (extracto real, líneas 28-44 y 125)
export const stepperPrimitive = definePrimitive({
  name: "stepper",
  options: { count: "number", defaultValue: "number", onValueChange: "callback" },
  state: (options) => ({ value: options.defaultValue ?? 1, count: options.count ?? 1 }),
  controlled: ["value"],
  api: (context) => {
    const change = createChange(context);
    const setValue = (step, event) =>
      change("value", stepOf(step, count()), { reason: event ? "item-press" : "agent", event });
    return {
      setValue,
      next: (event) => current() < count() && setValue(current() + 1, event),
      previous: (event) => current() > 1 && setValue(current() - 1, event),
    };
  },
  // ... slots ...
  agent: { actions: ["setValue", "next", "previous"] },
});
```

Nadie escribió una herramienta MCP para el stepper: declarar `agent: { actions: ["setValue", "next", "previous"] }` alcanza para que el puente de UI SDK lo incluya en `snapshot()`, `query()` y `act()`.

## El stepper real (de `docs/componentes/stepper.md`)

Este stepper de abajo es el componente real `<!-- as: stepper -->` de DocsifyTemplate PR #66:

<!-- as: stepper -->

## Agregá el término

Agregá un bloque a `docs/vocabulary.ttl`. El nombre local (`v:concurrency`) es el nombre de la página:

```turtle
v:concurrency a skos:Concept ;
  skos:inScheme v:vocabulario ;
  skos:prefLabel "Concurrency"@en ;
  skos:definition "How many runs go at the same time."@en ;
  skos:related v:run .
```

## Anclalo al código

Agregá un `doc:symbol` por cada símbolo del que habla el término, escrito como lo importa quien lo usa:

```turtle
doc:symbol "@kiri23/prompt-bench#Bench.concurrency" ;
```

## Usalo desde una página

Para listar el término al final de una página, sumalo a su `dct:references`:

```turtle
page:getting-started a doc:Page ;
  dct:references v:bench, v:concurrency .
```

## Generá y chequeá

```sh
deno task docs
deno task docs:check
```

Si el chequeo falla, su salida nombra el término o la página y dice por qué.

<!-- /as -->

## Probalo vivo: ida (agente) y vuelta (persona)

Mové el stepper de arriba con los botones del panel (ida: `window.agent.act`) **y después hacé clic en el paso 2 arriba como persona** (vuelta: mirá cómo `window.agent.snapshot()` actualiza `"value": 2` solo):

<!-- as: ui-demo paso="stepper" -->
Demo interactiva conectada al `<as-stepper>` real de esta página (`--components propios/ui-sdk-demos.js`).

## Qué dice el recorrido real (`test/stepper_agente.py`)

<!-- as: terminal command="window.agent sobre <as-stepper>" line-ms="90" exit="0" -->
```console
> window.agent.snapshot().find((e) => e.component === "stepper")
{"ref":"c1","component":"stepper","actions":["setValue","next","previous"],"label":"Pasos","value":1,"items":[{"value":"1","label":"Agregá el término"},{"value":"2","label":"Anclalo al código"},{"value":"3","label":"Usalo desde una página"},{"value":"4","label":"Generá y chequeá"}]}

> await window.agent.act({ steps: [{ ref: "Pasos", action: "setValue", args: [3] }] })
{"ok":true,"steps":[{"step":0,"ref":"c1","changes":[{"component":"stepper","label":"Pasos","key":"value","value":3}]}],"appeared":[],"values":{"c1 Pasos":3}}

> await window.agent.act({ steps: [{ ref: "Pasos", action: "setValue", args: [9] }] })
{"ok":false,"error":{"step":0,"message":"No step 9: this stepper has steps 1 to 4."},"steps":[],"appeared":[],"values":{"c1 Pasos":3}}

# La persona hace clic en "← Paso anterior" (pasa al paso 2):
> window.agent.snapshot().find((e) => e.component === "stepper").value
2
```

## Ojo con el import map: una sola copia de `@ui-sdk/core`

En `packages/docs-site/site.js:41-65`, tanto los elementos `ui-*` como los 3 archivos internos que usa `plugins/stepper.js` (`@ui-sdk/web/define-element`, `@ui-sdk/core/primitive`, `@ui-sdk/core/input-source`) entran por el mismo import map fijado a `@ui-sdk/core@0.1.0-beta.17`. Si hubiera dos copias de `@ui-sdk/core`, `defineStepper()` se registraría en una y `createAgent()` leería la otra: `window.agent.snapshot()` devolvería `[]`. `test/ui-sdk.test.mjs` verifica esto en CI sin abrir navegador.
