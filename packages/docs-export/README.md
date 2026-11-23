# docs-export

Convierte una página Markdown (con sus componentes `<!-- as: … -->`) en Typst (`.typ`) o PDF.
El `.typ` es para agentes: texto plano que pueden leer y editar. El PDF es para personas.

| Carpeta | Qué hace |
|---|---|
| `motor/` | `Export.ofMarkdown(md)…toTypst(engines)` / `.toPdf(engines)`. No toca Node ni el navegador. |
| `transportes/node/` | `systemEngines()`: `pandoc` y `typst` instalados en la máquina. CLI `npm run docs:exportar`. |
| `transportes/browser/` | `browserEngines({ pandocWasmUrl })`: pandoc.wasm y typst.ts, descargados la primera vez que se usan. |
| `transportes/docsify/` | `exportButton({ engines })`: plugin de Docsify 5 con los botones "Descargar .typ" y "Descargar .pdf". |

## Desde la terminal

```bash
npm run docs:exportar -- packages/docs-site/docs/componentes/terminal.md --out terminal.typ
npm run docs:exportar -- packages/docs-site/docs/componentes/terminal.md --out terminal.pdf   # necesita typst
```

## Botón en un sitio Docsify (site.js)

El plugin no viene prendido. Un sitio lo prende con un módulo suyo que nombra en
`pluginModules`, y `site.js` lo carga antes de que arranque Docsify:

```html
<div id="app"></div>
<script>window.$docsify = { name: "Mi sitio", pluginModules: ["propios/exportar.js"] };</script>
<script src="https://cdn.jsdelivr.net/gh/Kiri23/DocsifyTemplate@<tag>/packages/docs-site/site.js"></script>
```

```js
// propios/exportar.js: cada export de este módulo es un plugin de Docsify.
import * as componentes from "docs-site/components/mod.js";
import { browserEngines } from "https://cdn.jsdelivr.net/gh/Kiri23/DocsifyTemplate@<tag>/packages/docs-export/transportes/browser/mod.js";
import { exportButton } from "https://cdn.jsdelivr.net/gh/Kiri23/DocsifyTemplate@<tag>/packages/docs-export/transportes/docsify/mod.js";

export const exportar = exportButton({
  engines: browserEngines({ pandocWasmUrl: "https://<tu-host>/pandoc.wasm" }),
  components: Object.values(componentes),
});
```

- **`pandoc.wasm` lo sirve tu sitio.** Pesa unos 56 MB y nunca entra a git (`*.wasm` está en
  `.gitignore` y `packages/docs-site/test/git-file-size.test.mjs` corta a los 2 MB). Bajalo de
  `pandoc-<versión>-wasm.zip` en <https://github.com/jgm/pandoc/releases> y servilo desde un host con
  CORS (por ejemplo, Caddy en tu VPS). jsDelivr no sirve archivos de más de 50 MB.
- **Typst** se baja de jsDelivr (`@myriaddreamin/typst-all-in-one.ts`) solo al pedir un PDF. Otra
  dirección: `browserEngines({ pandocWasmUrl, typstUrl })`.
- **Componentes:** los que tienen vista `typstPDF` (hoy `terminal`) salen como Typst nativo; el resto,
  como el Markdown de la página. Se leen con el mismo parser con el que Docsify dibujó la página (`window.marked`).
- **Mermaid:** si la página dibujó sus diagramas, el PDF los lleva como imagen. Si no, quedan como
  bloque de código; si faltan algunos, cada uno que falta deja una nota visible y un aviso en la consola.
- **¿Por qué no un `<script type="module">` en la página?** Si va antes de `site.js`, Firefox
  ignora el import map. Si va después, Docsify puede haber arrancado sin el plugin.
