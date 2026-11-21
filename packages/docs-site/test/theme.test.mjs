// The look is named, never written by hand (the rule of prompt-bench's theme.test.ts, ported):
// a colour value lives only in theme/tokens.css. The theme, the components, the plugins and
// site.js name tokens.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

/** A colour written as a value: #hex, a colour function or a name on its own. */
const COLOUR = new RegExp([
  /#[0-9a-f]{3,8}\b/.source,
  /\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/.source,
  /(?<![\w-])(white|black|red|green|blue|yellow|orange|purple|pink|gray|grey|silver|navy|teal|maroon|olive|lime|aqua|cyan|magenta|fuchsia|gold|brown)(?![\w-])/.source,
].join("|"), "i");

/** A CSS or JS file without its comments: a comment may say "the amber accent". */
function withoutComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "))
    .replace(/(^|\s)\/\/.*$/gm, "$1");
}

async function filesIn(dir) {
  const found = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, e.name);
    if (e.isDirectory()) found.push(...await filesIn(path));
    else if (/\.(css|js)$/.test(e.name)) found.push(path);
  }
  return found;
}

test("no colour value outside theme/tokens.css", async () => {
  const files = [
    ...await filesIn(join(ROOT, "theme")),
    ...await filesIn(join(ROOT, "as")),
    ...await filesIn(join(ROOT, "components")),
    ...await filesIn(join(ROOT, "plugins")),
    ...await filesIn(join(ROOT, "docs", "propios")),
    join(ROOT, "site.js"),
  ].filter((f) => !f.endsWith(join("theme", "tokens.css")));
  assert.ok(files.length >= 15, `only ${files.length} files checked: did the folders move?`);
  const written = [];
  for (const file of files) {
    withoutComments(await readFile(file, "utf8")).split("\n").forEach((line, i) => {
      if (COLOUR.test(line)) written.push(`${relative(ROOT, file)}:${i + 1}: ${line.trim()}`);
    });
  }
  assert.equal(written.join("\n"), "", "a colour written outside tokens.css: name a token instead");
});
