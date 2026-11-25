# Resúmenes de PR en el sitio

El skill [summarize-pr](https://github.com/MeLlamoPablo/skills/tree/72199a8/skills/summarize-pr) arma
una página HTML por PR: la historia, las decisiones, los diffs recortados, el flujo y los tests. El
sitio la muestra sin iframe, con su tema, y un agente la puede leer y usar desde la página.

## De la página de summarize-pr a la del sitio

Guardá el HTML como `docs/prs/<n>.html` y corré el conversor. Escribe `docs/prs/<n>.md` a su lado:

```bash
npm run docs:pr -- packages/docs-site/docs/prs/59.html
```

El Markdown lleva una marca `<!-- as: … -->` por bloque (`decision`, `diff`, `chart`, `tests`…), y el
código, los gráficos y los comentarios en bloques de código tal cual. En GitHub se lee como un
documento; en el sitio cada bloque es un componente de `components/pr/`. El HTML queda como "Ver el
original".

Antes de escribir, el conversor corre el chequeo de summarize-pr sobre la página y, después, compara
el Markdown con ella: los mismos bloques, cada texto y cada dato byte a byte. Un bloque que no es de
la plantilla (ni un bloque libre) lo hace fallar. `--check` no escribe nada y falla si un `.md` no
está al día; CI lo corre.

## Lo que ve un agente

Los componentes usan elementos de [UI SDK](https://ui-sdk.dev) (acordeón, colapsable, control
segmentado), y la página crea su agente. Desde la consola, una extensión o Playwright:

```js
window.agent.snapshot()   // las decisiones, el control Split/Unified, los tests por archivo
await window.agent.act({ steps: [{ ref: "Diff layout", action: "setValue", args: ["unified"] }] })
window.pageText.read({ section: "Tests" })   // la prosa: por qué, trade-off, notas, términos
```

`window.agent` es el agente de UI SDK tal cual; `read` es del sitio y va aparte, en `window.pageText`: el
snapshot de UI SDK trae el estado de cada componente, no lo que dice. En un navegador con WebMCP
(`document.modelContext`), la página registra las cuatro.

Para un agente de afuera (Claude Code, Codex), la página es un servidor MCP con esas cuatro
herramientas y ninguna más:

```bash
python3 packages/docs-site/agente/pagina_mcp.py packages/docs-site/docs --page prs/59
```

El eval `docsify-pr-agente` de prompt-bench le da a un modelo solo ese servidor y le hace cinco
preguntas sobre #59; código compara las respuestas.
