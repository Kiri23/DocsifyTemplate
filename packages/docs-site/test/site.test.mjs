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
