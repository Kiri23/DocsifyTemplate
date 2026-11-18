# annotated-block

Un bloque de código con notas numeradas sobre sus partes. Al pasar sobre un número (o enfocarlo con
el teclado, o tocarlo) se enciende su nota, y al revés.

## Ejemplo

El leaderboard que imprime prompt-bench al terminar una corrida:

<!-- as: annotated-block -->
```
┌─ Prompt versions ──────────────────────────────────────────┐
│  Version                     score      Δ vs base  effect
├────────────────────────────────────────────────────────────
│  labels                       100±0     +100%  ✅ improves
│  naive                          0±0  (baseline)
└────────────────────────────────────────────────────────────┘

ran with  codex-cli · model gpt-5.6-luna · isolation clean
```
1. `score`: el promedio de las corridas de cada versión, de 0 a 100.
2. `±0`: la dispersión entre corridas. ±0 es que todas sacaron lo mismo.
3. `Δ vs base`: la diferencia con la primera versión, la línea base.
4. `effect`: cómo leer Δ: 20 o más mejora, entre 5 y 19 es marginal, dentro de ±5 es igual.
5. `(baseline)`: la versión contra la que se comparan las demás.
6. `ran with`: con qué se midió: el CLI, el modelo y el aislamiento.

## Cómo se escribe

Una marca, un bloque de código y, justo debajo, una lista numerada. Cada punto empieza con un trozo
del bloque entre backticks; lo que sigue es la nota.

````md
<!-- as: annotated-block -->
```
│  labels      100±0     +100%  ✅ improves
```
1. `100±0`: la media ± la dispersión de las corridas
2. `+100%`: la diferencia con la línea base
````

En GitHub se ve el bloque y la lista: la misma información, sin los globos.

Cada trozo se busca en el bloque después del anterior, así que la lista sigue el orden del bloque y
dos notas pueden nombrar el mismo texto en lugares distintos.

## Cuándo no se dibuja

El sitio deja el Markdown como está, y la consola dice por qué, cuando:

- lo que sigue a la marca no es un bloque de código y una lista numerada;
- un punto de la lista no empieza con un trozo entre backticks;
- un trozo no está en el bloque.

`npm run check:docs` encuentra esos casos sin abrir el navegador.
