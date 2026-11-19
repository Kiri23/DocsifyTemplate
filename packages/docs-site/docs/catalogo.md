# Mostrar archivos del repo: el catálogo

Los docs de un repo tienen dos partes. Los **docs escritos** son las páginas que alguien escribe a
mano en `docs/`. El **catálogo** son archivos que ya existen en el repo y se muestran tal cual:
los `SKILL.md` de MyClaudeSkills, sus agentes, sus `.ttl`. Nadie los copia a mano: un patrón dice
cuáles entran, y `armar.mjs` los copia a `docs/_catalogo/`.

Después de armar, `docs/` tiene todo lo que el sitio muestra y nada más. Lo sirve cualquier
servidor estático (`python3 -m http.server`, GitHub Pages, Caddy) sin poder llegar al resto del
repo: un `harness/claude/settings.json` no está en `docs/`, así que da 404.

## La regla: `docs/incluir.txt`

Un patrón por línea, relativo a la raíz del repo. Las líneas vacías y las que empiezan con `#` no
cuentan.

```text
# Lo que se muestra tal cual, además de los docs escritos.
skills/*/SKILL.md
agents/*.md
**/*.ttl
bin/SCRIPTS.md
```

| Comodín | Qué toma | Ejemplo |
| --- | --- | --- |
| `*` | cualquier parte de un nombre, sin cruzar `/` | `skills/*/SKILL.md` |
| `**/` | cualquier cantidad de carpetas, también ninguna | `**/*.ttl` toma `proyecto.ttl` y `a/b/c.ttl` |
| `?` | un carácter | `agents/?.md` |

La regla vive en el repo que se muestra, no en DocsifyTemplate ni en un script de deploy: quien
cambia el repo ve qué se publica y lo cambia en el mismo PR.

## Armar

Desde la raíz del repo, con el armador fijado a un commit de DocsifyTemplate:

```sh
npx -y --package=github:Kiri23/DocsifyTemplate#<sha> docs-armar docs
python3 -m http.server -d docs 8000
```

```
3 archivos en docs/_catalogo/
```

El commit va fijo por la misma razón que el `index.html` fija `site.js` en rawcdn.githack: el repo
dice qué versión usa y una actualización de DocsifyTemplate no le cambia el sitio sin un PR. La
primera vez tarda unos segundos (npm baja el commit); después sale de la caché de npm. Anda sin
llaves ssh: npm prueba ssh y cae a https. Del paquete se instala solo `packages/docs-site/bin/`
(el campo `files` del `package.json` raíz), sin dependencias.

En el repo conviene una receta que lo diga una vez, por ejemplo en un `justfile`:

```make
docs:
    npx -y --package=github:Kiri23/DocsifyTemplate#<sha> docs-armar docs
```

`docs/_catalogo/` es generado: va en el `.gitignore`. Para GitHub Pages, el workflow arma antes
de publicar, y `docs/` necesita un `.nojekyll` (Jekyll ignora las carpetas que empiezan con `_`,
como ya pasa con `_sidebar.md`).

Desde DocsifyTemplate, sin npx:

```sh
npm run docs:armar -- ~/Code/MyClaudeSkills/docs
```

| Opción | Qué es | Si no está |
| --- | --- | --- |
| `--root` | la raíz del repo, de donde parten los patrones | la carpeta de arriba de `docs` |

## Qué queda afuera, siempre

- **Archivos y carpetas ocultos** (`.env`, `.git/`, `.github/`): no entran aunque un patrón los
  nombre.
- **Nada de fuera del repo.** Un patrón se compara con la lista de archivos del repo; nunca se
  arma un camino con él, así que `../*.md` no encuentra nada.
- **Un link que apunta afuera del repo** no entra. Uno que apunta adentro entra con el contenido
  del archivo al que apunta.
- **La propia carpeta `docs/`**: ya está en el sitio.
- `node_modules/`.

Es la misma lista que usa `serve.mjs` para decidir qué sirve (`bin/lib/files.mjs`).

## Cómo se ve cada archivo

| Archivo | En el catálogo |
| --- | --- |
| `.md` | la misma página. Si empieza con frontmatter (`---`), ese bloque se ve como código YAML: Docsify lo dibujaría como un título. |
| `.ttl` | una página `<archivo>.ttl.md` con el archivo entero en un bloque ` ```turtle `. |
| otro | igual que el `.ttl`, con el lenguaje de su extensión. |

Cada vez arma `docs/_catalogo/` desde cero: un archivo que ya no nombra ningún patrón desaparece.
Un patrón que no encuentra nada se avisa por la consola y el resto sigue.

## El menú

`armar` escribe dos páginas más en `_catalogo/`:

- `_sidebar.md`: el sidebar de las páginas del catálogo, con un link de vuelta a los docs y cada
  archivo agrupado por su primera carpeta. `site.js` lo usa para toda página bajo `/_catalogo/`; el
  resto del sitio sigue con el `_sidebar.md` de la raíz.
- `README.md`: la portada del catálogo, con los patrones de `incluir.txt` y la misma lista.

Para llegar desde los docs escritos, el `_sidebar.md` de la raíz suma una línea:

```md
* [Catálogo](/_catalogo/README.md)
```

Un archivo del repo que caería en `_catalogo/README.md` o `_catalogo/_sidebar.md` (un `README.md`
de la raíz, por ejemplo) hace fallar el armado con el motivo.

## Lo que falta

Los links relativos dentro de un archivo copiado apuntan a donde estaba en el repo. Si apuntan a
otro archivo del catálogo andan; si apuntan a uno que no entró, dan 404.
