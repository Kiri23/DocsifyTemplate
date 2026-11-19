// armar.mjs: what goes into docs/_catalogo/ and what never does. Each test builds a small repo in a
// temp folder and runs the real command on it.
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { globToRegExp, readPatterns } from "../bin/lib/glob.mjs";
import { fenced } from "../bin/lib/catalog.mjs";

const ARMAR = fileURLToPath(new URL("../bin/armar.mjs", import.meta.url));
let outside;
let repo;

/** Writes a file of the test repo, making its folders. */
function write(path, text) {
  mkdirSync(dirname(join(repo, path)), { recursive: true });
  writeFileSync(join(repo, path), text);
}

/** Runs armar on the test repo's docs folder and returns what it printed. */
function armar() {
  return execFileSync("node", [ARMAR, join(repo, "docs")], { encoding: "utf8", stdio: "pipe" });
}

const catalog = (path) => join(repo, "docs", "_catalogo", path);

beforeEach(() => {
  outside = mkdtempSync(join(tmpdir(), "armar-"));
  repo = join(outside, "repo");
  write("docs/README.md", "# Docs\n");
});

afterEach(() => rmSync(outside, { recursive: true, force: true }));

test("a pattern names paths from the repo root, with *, **/ and ?", () => {
  const skills = globToRegExp("skills/*/SKILL.md");
  assert.ok(skills.test("skills/brainstorm/SKILL.md"));
  assert.ok(!skills.test("skills/a/b/SKILL.md"));
  assert.ok(!skills.test("otros/skills/a/SKILL.md"));
  const turtle = globToRegExp("**/*.ttl");
  assert.ok(turtle.test("proyecto.ttl"));
  assert.ok(turtle.test("a/b/c.ttl"));
  assert.ok(!turtle.test("a/b/c.ttl.md"));
  assert.ok(globToRegExp("agents/?.md").test("agents/x.md"));
  assert.ok(!globToRegExp("agents/?.md").test("agents/xy.md"));
  assert.ok(globToRegExp("./bin/SCRIPTS.md").test("bin/SCRIPTS.md"));
  assert.ok(!globToRegExp("bin/SCRIPTS.md").test("bin/SCRIPTSxmd"));
});

test("incluir.txt skips blank lines and comments", () => {
  assert.deepEqual(readPatterns("# skills\nskills/*/SKILL.md\n\n  agents/*.md  \n"), ["skills/*/SKILL.md", "agents/*.md"]);
});

test("copies what the patterns name, and only that", () => {
  write("docs/incluir.txt", "skills/*/SKILL.md\nbin/SCRIPTS.md\n");
  write("skills/uno/SKILL.md", "# Uno\n");
  write("skills/uno/notas.md", "# not named\n");
  write("bin/SCRIPTS.md", "# Scripts\n");
  write("harness/claude/settings.json", "{}\n");
  assert.match(armar(), /2 archivos en .*docs\/_catalogo\//);
  assert.equal(readFileSync(catalog("skills/uno/SKILL.md"), "utf8"), "# Uno\n");
  assert.ok(existsSync(catalog("bin/SCRIPTS.md")));
  assert.ok(!existsSync(catalog("skills/uno/notas.md")));
  assert.ok(!existsSync(catalog("harness")));
});

test("never copies a hidden file or anything inside a hidden folder", () => {
  write("docs/incluir.txt", "**/*.md\n**/.env\n");
  write("visible.md", "# ok\n");
  write(".env", "TOKEN=secreto\n");
  write(".github/notas.md", "# hidden\n");
  write("skills/.privado/SKILL.md", "# hidden\n");
  const stderr = spawnSync("node", [ARMAR, join(repo, "docs")], { encoding: "utf8" }).stderr;
  assert.ok(existsSync(catalog("visible.md")));
  assert.ok(!existsSync(catalog(".env")) && !existsSync(catalog(".env.md")));
  assert.ok(!existsSync(catalog(".github")));
  assert.ok(!existsSync(catalog("skills/.privado")));
  assert.match(stderr, /\*\*\/\.env no encontró nada/);
});

test("a link that points outside the repo stays out; one that points inside comes in", () => {
  write("docs/incluir.txt", "*.md\n");
  writeFileSync(join(outside, "secreto.md"), "# outside the repo\n");
  symlinkSync(join(outside, "secreto.md"), join(repo, "fuera.md"));
  write("real.md", "# real\n");
  symlinkSync(join(repo, "real.md"), join(repo, "adentro.md"));
  armar();
  assert.ok(!existsSync(catalog("fuera.md")));
  assert.equal(readFileSync(catalog("adentro.md"), "utf8"), "# real\n");
});

test("a pattern with .. reaches nothing outside the repo", () => {
  write("docs/incluir.txt", "../*.md\n");
  writeFileSync(join(outside, "secreto.md"), "# outside the repo\n");
  armar();
  assert.ok(!existsSync(catalog("secreto.md")));
  assert.ok(!existsSync(join(repo, "docs", "secreto.md")));
});

test("a .ttl becomes a page with the whole file in a turtle block", () => {
  write("docs/incluir.txt", "**/*.ttl\n");
  const turtle = "@prefix ex: <http://example.org/> .\nex:a ex:b \"```\" .\n";
  write("ontologia/proyecto.ttl", turtle);
  armar();
  assert.ok(!existsSync(catalog("ontologia/proyecto.ttl")));
  const page = readFileSync(catalog("ontologia/proyecto.ttl.md"), "utf8");
  assert.equal(page, `# ontologia/proyecto.ttl\n\n\`\`\`\`turtle\n${turtle}\`\`\`\`\n`);
});

test("a fence is longer than any run of backticks inside", () => {
  assert.equal(fenced("a", "x"), "```x\na\n```\n");
  assert.equal(fenced("a ```` b\n", "x"), "`````x\na ```` b\n`````\n");
});

test("a page's frontmatter is shown as a YAML block", () => {
  write("docs/incluir.txt", "skills/*/SKILL.md\n");
  write("skills/uno/SKILL.md", "---\nname: uno\ndescription: Hace algo.\n---\n\n# Uno\n");
  armar();
  const page = readFileSync(catalog("skills/uno/SKILL.md"), "utf8");
  assert.equal(page, "```yaml\nname: uno\ndescription: Hace algo.\n```\n\n# Uno\n");
});

test("rebuilds the catalog from scratch: a file no longer named is gone", () => {
  write("docs/incluir.txt", "a.md\nb.md\n");
  write("a.md", "# a\n");
  write("b.md", "# b\n");
  armar();
  write("docs/_catalogo/a-mano.md", "# left over\n");
  write("docs/incluir.txt", "a.md\n");
  armar();
  assert.ok(existsSync(catalog("a.md")));
  assert.ok(!existsSync(catalog("b.md")));
  assert.ok(!existsSync(catalog("a-mano.md")));
});

test("the docs folder itself is not catalogued", () => {
  write("docs/incluir.txt", "**/*.md\n");
  write("raiz.md", "# raiz\n");
  armar();
  armar();
  assert.ok(existsSync(catalog("raiz.md")));
  assert.ok(!existsSync(catalog("docs")));
});

test("the menu lists every page from the root of the site, grouped by first folder", () => {
  write("docs/incluir.txt", "skills/*/SKILL.md\n**/*.ttl\n");
  write("skills/uno/SKILL.md", "# Uno\n");
  write("proyecto.ttl", "");
  armar();
  const sidebar = readFileSync(catalog("_sidebar.md"), "utf8");
  assert.equal(sidebar, [
    "* [← Docs](/README.md)",
    "* [Catálogo](/_catalogo/README.md)",
    "* [proyecto.ttl](/_catalogo/proyecto.ttl.md)",
    "* skills",
    "  * [uno/SKILL.md](/_catalogo/skills/uno/SKILL.md)",
    "",
  ].join("\n"));
  const index = readFileSync(catalog("README.md"), "utf8");
  assert.match(index, /- `skills\/\*\/SKILL\.md`/);
  assert.match(index, /\* \[uno\/SKILL\.md\]\(\/_catalogo\/skills\/uno\/SKILL\.md\)/);
});

test("a repo file can't replace the catalog's own front page", () => {
  write("docs/incluir.txt", "README.md\n");
  write("README.md", "# the repo's readme\n");
  const run = spawnSync("node", [ARMAR, join(repo, "docs")], { encoding: "utf8" });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /README\.md ocuparía/);
});

