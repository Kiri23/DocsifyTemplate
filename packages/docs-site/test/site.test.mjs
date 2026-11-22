// What site.js loads: the Prism languages a catalog page can ask for.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const SITE = fileURLToPath(new URL("../site.js", import.meta.url));

async function prismLanguages() {
  const text = await readFile(SITE, "utf8");
  const line = text.match(/var languages = \[([^\]]*)\]/);
  assert.ok(line, "site.js has no list of languages");
  const names = [];
  for (const quoted of line[1].split(",")) {
    names.push(quoted.trim().replace(/"/g, ""));
  }
  return names;
}

test("site.js loads sparql, after turtle, which it extends", async () => {
  const languages = await prismLanguages();
  assert.ok(languages.includes("turtle"), "falta turtle");
  assert.ok(languages.includes("sparql"), "falta sparql");
  assert.ok(languages.indexOf("turtle") < languages.indexOf("sparql"), "sparql tiene que ir después de turtle");
});

test("site.js imports and registers every built-in component from components/mod.js", async () => {
  const builtIn = await import("../components/mod.js");
  const text = await readFile(SITE, "utf8");
  const imported = text.match(/import\s*\{([^}]*)\}\s*from\s*"'\s*\+\s*base\s*\+\s*'components\/mod\.js"/);
  const registered = text.match(/addComponents\(\[([^\]]*)\]/);
  assert.ok(imported, "site.js does not import built-in components");
  assert.ok(registered, "site.js does not register built-in components");
  const split = (s) => s.split(",").map((name) => name.trim()).filter(Boolean).sort();
  const expected = Object.keys(builtIn).sort();
  assert.deepEqual(split(imported[1]), expected);
  assert.deepEqual(split(registered[1]), expected);
});
