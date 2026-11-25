# stepper

Los pasos de una guía de a uno: puntos numerados arriba que muestran el orden y dónde estás, un
panel por paso y botones para ir y volver. El texto de la página no cambia: cada `##` es un paso.

Ejemplo: la guía "Add a term to the vocabulary" de prompt-bench.

<!-- as: stepper -->

## Agregá el término

Agregá un bloque a `docs/vocabulary.ttl`. El nombre local (`v:concurrency`) es el nombre de la
página:

```turtle
v:concurrency a skos:Concept ;
  skos:inScheme v:vocabulario ;
  skos:prefLabel "Concurrency"@en ;
  skos:definition "How many runs go at the same time."@en ;
  skos:related v:run .
```

## Anclalo al código

Agregá un `doc:symbol` por cada símbolo del que habla el término, escrito como lo importa quien lo
usa, sin archivo ni número de línea:

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

## Cómo se escribe

La marca va justo antes del primer `##`. Los pasos llegan hasta un título más grande (`#`), hasta
`<!-- /as -->` o hasta el final de la página:

```md
<!-- as: stepper -->

## Agregá el término
…
## Generá y chequeá
…

<!-- /as -->

## Cómo se escribe
```

En GitHub se ve la guía como siempre, un título por paso.

Los títulos de los pasos siguen en "On this page": un link a uno de ellos (desde ahí, desde la
búsqueda o desde otra página) abre su paso. Los bloques de código de cada paso son los de la
página, así que tienen su botón de copiar.

## Cuándo no se dibuja

- lo que sigue a la marca no es un `##`;
- hay un solo paso.

## Un agente lo usa

El stepper es un componente propio hecho como primitivo de [UI SDK](https://ui-sdk.dev/)
(`plugins/stepper.js`), así que un agente de IA lo ve y lo mueve con las herramientas de la
página, sin una herramienta escrita para él. En el `snapshot` aparece así:

```json
{ "component": "stepper", "label": "Pasos", "value": 1, "actions": ["setValue", "next", "previous"],
  "items": [{ "value": "1", "label": "Agregá el término" }, …] }
```

Y con `act` va al paso que pide:

```js
agent.act({ steps: [{ ref: "Pasos", action: "setValue", args: [3] }] })
```

Un paso que no existe se rechaza con los que hay (`this stepper has steps 1 to 4`). Lo que hace el
agente lo ve la persona, y al revés: los dos mueven el mismo estado.

## Cómo está hecho

UI SDK podría dibujarlo con sus propios elementos: `ui-tabs` ya trae la lista, las pestañas, los
paneles y las flechas. Está hecho con `definePrimitive` a propósito, como ejemplo de un componente
que UI SDK no trae (una terminal, un tablero, el glosario como tabla):

- `plugins/stepper.js` declara el estado (`value`, el paso abierto), sus partes (lista, pestaña,
  panel, anterior, siguiente) y lo que puede hacer un agente (`agent: { actions: [...] }`).
- `components/stepper.js` lee el Markdown como antes y dibuja los elementos `as-stepper-*`.
- `test/stepper_agente.py` lo prueba en Chromium, como persona y como agente.