test("without incluir.txt it says what's missing and exits with 1", () => {
  const run = spawnSync("node", [ARMAR, join(repo, "docs")], { encoding: "utf8" });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /falta .*incluir\.txt/);
});

/** Runs armar --check on the test repo's docs folder. */
function check() {
  return spawnSync("node", [ARMAR, "--check", join(repo, "docs")], { encoding: "utf8" });
}

test("--check passes right after armar and writes nothing", () => {
  write("docs/incluir.txt", "a.md\n");
  write("a.md", "# a\n");
  armar();
  const run = check();
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /está al día/);
});

test("--check fails when a file changed, was added or left the patterns", () => {
  write("docs/incluir.txt", "*.md\n");
  write("a.md", "# a\n");
  write("b.md", "# b\n");
  armar();
  write("a.md", "# a, otra vez\n");
  write("c.md", "# c\n");
  rmSync(join(repo, "b.md"));
  write("docs/_catalogo/.a-mano", "x\n");
  const run = check();
  assert.equal(run.status, 1);
  for (const line of ["cambió a.md", "falta c.md", "sobra b.md", "sobra .a-mano", "cambió README.md"]) {
    assert.match(run.stderr, new RegExp(line.replace(".", "\\.")));
  }
  assert.ok(existsSync(catalog("b.md")), "--check doesn't touch the catalog");
  // It doesn't guess how this repo runs armar: just docs, npx and node all rebuild without --check.
  assert.match(run.stderr, /Rearmalo: corré el mismo comando sin --check\./);
  assert.doesNotMatch(run.stderr, /armar\.mjs/);
});

test("--check fails when there's no catalog yet", () => {
  write("docs/incluir.txt", "a.md\n");
  write("a.md", "# a\n");
  const run = check();
  assert.equal(run.status, 1);
  assert.match(run.stderr, /falta a\.md/);
  assert.ok(!existsSync(catalog("")));
});

test("in a git repo, only the files git keeps", () => {
  write("docs/incluir.txt", "**/*.ttl\n");
  write("proyecto.ttl", "@prefix a: <x> .\n");
  write("grafo/generado.ttl", "@prefix b: <y> .\n");
  write(".gitignore", "grafo/\n");
  execFileSync("git", ["init", "-q"], { cwd: repo });
  execFileSync("git", ["add", "proyecto.ttl", ".gitignore"], { cwd: repo });
  armar();
  assert.ok(existsSync(catalog("proyecto.ttl.md")));
  assert.ok(!existsSync(catalog("grafo/generado.ttl.md")));
});
