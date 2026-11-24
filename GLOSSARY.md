# DocsifyTemplate

Sitios de documentación interactivos sin paso de build: el Markdown de un repo se ve como sitio tal cual.

## El sitio

**site.js**:
El Docsify de este repo ya armado, que un sitio carga con un solo script: Docsify 5, el tema, el import map y los componentes.
_Avoid_: el loader, el script de Docsify

## Exportar

**Motor**:
La parte que convierte una página (de Markdown a Typst o PDF) sin saber si corre en la terminal o en el navegador.
_Avoid_: core, engine

**Transporte**:
La parte que lleva el Motor a un lugar donde corre (la terminal, el navegador, un sitio Docsify) y le da sus engines.
_Avoid_: adapter, wrapper

**engines**:
Las herramientas con las que el Motor convierte (pandoc, el compilador de Typst), que cada Transporte da a su manera.
_Avoid_: motores, backends
