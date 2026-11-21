#!/usr/bin/env node
// Checks every `<!-- as: name -->` marker of a folder of Markdown without a browser. For each one it
// does what the site does: renders the page with marked (the parser Docsify 5 uses), finds the
// marker, takes the Markdown under it and reads it with the component. If any of that fails, it
// prints file:line and why, and exits with 1. A marker that passes here is drawn by the site.
//
// A repo's own components are the same files its index.html names in `window.$docsify.components`,
// given here with --components (one flag per file). The JSON a marker names is read from disk,
// relative to its page.
//
//   node packages/docs-site/bin/check.mjs packages/docs-site/docs ~/Code/MyClaudeSkills
//   node packages/docs-site/bin/check.mjs docs --components docs/propios/retro.js
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { marked } from "marked";
import { parseHTML } from "linkedom";
import { addComponents, findMarks, prepare, ShapeError } from "../as/core.js";
import * as builtIn from "../components/mod.js";
import { filesUnder } from "./lib/files.mjs";

const SKIP = new Set(["node_modules", ".git"]);
const COMPONENTS = new Map(Object.values(builtIn).map((c) => [c.name, c]));
const PACKAGE = new URL("../", import.meta.url);

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
 * @param {{ components?: Map<string, object>, load?: (src: string) => unknown }} [options] the
 *   components the page may name (the factory ones if not given) and how to read a JSON it names
 */
export function problemsIn(source, { components = COMPONENTS, load } = {}) {
  const { document } = parseHTML(`<!DOCTYPE html><html><body><main>${marked.parse(source)}</main></body></html>`);
  const lines = markerLines(source);
  const problems = [];
  findMarks(document.querySelector("main")).forEach((mark, i) => {
    try {
      prepare(mark, components, { load });
    } catch (error) {
      problems.push(`${lines[i] ?? "?"}: ${error.message}`);
    }
  });
  return problems;
}

/**
 * How a page reads the JSON it names: relative to the page, looked up among the files the site
 * serves from the folder (never a path built from the marker, so "../" or a link that leaves the
 * folder fails here as it 404s there), and kept by git when the folder is in a repo (a file git
 * doesn't keep is a 404 once the site is published).
 * @param {{ page: string, folder: string, files: Map<string, string> }} where the Markdown page,
 *   the folder being checked and its files as serve.mjs serves them (lib/files.mjs filesUnder)
 */
export function jsonBeside({ page, folder, files }) {
  return (src) => {
    const inside = relative(folder, resolve(dirname(page), src));
    if (inside.startsWith("..") || isAbsolute(inside)) throw new ShapeError(`${src} queda fuera de ${folder}`);
    const path = files.get("/" + inside.split(sep).join("/"));
    if (!path) {
      throw new ShapeError(existsSync(resolve(folder, inside))
        ? `${src} existe, pero el sitio no lo sirve: es oculto o un link que sale de la carpeta`
        : `no existe ${src} al lado de la página`);
    }
    if (untracked(path)) throw new ShapeError(`${src} existe, pero git no lo versiona: publicado sería un 404`);
    try {
      return JSON.parse(readFileSync(path, "utf8"));
    } catch (error) {
      throw new ShapeError(`${src} no es JSON válido (${error.message})`);
    }
  };
}

/** Whether a file is in a git repo that doesn't keep it. Outside a repo, nothing is untracked. */
function untracked(path) {
  try {
    return execFileSync("git", ["-C", dirname(path), "ls-files", "-z", "--", basename(path)], {
      encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
    }) === "";
  } catch {
    return false;
  }
}

/**
 * The factory components plus a repo's own modules, imported the way the site imports them: a
 * module may import "preact", "htm/preact" and "docs-site/…" as the site's import map lets it,
 * without node_modules of its own. The first call teaches this whole Node process the import map.
 * @param {string[]} paths the repo's component modules
 * @returns {Promise<{ components: Map<string, object>, problems: string[] }>}
 */
export async function componentsWith(paths) {
  if (paths.length) await mirrorImportMap();
  const modules = {};
  const problems = [];
  for (const path of paths) {
    try {
      modules[path] = await import(pathToFileURL(resolve(path)).href);
    } catch (error) {
      problems.push(`${path} no se pudo importar: ${error.message}`);
    }
  }
  const added = addComponents(Object.values(builtIn), modules);
  return { components: new Map(added.components.map((c) => [c.name, c])), problems: [...problems, ...added.problems] };
}

let mirrored = false;

/** Node's side of site.js's import map: "docs-site/" is this package, and the libraries the map
 *  names come from this package's node_modules. Loaded only for --components: registerHooks
 *  needs Node 22.15, and a check without a repo's own components runs on any Node. */
async function mirrorImportMap() {
  if (mirrored) return;
  mirrored = true;
  const { registerHooks } = await import("node:module");
  if (!registerHooks) throw new Error(`--components necesita Node 22.15 o más nuevo; este es ${process.version}`);
  registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier.startsWith("docs-site/")) {
        return { url: new URL(specifier.slice("docs-site/".length), PACKAGE).href, shortCircuit: true };
      }
      try {
        return nextResolve(specifier, context);
      } catch (error) {
        if (/^[./]/.test(specifier) || specifier.includes(":")) throw error;
        return nextResolve(specifier, { ...context, parentURL: import.meta.url });
      }
    },
  });
}

// Run as a command, not imported by a test. The path is compared as a URL ("con%20espacio") and
// with links resolved, so a folder with a space or a symlink in its path still runs the check.
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const { values, positionals: folders } = parseArgs({
    allowPositionals: true,
    options: { components: { type: "string", multiple: true, default: [] } },
  });
  if (!folders.length) {
    console.error("uso: check.mjs <carpeta> [<carpeta>…] [--components <módulo.js>]…");
    process.exit(2);
  }
  const { components, problems } = await componentsWith(values.components);
  for (const problem of problems) console.log(problem);
  let markers = 0;
  let failed = problems.length;
  for (const folder of folders.map((f) => resolve(f))) {
    const files = await filesUnder(folder, "/");
    for (const file of await markdownUnder(folder)) {
      const source = await readFile(file, "utf8");
      markers += markerLines(source).length;
      for (const problem of problemsIn(source, { components, load: jsonBeside({ page: file, folder, files }) })) {
        console.log(`${relative(process.cwd(), file)}:${problem}`);
        failed++;
      }
    }
  }
  console.log(failed ? `${failed} de ${markers} marcas no se dibujarían.` : `${markers} marcas, todas se dibujan.`);
  process.exit(failed ? 1 : 0);
}
