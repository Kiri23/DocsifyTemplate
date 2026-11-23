# DocsifyTemplate

Sitios de documentación interactivos sin paso de build:
- **`packages/docs-site/`**: Docsify 5 + tema `prompt-bench` + Preact/signals por import map + componentes que leen el propio Markdown marcado con `<!-- as: nombre -->`. Fuente única de verdad del sitio publicado en <https://doctemplate.kiri231.com/>.
- **`packages/docs-export/`**: Exportación de páginas Markdown a Typst (`.typ`) y PDF (`.pdf`), separada en `motor/` (sin Node ni browser) y `transportes/node/` (`npm run docs:exportar`).
- **`packages/chat/`**: `@docsify-template/chat`, widget de chat IA en el navegador con inferencia WebGPU (`@huggingface/transformers`), Web Worker dedicado y adaptador para Docsify. Independiente de `docs-site`.

## Comandos

```bash
npm ci --ignore-scripts
npm test
npm run check:docs -- packages/docs-site/docs --components packages/docs-site/docs/propios/retro-semanal.js
npm run serve                                        # → http://localhost:3010/packages/docs-site/docs/
npm run docs:serve -- <carpeta> [--home README.md]   # → http://localhost:3011/
npm run docs:armar -- <carpeta-docs> [--check]
npm run docs:exportar -- <archivo.md> [--out <ruta.typ|ruta.pdf>]
```

## Estructura

```text
DocsifyTemplate/
├── packages/
│   ├── docs-site/
│   │   ├── site.js          # Entrada en una línea (import map, tema, plugins, componentes)
│   │   ├── as/              # Parser de marcas <!-- as: ... -->, shapes, helpers Typst y montaje Preact
│   │   ├── components/      # Componentes integrados (annotated-block, option-picker, stepper, terminal)
│   │   ├── plugins/         # file-links.js
│   │   ├── theme/           # Tema prompt-bench (tokens.css, plugins, store)
│   │   ├── bin/             # CLIs: serve.mjs, check.mjs, armar.mjs (+ lib/)
│   │   ├── docs/            # Docs y showcase del paquete (incl. propios/retro-semanal.js)
│   │   └── test/            # Suite Node (`node --test`) + recorrido opcional en Chromium
│   ├── docs-export/
│   │   ├── motor/           # Núcleo agnóstico (Export, expansión de componentes, mermaid, Pandoc)
│   │   ├── templates/       # Plantilla Typst branded.typ
│   │   ├── filters/         # Filtro Lua mermaid-placeholder.lua
│   │   ├── transportes/     # Transporte Node (engines.js, bin/exportar.mjs)
│   │   └── test/            # Suite Node (`node --test`)
│   └── chat/
│       ├── index.js
│       ├── core/            # chat-engine.js, worker.js (WebGPU)
│       ├── ui/              # chat-dom.js
│       └── adapters/        # docsify.js
├── deploy/
│   ├── Dockerfile           # Caddy estático sirviendo packages/docs-site/docs + runtime
│   ├── Dockerfile.dockerignore
│   ├── Caddyfile
│   ├── compose.prod.yaml
│   └── smoke-image.mjs      # Prueba de humo de la imagen (allowlist exacto, headers, 404)
└── .github/workflows/
    ├── deploy.yml           # PR: tests + build + smoke; main: publish GHCR + deploy VPS
    ├── fichas.yml           # Valida proyecto.ttl
    └── kiri-pm.yml          # Sincroniza issues/PRs al Project #9
```

## Reglas clave

- **Sin colores fuera de `tokens.css`:** Todo valor de color (`#hex`, `rgb(...)`, colores nombrados) en `packages/docs-site/` vive únicamente en `packages/docs-site/theme/tokens.css`. Lo hace cumplir `packages/docs-site/test/theme.test.mjs`.
- **Sin build:** El navegador carga `packages/docs-site/` tal cual vía ESM e import map en `site.js`.
- **El Markdown es el dato:** Los componentes en `packages/docs-site/components/` son objetos `{ name, takes, attrs, read, view }` donde `read` transforma nodos DOM del Markdown en props (o lanza `ShapeError`) y `view` es una función Preact pura. `bin/check.mjs` ejecuta el mismo `read` en Node con `marked` + `linkedom`.
- **Deploy automático en `main`:** `.github/workflows/deploy.yml` publica y despliega a `https://doctemplate.kiri231.com/` en cada push a `main` que toque `packages/docs-site/**`, `package*.json`, `deploy/*` o `deploy.yml`. No trabajar directo sobre `main`.
