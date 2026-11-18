# option-picker

Elegís un valor de una opción y cada pieza cae por el filtro o se queda afuera. Sirve para cualquier
flag de un CLI que deja pasar unas cosas y otras no.

## Ejemplo

La opción `isolation` de un harness de prompt-bench: qué parte de tu máquina llega a una corrida.

<!-- as: option-picker label="isolation" default="clean" in="Llega a la corrida" out="Se queda en tu máquina" -->
| Lo que ve la corrida | `clean` | `hermetic` | `none` |
| --- | --- | --- | --- |
| tu login | sí | no: un login propio bajo `root` | sí |
| tus settings | no | no: su propia carpeta de config | sí |
| plugins | no | no | sí |
| servidores MCP | no | no | sí |
| `CLAUDE.md` y `AGENTS.md` | no | no | sí |
| tu carpeta de trabajo | no: una carpeta vacía propia | no: una carpeta bajo `root` | sí |

## Cómo se escribe

Una tabla. La primera columna nombra las piezas; cada otra columna es un valor de la opción. Cada
celda empieza con `sí` o `no`. Un `no: algo` dice que la pieza se queda afuera y que en su lugar
llega ese algo.

```md
<!-- as: option-picker label="isolation" default="clean" -->
| Lo que ve la corrida | `clean` | `none` |
| -------------------- | ------- | ------ |
| tu login             | sí      | sí     |
| plugins              | no      | sí     |
```

En GitHub es una tabla comparativa que se lee sola.

Los atributos de la marca solo cambian cómo se ve, porque en GitHub no se ven:

| Atributo | Qué hace | Si no está |
| --- | --- | --- |
| `label` | el nombre de la opción, sobre los botones | el encabezado de la primera columna |
| `default` | el valor elegido al abrir la página | la primera columna de valores |
| `in` | el título de lo que pasa | Pasa |
| `out` | el título de lo que se queda | Se queda afuera |

También vale `yes`, `si`, `✓` y `✅` por sí, y `✗` y `❌` por no.

## Cuándo no se dibuja

- la tabla tiene menos de dos columnas de valores;
- una celda no empieza con sí o no;
- `default` no es una de las columnas;
- la marca trae un atributo que el componente no conoce.
