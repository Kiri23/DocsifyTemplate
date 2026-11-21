# Traer tu propia UI

Un repo que usa este sitio puede sumar sus propios componentes a los de fábrica, y uno de ellos
puede ser una página entera: una vista que dibuja un JSON y reemplaza el cuerpo de la página. Cada
página es una configuración, y el menú lateral elige cuál se ve. Ejemplo: las páginas
[Semana 46](propios/semana-46.md) y [Semana 47](propios/semana-47.md) de estos docs, dibujadas por
[`propios/retro-semanal.js`](propios/retro-semanal.js).

## 1. Escribí el componente

Un módulo cuyos exports son componentes, con la misma forma que los de fábrica. Importa por el
import map de `site.js`: `preact`, `preact/hooks`, `@preact/signals`, `htm/preact` y `docs-site/`.

```js
// docs/propios/retro-semanal.js
import { html } from "htm/preact";
import { page, ShapeError } from "docs-site/as/mod.js";

export const retroSemanal = {
  name: "retro-semanal",
  takes: page().json("src"),   // el resto de la página, más el JSON que nombra src=""
  attrs: [],
  read({ nodes, attrs, data }) {
    if (typeof data?.semana !== "string") throw new ShapeError('retro-semanal necesita "semana"');
    return { semana: data.semana, metas: data.metas };
  },
  view: ({ semana, metas }) => html`<h2>${semana}</h2>…`,
};
```

`page()` toma todo lo que hay debajo de la marca; lo de arriba (un título) se queda. Con
`.json("src")` el sitio lee el archivo antes de dibujar y se lo pasa a `read` como `data`. Si falta,
no es JSON o `read` tira `ShapeError`, la página muestra su Markdown y la consola dice por qué.
Cualquier forma acepta `.json()`: `sequence("table").json("datos")` también vale.

Cada export del módulo tiene que ser un componente. Un nombre que ya existe (uno de fábrica u otro
tuyo) es un error: el componente no se suma y la consola lo dice.

## 2. Nombralo en el index.html

Rutas relativas al `index.html`, en la config de Docsify, antes de cargar `site.js`:

```html
<script>
  window.$docsify = { name: "MyClaudeSkills", components: ["propios/retro-semanal.js"] };
</script>
<script src="https://rawcdn.githack.com/Kiri23/DocsifyTemplate/<sha>/packages/docs-site/site.js"></script>
```

## 3. Una página por configuración

Cada página es la marca, con su JSON al lado. El párrafo de abajo es lo que muestra GitHub:

```md
# Retro: semana 47

<!-- as: retro-semanal src="semana-47.json" -->

En el sitio esta página la dibuja retro-semanal con semana-47.json.
```

## 4. Chequealo sin navegador

`check.mjs` importa los mismos módulos y lee los JSON del disco: cada marca que pasa es una que el
sitio dibuja. Un JSON que git no versiona falla, porque publicado sería un 404.

```sh
node packages/docs-site/bin/check.mjs docs --components docs/propios/retro-semanal.js
node packages/docs-site/bin/serve.mjs docs --components docs/propios/retro-semanal.js
```
