// check.mjs run as a command, the way `npm run check:docs` runs it, from a folder whose path has a
// space (Christian's clone lives in "~/Documents/Personal projects/…").
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE = fileURLToPath(new URL("..", import.meta.url));

/** The package reached through a folder named "con espacio", and a folder of Markdown. */
function setUp(markdown) {
  const dir = mkdtempSync(join(tmpdir(), "check-"));
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
