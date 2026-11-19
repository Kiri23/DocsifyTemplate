#!/usr/bin/env node
// Builds a docs folder's catalog: copies the files of the repo that <docs>/incluir.txt names into
// <docs>/_catalogo/, rebuilt from scratch, with a menu. Afterwards the docs folder holds everything
// the site shows and nothing else, so any static server can serve it:
//
//   node packages/docs-site/bin/armar.mjs docs
//   python3 -m http.server -d docs
//
// From another repo, pinned to a commit of DocsifyTemplate (packages/docs-site/docs/catalogo.md):
//
//   npx -y --package=github:Kiri23/DocsifyTemplate#<sha> docs-armar docs
import { parseArgs } from "node:util";
import { relative } from "node:path";
import { buildCatalog, CATALOG } from "./lib/catalog.mjs";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { root: { type: "string" } },
});
if (positionals.length !== 1) {
  console.error("uso: armar.mjs <carpeta-docs> [--root <raíz del repo>]   (la raíz es la carpeta de arriba de docs)");
  process.exit(2);
}
const docs = positionals[0];

let result;
try {
  result = await buildCatalog(docs, values.root);
} catch (error) {
  if (error.code === "ENOENT" && error.path?.endsWith("incluir.txt")) {
    console.error(`falta ${relative(process.cwd(), error.path)}: un patrón por línea, relativo a la raíz del repo`);
  } else {
    console.error(error.message);
  }
  process.exit(1);
}
for (const pattern of result.empty) console.error(`incluir.txt: ${pattern} no encontró nada`);
console.log(`${result.pages.length} archivos en ${docs.replace(/\/$/, "")}/${CATALOG}/`);
