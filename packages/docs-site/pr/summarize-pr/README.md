# summarize-pr @72199a8

Copias de [MeLlamoPablo/skills](https://github.com/MeLlamoPablo/skills/tree/72199a8/skills/summarize-pr)
(atribución en [NOTICE](../../../../NOTICE)). El conversor (`bin/pr.mjs`) lee el HTML de esa
plantilla como dato; estos archivos sirven para validar:

- `check.mjs`: el chequeo de summarize-pr, corrido sobre el HTML de entrada. Un solo cambio: busca
  `template.html` en esta carpeta.
- `shown-lines.mjs`: cómo cuenta las líneas mostradas de un diff (lo importa `check.mjs`).
- `template.html`: la plantilla. Es el ejemplo de cada bloque del catálogo, y
  `test/pr-catalogo.test.mjs` avisa si la de upstream cambió.

Para traer una versión nueva: copiá los tres archivos, repetí el cambio de `check.mjs` y actualizá
el commit aquí, en NOTICE y en el test.
