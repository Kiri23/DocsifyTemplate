# Servir los docs de otro repo

Un repo con una carpeta de Markdown puede servirla con este tema y estos componentes sin copiar
nada del tema adentro. Hay dos caminos: en tu máquina, sin tocar el repo, y publicado, con un
archivo de cinco líneas.

## En tu máquina, sin tocar el repo

Desde la raíz de DocsifyTemplate:

```sh
node packages/docs-site/bin/serve.mjs ~/Code/MyClaudeSkills --home bin/SCRIPTS.md
```

```
MyClaudeSkills: http://localhost:3011/  (carpeta /Users/…/MyClaudeSkills, portada bin/SCRIPTS.md)
```

Sirve en un solo origen la carpeta en `/` y este paquete en `/_docs-site/`, y arma el
`index.html` que carga `site.js`. Si la carpeta no tiene `_sidebar.md`, le arma uno con sus `.md`,
agrupados por la primera carpeta.

| Opción | Qué es | Si no está |
| --- | --- | --- |
| `--home` | la página de entrada, desde la raíz de la carpeta | `README.md` |
| `--name` | el nombre arriba a la izquierda | el nombre de la carpeta |
| `--repo` | el link a GitHub de la barra | sin link |
| `--port` | el puerto | 3011 |
| `--components` | un módulo de componentes propios, dentro de la carpeta ([Traer tu propia UI](traer-tu-ui.md)); uno por flag | solo los de fábrica |

Solo sirve archivos que existen dentro de la carpeta: una ruta se busca en la lista de archivos,
nunca se arma un camino con ella, así que `/../` da 404.

Sirve todo lo visible de la carpeta. Para publicar solo una parte (los docs escritos y algunos
archivos elegidos del repo), el repo arma su `docs/` con
[el catálogo](catalogo.md) y lo sirve un servidor estático.

## Publicado, con un archivo

El repo suma un `index.html` en la carpeta que publica (GitHub Pages, por ejemplo). El tema sale de
DocsifyTemplate por un CDN de GitHub, fijado a un tag o a un commit:

```html
<!DOCTYPE html>
<meta charset="UTF-8">
<div id="app"></div>
<script>window.$docsify = { name: "MyClaudeSkills", homepage: "bin/SCRIPTS.md" };</script>
<script src="https://cdn.jsdelivr.net/gh/Kiri23/DocsifyTemplate@<tag>/packages/docs-site/site.js"></script>
```

jsDelivr funciona para cualquier commit desde `#46` en adelante (cuando salió `pandoc.wasm.bak`, de
58 MB, y el repo bajó del tope de 50 MB de jsDelivr). Para commits anteriores, o como alternativa,
`https://rawcdn.githack.com/Kiri23/DocsifyTemplate/<tag>/packages/docs-site/site.js` también sirve:
`site.js` toma la base de su propia URL, así que nada más cambia.

Y un `_sidebar.md` al lado, con links que empiezan en `/` (el sidebar se ve en todas las páginas).
`serve.mjs` lo inventa cuando falta; un hosting estático no, y Docsify lo pide igual. Sin sidebar,
`loadSidebar: false` en la config.

```md
* [Scripts](/bin/SCRIPTS.md)
* [Cómo se instalan](/conducta/reference/scripts.md)
```

Lo que el repo pone en `window.$docsify` es la config de Docsify de siempre y gana sobre la de
`site.js`. Sus `plugins` van después de los del tema. Para reemplazar el link automático de `repo`
en la barra superior (por ejemplo, si el repo tiene una landing en `/` y los docs en `./`), pasá
`navLinks`:

```html
<script>
  window.$docsify = {
    name: "prompt-bench",
    navLinks: [
      { text: "Home", href: "/" },
      { text: "Docs", href: "./" },
      { text: "GitHub", href: "https://github.com/Kiri23/prompt-bench" },
    ],
  };
</script>
```

Si `navLinks` se omite, la barra enlaza a `repo` como `"GitHub"` (o no muestra links sin `repo`);
con `navLinks: []` oculta los links aunque `repo` esté definido.

## Los links a archivos

En GitHub, un link a `kiri-pm` o a `../scripts.ttl` abre el archivo. En el sitio también: un link
relativo que no termina en `.md` apunta al archivo, desde la carpeta de la página. Los links que
terminan en `.md` son páginas del sitio.

## Ser dueño de la lista de plugins

`site.js` es un atajo. Para sacar un plugin o cambiar el orden, el `index.html` escribe lo mismo a
mano: el CSS del tema, el import map y la lista. Es el `index.html` de los docs de prompt-bench, con
estas líneas en la lista:

```js
import { asComponents } from "<base>/as/mod.js";
import { annotatedBlock, optionPicker, stepper, terminal } from "<base>/components/mod.js";
import { fileLinks } from "<base>/plugins/file-links.js";

import { retroSemanal } from "./propios/retro-semanal.js"; // los tuyos, importados como cualquiera

window.$docsify.plugins = [
  topNav(), sidebarSections(), fileLinks(),
  asComponents([annotatedBlock, optionPicker, stepper, terminal, retroSemanal]), // antes de onThisPage y codeWindow
  onThisPage(), prevNext(), codeWindow(),
];
```

`asComponents` va antes de `onThisPage` y `codeWindow` porque mueve títulos y bloques de código de
la página, y esos dos los leen después. Si tus componentes importan `docs-site/…`, sumá
`"docs-site/": "<base>/"` al import map, como hace `site.js`.

## Revisar las marcas sin navegador

```sh
npm run check:docs -- ~/Code/MyClaudeSkills
npm run check:docs -- ~/Code/MyClaudeSkills/docs --components ~/Code/MyClaudeSkills/docs/propios/retro.js
```

Recorre los `.md` de la carpeta y, por cada `<!-- as: … -->`, hace lo mismo que el sitio: busca el
componente, junta el Markdown que toma y lo lee. Si algo no encaja, dice archivo, línea y por qué,
y sale con 1. Con `--components` suma los componentes del repo, y el JSON que nombra una marca lo
lee del disco, al lado de la página.
