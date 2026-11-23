# DocsifyTemplate

Sitios de documentación interactivos sin paso de build sobre Docsify 5 y componentes que leen el
propio Markdown (`<!-- as: componente -->`), más un widget de chat IA en el navegador (WebGPU).

Sitio en producción: <https://doctemplate.kiri231.com/> (construido y servido desde
[`packages/docs-site/`](packages/docs-site/README.md)).

## Paquetes

| Paquete | Qué es |
| --- | --- |
| [`packages/docs-site`](packages/docs-site/README.md) | Docsify 5 + tema prompt-bench + componentes Preact sin build (`site.js`, `as/`, `components/`, `theme/`, `plugins/`, CLIs `serve.mjs`, `check.mjs`, `armar.mjs`). |
| [`packages/chat`](packages/chat/package.json) | Widget de chat IA en el navegador con inferencia WebGPU (`@huggingface/transformers`), worker dedicado y adaptador para Docsify. |

## Uso rápido

```sh
# Servir los docs de docs-site en local
npm run serve
# → http://localhost:3010/packages/docs-site/docs/

# Servir la carpeta de Markdown de otro repo sin copiar nada
npm run docs:serve -- ~/Code/MyClaudeSkills --home bin/SCRIPTS.md
# → http://localhost:3011/

# Validar marcas <!-- as: ... --> sin navegador
npm run check:docs -- packages/docs-site/docs --components packages/docs-site/docs/propios/retro-semanal.js

# Armar el catálogo (_catalogo/) desde docs/incluir.txt
npm run docs:armar -- ~/Code/MyClaudeSkills/docs

# Correr la suite de tests
npm test
```

## Publicar docs de otro repo en una línea

```html
<!DOCTYPE html>
<meta charset="UTF-8" />
<div id="app"></div>
<script>
  window.$docsify = { name: "MiRepo", homepage: "README.md" };
</script>
<script src="https://rawcdn.githack.com/Kiri23/DocsifyTemplate/<sha-o-tag>/packages/docs-site/site.js"></script>
```

Más detalle en [`packages/docs-site/README.md`](packages/docs-site/README.md) y
[`packages/docs-site/docs/servir-otro-repo.md`](packages/docs-site/docs/servir-otro-repo.md).

## Estructura

```text
DocsifyTemplate/
├── packages/
│   ├── docs-site/       # Runtime Docsify 5, tema, componentes, CLIs y docs del showcase
│   └── chat/            # Chat IA en el navegador (WebGPU + adaptador Docsify)
├── deploy/              # Dockerfile (Caddy), Caddyfile, compose.prod.yaml y smoke-image.mjs
└── .github/workflows/   # CI y deploy automático a doctemplate.kiri231.com en push a main
```
