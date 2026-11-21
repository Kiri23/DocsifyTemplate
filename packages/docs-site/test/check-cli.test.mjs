// check.mjs run as a command, the way `npm run check:docs` runs it, from a folder whose path has a
// space (Christian's clone lives in "~/Documents/Personal projects/…").
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE = fileURLToPath(new URL("..", import.meta.url));

const made = [];
after(() => made.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

/** The package reached through a folder named "con espacio", and a folder of Markdown. */
function setUp(markdown) {
  const dir = mkdtempSync(join(tmpdir(), "check-"));
  made.push(dir);
  symlinkSync(PACKAGE, join(dir, "con espacio"));
  mkdirSync(join(dir, "docs"));
  writeFileSync(join(dir, "docs", "page.md"), markdown);
  return dir;
}

function check(dir) {
  return spawnSync("node", [join(dir, "con espacio", "bin", "check.mjs"), join(dir, "docs")], { encoding: "utf8" });
}

test("check.mjs looks at the pages even when its path has a space", () => {
  const run = check(setUp("<!-- as: stepper -->\n\n## A\n\n## B\n"));
  assert.equal(run.stdout.trim(), "1 marcas, todas se dibujan.");
  assert.equal(run.status, 0);
});

test("check.mjs fails a broken marker when its path has a space", () => {
  const run = check(setUp("<!-- as: stepper -->\n\n## Solo uno\n"));
  assert.match(run.stdout, /page\.md:1: un stepper necesita al menos dos ## \(pasos\)/);
  assert.equal(run.status, 1);
});

/** A repo's own whole-page component, importing only what site.js's import map gives it. */
const RETRO_JS = `import { html } from "htm/preact";
import { page, ShapeError } from "docs-site/as/mod.js";
export const retro = {
  name: "retro",
  takes: page().json("src"),
  attrs: [],
  read({ data }) {
    if (!Array.isArray(data.weeks)) throw new ShapeError("retro necesita weeks");
    return { weeks: data.weeks };
  },
  view: ({ weeks }) => html\`<p>\${weeks.length}</p>\`,
};
`;

/** setUp plus the component module and a JSON file beside the page. */
function withOwn(json, markdown = '<!-- as: retro src="retro.json" -->\n\nOn GitHub, a table.\n') {
  const dir = setUp(markdown);
  writeFileSync(join(dir, "docs", "retro.js"), RETRO_JS);
  if (json !== null) writeFileSync(join(dir, "docs", "retro.json"), json);
  return dir;
}

function checkOwn(dir) {
  return spawnSync("node", [join(dir, "con espacio", "bin", "check.mjs"), join(dir, "docs"),
    "--components", join(dir, "docs", "retro.js")], { encoding: "utf8" });
}

test("check.mjs draws a repo's own component from its JSON, with no node_modules in the repo", () => {
  const run = checkOwn(withOwn('{ "weeks": [1, 2] }'));
  assert.equal(run.stdout.trim(), "1 marcas, todas se dibujan.", run.stderr);
  assert.equal(run.status, 0);
});

test("check.mjs fails a missing JSON, a broken one and one the component refuses", () => {
  assert.match(checkOwn(withOwn(null)).stdout, /page\.md:1: no existe retro\.json al lado de la página/);
  assert.match(checkOwn(withOwn("{ weeks")).stdout, /page\.md:1: retro\.json no es JSON válido/);
  assert.match(checkOwn(withOwn('{ "weeks": 3 }')).stdout, /page\.md:1: retro necesita weeks/);
});

test("check.mjs fails a JSON that git doesn't keep: published, it would be a 404", () => {
  const dir = withOwn('{ "weeks": [] }');
  execFileSync("git", ["init", "-q", join(dir, "docs")]);
  execFileSync("git", ["-C", join(dir, "docs"), "add", "page.md", "retro.js"]);
  const run = checkOwn(dir);
  assert.match(run.stdout, /retro\.json existe, pero git no lo versiona/);
  assert.equal(run.status, 1);
});

test("check.mjs without --components says the name doesn't exist", () => {
  const run = check(withOwn('{ "weeks": [] }'));
  assert.match(run.stdout, /no hay un componente "retro"/);
  assert.equal(run.status, 1);
});
