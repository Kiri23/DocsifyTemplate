// Static guards for packages/docs-export:
// 1. motor/ must contain zero Node imports and zero browser globals so #50 can run it in the browser.
// 2. templates/branded.typ keeps all colour literals inside its single top palette block.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_ROOT = fileURLToPath(new URL("..", import.meta.url));
const MOTOR_DIR = join(PACKAGE_ROOT, "motor");
const TEMPLATE_PATH = join(PACKAGE_ROOT, "templates", "branded.typ");

const NODE_BUILTINS = new Set([
  "assert", "buffer", "child_process", "cluster", "crypto", "dgram", "dns", "events",
  "fs", "http", "http2", "https", "inspector", "module", "net", "os", "path", "perf_hooks",
  "process", "querystring", "readline", "repl", "stream", "string_decoder", "timers",
  "tls", "tty", "url", "util", "v8", "vm", "worker_threads", "zlib",
]);

const BROWSER_GLOBALS = /\b(window|document|fetch|DOMParser|XMLSerializer|navigator|localStorage|sessionStorage|Blob)\b/;
const NODE_GLOBALS = /\b(process|Buffer|__dirname|__filename)\b/;
const IMPORT_SPECIFIER = /\b(?:import|export)\b[^"']*?\bfrom\s*["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']\s*\)|\brequire\s*\(\s*["']([^"']+)["']\s*\)/g;
const COLOUR_LITERAL = /#[0-9a-f]{3,8}\b|\brgb\(/i;

/** Strips JS line and block comments while keeping line numbers aligned. */
function withoutJsComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "))
    .replace(/(^|\s)\/\/.*$/gm, "$1");
}

/** Collects every .js/.mjs file under a directory recursively. */
async function jsFilesUnder(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...await jsFilesUnder(full));
    else if (/\.(m?js)$/.test(entry.name)) found.push(full);
  }
  return found.sort();
}

test("motor/ has zero Node imports and zero browser/Node globals", async () => {
  const files = await jsFilesUnder(MOTOR_DIR);
  assert.ok(files.length >= 4, `expected at least 4 files in motor/, found ${files.length}`);

  const violations = [];
  for (const file of files) {
    const code = withoutJsComments(await readFile(file, "utf8"));
    const rel = relative(PACKAGE_ROOT, file);

    for (const match of code.matchAll(IMPORT_SPECIFIER)) {
      const specifier = match[1] ?? match[2] ?? match[3];
      const base = specifier.split("/")[0];
      if (specifier.startsWith("node:") || NODE_BUILTINS.has(base)) {
        violations.push(`${rel}: Node import "${specifier}"`);
      }
    }

    code.split("\n").forEach((line, index) => {
      if (BROWSER_GLOBALS.test(line)) {
        violations.push(`${rel}:${index + 1}: browser global in "${line.trim()}"`);
      }
      if (NODE_GLOBALS.test(line)) {
        violations.push(`${rel}:${index + 1}: Node global in "${line.trim()}"`);
      }
    });
  }

  assert.deepEqual(violations, [], `motor/ purity violations:\n${violations.join("\n")}`);
});

test("branded.typ keeps all colour literals inside its top palette block", async () => {
  const source = await readFile(TEMPLATE_PATH, "utf8");
  const lines = source.split("\n");
  const paletteEnd = lines.findIndex((line) => line.startsWith("// ── Pandoc Helpers"));
  assert.ok(paletteEnd > 0, "expected a Pandoc Helpers section marker after the palette block");

  const stray = [];
  for (let i = paletteEnd; i < lines.length; i++) {
    const withoutComment = lines[i].replace(/\/\/.*$/, "");
    if (COLOUR_LITERAL.test(withoutComment)) {
      stray.push(`templates/branded.typ:${i + 1}: ${lines[i].trim()}`);
    }
  }
  assert.deepEqual(stray, [], `colour literals found outside the palette block:\n${stray.join("\n")}`);
});
