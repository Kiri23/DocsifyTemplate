# docs-site

Una carpeta de Markdown se vuelve un sitio de docs sin build: el tema de
[prompt-bench](https://github.com/Kiri23/prompt-bench) (Docsify 5, Preact y signals desde esm.sh) y
componentes que salen del mismo Markdown.

**El Markdown es el dato.** Una tabla, un bloque de código con su lista o una serie de `##` ya dicen
lo que el componente necesita. Cuando la forma sola no alcanza para saber qué componente va, una
marca invisible lo dice:

```md
<!-- as: option-picker label="isolation" -->
| Lo que ve la corrida | `clean` | `none` |
| -------------------- | ------- | ------ |
| tu login             | sí      | sí     |
```

GitHub no muestra el comentario y deja la tabla como tabla. El sitio la convierte en el selector.
Sin MDX ni YAML.

## Los componentes

| Componente | La forma del Markdown | De qué prototipo viene |
| --- | --- | --- |
| [annotated-block](componentes/annotated-block.md) | un bloque de código y una lista numerada | leaderboard v1 |
| [option-picker](componentes/option-picker.md) | una tabla: una columna por valor, celdas sí/no | harness-vs-endpoint v4 |
| [stepper](componentes/stepper.md) | un `##` por paso | tutorial-stepper v1 + v3 |

Los tres vienen de los prototipos que gustaron en prompt-bench#25.

## Servirlo

- Los docs de este paquete: `npm run serve` en la raíz de DocsifyTemplate y abrir
  <http://localhost:3010/packages/docs-site/docs/>.
- Los de otro repo, sin copiarle nada: [Servir los docs de otro repo](servir-otro-repo.md).
