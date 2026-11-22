# terminal

Una ventana de terminal para mostrar la salida de un comando. Por defecto se dibuja estática (toda
la salida de golpe, sin timers ni botones de reproducción); si le pasás `line-ms="95"`, imprime
línea por línea al entrar en pantalla.

## Ejemplos

### Salida estática

La primera línea que empieza con `$ ` sube a la barra superior; el resto queda como salida. El botón
`Copy` copia el comando listo para pegar en una shell.

<!-- as: terminal exit="0" -->
```console
$ npm run check:docs -- packages/docs-site/docs
5 marcas, todas se dibujan.
```

### Prototipo

Con `estado="prototipo"` la ventana avisa que la salida todavía es simulada, y `nota` deja un pie
discreto debajo del bloque. Si pasás `command="..."`, el texto del bloque queda intacto.

<!-- as: terminal command="kiri-pm status --resumen" estado="prototipo" exit="0" nota="Salida simulada para revisar columnas antes de implementar el comando." -->
```console
Área          Pendientes  En curso
──────────────────────────────────
Docsify                2         1
MyClaudeSkills         4         0
```

### Animada con `line-ms`

Con `line-ms="95"` aparece línea por línea cuando el lector llega al bloque, con `Show all` y
`Replay`. Las barras `█` se resaltan, las líneas `…` salen atenuadas con una pausa más larga y el
inicio de una caja Unicode toma una pausa breve tras una línea en blanco. Si el sistema tiene
`prefers-reduced-motion: reduce`, el bloque cae al modo estático sin animar.

<!-- as: terminal line-ms="95" -->
```console
$ bench run --quick
Preparando 3 corridas...
…

┌─ Resumen ────────────────────────────┐
│ limpio     ██████████  100%          │
│ base       ████░░░░░░   40%          │
└──────────────────────────────────────┘
```

## Cómo se escribe

Una marca sobre un bloque de código cercado. En GitHub se lee como un bloque `console` común.

````md
<!-- as: terminal exit="0" -->
```console
$ kiri-pm status
Inbox: 3
```
````

Los atributos de la marca son todos opcionales:

| Atributo | Qué hace | Si no está |
| --- | --- | --- |
| `command` | el comando que va en la barra (deja el bloque entero como salida) | toma la primera línea si empieza con `$ ` y hay salida debajo; si no, muestra `terminal` |
| `line-ms` | pausa base en milisegundos para animar línea por línea (`0` = estático) | `0` (estático, sin botones de reproducción) |
| `exit` | código de salida (`0` a `255`), como badge en la barra | no se muestra |
| `estado` | marca el estado de la salida (por ahora `prototipo`) | salida normal |
| `nota` | pie discreto debajo del bloque | no se muestra |

Detalles a tener en cuenta:

- La primera línea `$ ` solo sube a la barra si hay al menos una línea de salida debajo, no termina
  en `\` y no hay otras líneas `$ ` en el bloque (una sesión con varios comandos se queda entera en
  el cuerpo).
- Si el comando lleva comillas dobles (`git commit -m "fix"`), escribilo como primera línea `$ `
  dentro del bloque: los atributos de una marca no admiten `"` adentro.
- `Copy` copia el comando sin `$ ` cuando hay comando; si el bloque no tiene comando, copia toda la
  salida.
- Todavía no se puede anidar un `terminal` dentro de un `stepper`: el stepper mueve los bloques del
  Markdown antes de que se monte la marca interna.

## Cuándo no se dibuja

El sitio deja el Markdown como está, y la consola dice por qué, cuando:

- lo que sigue a la marca no es un bloque de código;
- el bloque de código está vacío;
- `line-ms` no es `0` ni un entero positivo;
- `exit` no es un entero entre `0` y `255`;
- `estado` no es uno de los valores permitidos (`prototipo`);
- `command` o `nota` vienen vacíos, o la marca trae un atributo desconocido (por ejemplo `lineMs` en
  vez de `line-ms`).

`npm run check:docs` encuentra esos casos sin abrir el navegador.
