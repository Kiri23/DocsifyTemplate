# docs-site

Una carpeta de Markdown se vuelve un sitio de docs, sin build y sin copiar nada en ella. Es el tema
de prompt-bench (Docsify 5, Preact y signals por import map) más componentes que salen del mismo
Markdown con una marca invisible, `<!-- as: componente -->`. Los docs de este paquete están en
[`docs/`](docs/README.md) y se sirven con él mismo.

```sh
npm run serve                                   # → http://localhost:3010/packages/docs-site/docs/
npm run docs:serve -- ~/Code/MyClaudeSkills --home bin/SCRIPTS.md   # otro repo → http://localhost:3011/
npm run check:docs -- ~/Code/MyClaudeSkills     # las marcas de una carpeta, sin navegador
npm test                                        # node --test: marcas, formas, componentes, colores
python3 packages/docs-site/test/en_el_navegador.py packages/docs-site/docs   # cada página en Chromium
```

## Archivos

| Archivo | Qué es |
| --- | --- |
| `site.js` | El sitio en una línea: config por defecto, tema, import map, plugins. Lo carga el `index.html` de cualquier repo. |
| `theme/` | El tema de prompt-bench tal cual (su README dice de qué commit), más el CSS de los componentes. |
| `as/mod.js` | El plugin de Docsify: cada `<!-- as: nombre -->` de la página se vuelve su componente. |
| `as/core.js` | Lo mismo sin navegador: encontrar las marcas, leerlas y preparar las props. Lo usan el plugin y `check.mjs`. |
| `as/shapes.js` | Las formas de Markdown que toma un componente: `sequence("pre", "ol")`, `section("h2")`. |
| `components/` | Un archivo por componente: `annotated-block`, `option-picker`, `stepper`. |
| `plugins/file-links.js` | Un link sin `.md` abre el archivo, como en GitHub. |
| `bin/serve.mjs` | Sirve una carpeta de otro repo con este paquete, en un origen. |
| `bin/check.mjs` | Revisa las marcas de una carpeta con marked y linkedom, sin navegador. |
| `test/` | Los tests de Node y el recorrido en Chromium. |

## Un componente

Un objeto con nombres. La marca dice el nombre; la forma dice qué Markdown toma; `read` lo convierte
en props y tira `ShapeError` con la razón si no encaja; `view` es una función Preact que solo
conoce sus props.

```js
export const optionPicker = {
  name: "option-picker",
  takes: sequence("table"),
  attrs: ["label", "default", "in", "out"],
  read([table], attrs) { /* … */ return { options, rows }; },
  view: OptionPicker,
};
```

Si la forma no encaja, el nombre no existe, la marca trae un atributo que el componente no conoce o
la vista falla, la página muestra el Markdown tal cual y la consola dice por qué. `check.mjs` corre
el mismo `read` en Node, así que lo que pasa el chequeo es lo que el sitio dibuja.

## Por qué convive con `docs-engine`

`packages/docs-engine` no se toca. Los dos comparten la idea central: un componente es una función
Preact pura que recibe datos y no sabe quién la monta. Cambia de dónde salen los datos:

| | `docs-engine` | `docs-site` |
| --- | --- | --- |
| El dato | YAML dentro de un fence (` ```entity-schema `) | el Markdown mismo: una tabla, un bloque, unos `##` |
| En GitHub | un bloque de YAML | la tabla, el bloque, la guía |
| Cuándo convierte | `beforeEach`, sobre el texto, con unified | `doneEach`, sobre el HTML que Docsify ya dibujó |
| Docsify | 4 | 5 |
| Build | esbuild, se publica en npm | ninguno: el navegador carga los archivos |

Reemplazar `docs-engine` rompería sus páginas YAML y su export a PDF; montarse encima obligaría a
pasar este paquete por su build y a quedarse en Docsify 4. Conviviendo, cada uno sigue andando y
un componente de `docs-engine` puede pasar a este lado cuando tenga una forma de Markdown (la tabla
de `fable-markdown-to-components.md` dice cuál le toca a cada uno).
