#!/usr/bin/env node
// Checks every `<!-- as: name -->` marker of a folder of Markdown without a browser. For each one it
// does what the site does: renders the page with marked (the parser Docsify 5 uses), finds the
// marker, takes the Markdown under it and reads it with the component. If any of that fails, it
// prints file:line and why, and exits with 1. A marker that passes here is drawn by the site.
//
//   node packages/docs-site/bin/check.mjs packages/docs-site/docs ~/Code/MyClaudeSkills
import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { marked } from "marked";
import { parseHTML } from "linkedom";
import { findMarks, prepare } from "../as/core.js";
import * as builtIn from "../components/mod.js";

const SKIP = new Set(["node_modules", ".git"]);
const COMPONENTS = new Map(Object.values(builtIn).map((c) => [c.name, c]));

/** The Markdown files under a folder, at any depth. */
async function markdownUnder(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...await markdownUnder(path));
    else if (entry.name.endsWith(".md")) found.push(path);
  }
  return found.sort();
}

/** The line of each marker in the source, in order, skipping the ones inside code blocks: those
 *  are examples, and the rendered page has them as text, not as markers. */
function markerLines(source) {
  const lines = [];
  let line = 1;
  for (const token of marked.lexer(source)) {
    if (token.type === "html") {
      for (const m of token.raw.matchAll(/<!--\s*as:/g)) {
        lines.push(line + token.raw.slice(0, m.index).split("\n").length - 1);
      }
    }
    line += token.raw.split("\n").length - 1;
  }
  return lines;
}

/**
 * The problems of one Markdown page: "line: why" for each marker that the site would not draw.
 * @param {string} source the Markdown
 */
export function problemsIn(source) {
  const { document } = parseHTML(`<!DOCTYPE html><html><body><main>${marked.parse(source)}</main></body></html>`);
  const lines = markerLines(source);
  const problems = [];
  findMarks(document.querySelector("main")).forEach((mark, i) => {
    try {
      prepare(mark, COMPONENTS);
    } catch (error) {
      problems.push(`${lines[i] ?? "?"}: ${error.message}`);
    }
  });
  return problems;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const folders = process.argv.slice(2);
  if (!folders.length) {
    console.error("uso: check.mjs <carpeta> [<carpeta>…]");
    process.exit(2);
  }
  let markers = 0;
  let failed = 0;
  for (const folder of folders.map((f) => resolve(f))) {
    for (const file of await markdownUnder(folder)) {
      const source = await readFile(file, "utf8");
      markers += markerLines(source).length;
      for (const problem of problemsIn(source)) {
        console.log(`${relative(process.cwd(), file)}:${problem}`);
        failed++;
      }
    }
  }
  console.log(failed ? `${failed} de ${markers} marcas no se dibujarían.` : `${markers} marcas, todas se dibujan.`);
  process.exit(failed ? 1 : 0);
}
