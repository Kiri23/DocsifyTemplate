// Static guard verifying motor/ has zero Node imports and zero browser/Node globals.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_ROOT = fileURLToPath(new URL("..", import.meta.url));
const MOTOR_DIR = join(PACKAGE_ROOT, "motor");

const NODE_BUILTINS = new Set([
  "assert", "buffer", "child_process", "cluster", "crypto", "dgram", "dns", "events",
  "fs", "http", "http2", "https", "inspector", "module", "net", "os", "path", "perf_hooks",
  "process", "querystring", "readline", "repl", "stream", "string_decoder", "timers",
  "tls", "tty", "url", "util", "v8", "vm", "worker_threads", "zlib",
]);

const BROWSER_GLOBALS = /\b(window|document|fetch|DOMParser|XMLSerializer|navigator|localStorage|sessionStorage|Blob)\b/;
const NODE_GLOBALS = /\b(process|Buffer|__dirname|__filename)\b/;
const IMPORT_SPECIFIER =
  /\b(?:import|export)\b[^"'\n]*?\bfrom\s*["']([^"']+)["']|\bimport\s*["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']\s*\)|\brequire\s*\(\s*["']([^"']+)["']\s*\)/g;

/** Removes JS comments while preserving line numbers. */
function withoutJsComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "))
    .replace(/(^|\s)\/\/.*$/gm, "$1");
}

/** Finds every purity violation in a single JS source file. */
function purityViolationsIn(source, label) {
  const code = withoutJsComments(source);
  const violations = [];

  for (const match of code.matchAll(IMPORT_SPECIFIER)) {
    const specifier = match[1] ?? match[2] ?? match[3] ?? match[4];
    const base = specifier.split("/")[0];
    if (specifier.startsWith("node:") || NODE_BUILTINS.has(base)) {
      violations.push(`${label}: Node import "${specifier}"`);
    }
  }

  code.split("\n").forEach((line, index) => {
    if (BROWSER_GLOBALS.test(line)) {
      violations.push(`${label}:${index + 1}: browser global in "${line.trim()}"`);
    }
    if (NODE_GLOBALS.test(line)) {
      violations.push(`${label}:${index + 1}: Node global in "${line.trim()}"`);
    }
  });

  return violations;
}

/** Lists every JS file under a folder recursively. */
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
    const source = await readFile(file, "utf8");
    violations.push(...purityViolationsIn(source, relative(PACKAGE_ROOT, file)));
  }

  assert.deepEqual(violations, [], `motor/ purity violations:\n${violations.join("\n")}`);
});

test("purity guard catches bare side-effect Node imports, dynamic imports, and browser globals", () => {
  const bad = [
    'import "node:fs";',
    'import fs from "fs";',
    'const cp = await import("node:child_process");',
    "const root = window.document;",
  ].join("\n");

  const found = purityViolationsIn(bad, "sample.js");
  assert.equal(found.length, 4, `expected 4 violations, got:\n${found.join("\n")}`);
  assert.match(found[0], /node:fs/);
  assert.match(found[1], /"fs"/);
  assert.match(found[2], /node:child_process/);
  assert.match(found[3], /browser global/);
});
