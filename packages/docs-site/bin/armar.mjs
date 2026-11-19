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
//   npx -y --package=https://codeload.github.com/Kiri23/DocsifyTemplate/tar.gz/<sha> docs-armar docs
//
// With --check it writes nothing: it exits with 1 and says what changed if <docs>/_catalogo/ isn't
// what it would build. For a repo that commits its catalog, from its pre-commit.
import { parseArgs } from "node:util";
import { relative } from "node:path";
import { buildCatalog, checkCatalog, CATALOG } from "./lib/catalog.mjs";

const USAGE = "uso: armar.mjs <carpeta-docs> [--check] [--root <raíz del repo>]   (la raíz es la carpeta de arriba de docs)";
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { root: { type: "string" }, check: { type: "boolean", default: false } },
});
if (positionals.length !== 1) {
  console.error(USAGE);
  process.exit(2);
}
const docs = positionals[0];
const catalog = `${docs.replace(/\/$/, "")}/${CATALOG}/`;

let result;
try {
  if (values.check) result = await checkCatalog(docs, values.root);
  else result = await buildCatalog(docs, values.root);
} catch (error) {
  if (error.code === "ENOENT" && error.path?.endsWith("incluir.txt")) {
    console.error(`falta ${relative(process.cwd(), error.path)}: un patrón por línea, relativo a la raíz del repo`);
  } else {
    console.error(error.message);
  }
  process.exit(1);
}
for (const pattern of result.empty) console.error(`incluir.txt: ${pattern} no encontró nada`);

if (values.check) {
  if (result.differences.length === 0) {
    console.log(`${catalog} está al día`);
  } else {
    console.error(`${catalog} está atrasado respecto de incluir.txt y del repo:`);
    for (const difference of result.differences) console.error(`  ${difference}`);
    console.error(`Rearmalo: armar.mjs ${docs}`);
    process.exit(1);
  }
} else {
  console.log(`${result.pages.length} archivos en ${catalog}`);
}
