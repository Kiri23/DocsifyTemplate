// The summary of a PR as Markdown (docs/prs/<n>.md) says everything its summarize-pr page says.
// The converter (bin/pr.mjs) reads the page as data, writes Markdown with `as` markers, and the
// site draws it with the components of components/pr/. These tests are its validator:
//
//   1. the page that comes in passes summarize-pr's own check;
//   2. the converter takes only the template's blocks and freeform blocks;
//   3. the Markdown has the same blocks as the page (decisions, diffs, terms, charts, tests…);
//   4. the page's text and its data (code of each diff, charts, tooltips, links) arrive byte by
//      byte, read back from the Markdown by the components, and drawn.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { checkSummary } from "../pr/upstream.mjs";
import { readSummary, SummaryError } from "../pr/read-summary.mjs";
import { toMarkdown } from "../pr/write-markdown.mjs";
import { inventoryOfSummary, inventoryOfMarkdown, factsOfSummary, factsOfMarkdown, textOfSummary, drawnText } from "../pr/inventory.mjs";
import { problemsIn } from "../bin/check.mjs";
import * as prComponents from "../components/pr/mod.js";
import * as builtIn from "../components/mod.js";

const DOCS = new URL("../docs/prs/", import.meta.url);
const TEMPLATE = fileURLToPath(new URL("../pr/summarize-pr/template.html", import.meta.url));
// The template with the slots of <main> and of the header's numbers filled, as a page would have them.
const template = () => readFileSync(TEMPLATE, "utf8")
  .replace("{{owner}}/{{repo}}", "o/r").replace("{{PR number}}", "1").replace("{{head commit SHA}}", "a".repeat(40))
  .replace("{{PR additions}}", "10").replace("{{PR deletions}}", "2")
  .replace("{{first changed line}}", "3").replaceAll("{{line}}", "7").replace("{{added, modified or removed}}", "added");
// The two real summaries, and a made-up one (test/fixtures/pr/7.html) with every block of the
// catalog: hidden code, review threads, a before/after chart, test groups, a freeform table.
const PAGES = ["55", "59", "7"];
const FIXTURES = new URL("fixtures/pr/", import.meta.url);
const folder = (n) => (n === "7" ? FIXTURES : DOCS);
const SOURCE = { 55: "packages/docs-site/docs/prs/55.html", 59: "packages/docs-site/docs/prs/59.html", 7: "packages/docs-site/test/fixtures/pr/7.html" };
const COMPONENTS = new Map([...Object.values(builtIn), ...Object.values(prComponents)].map((c) => [c.name, c]));
const page = (n) => readFileSync(new URL(`${n}.html`, folder(n)), "utf8");
const markdown = (n) => readFileSync(new URL(`${n}.md`, folder(n)), "utf8");

// 1. summarize-pr's check on what comes in.

// What the check says on these pages and is not a problem of their content: #59 added CSS and
// script for the glossary links (its decision "the page of #55 is no longer an exact copy"), and
// the check reads a Markdown line "import map y…" of GLOSSARY.md as an import.
const KNOWN = {
  55: [],
  7: [],
  59: ["GLOSSARY.md (new): imports and re-exports are never shown: import map y los componentes de este repo ya configurados."],
};

for (const n of PAGES) {
  test(`#${n}: summarize-pr's check passes on the page that comes in`, () => {
    const { errors } = checkSummary(page(n));
    assert.deepEqual(errors, KNOWN[n]);
  });
}

// 2. A closed list of blocks.

const wrap = (blocks) => `<main data-repo-url="https://github.com/o/r" data-pr="1" data-head-sha="${"a".repeat(40)}">
<header><h1>T</h1><div class="stats" data-pr-additions="1" data-pr-deletions="0"></div></header>
<section id="s"><h2>S</h2>${blocks}</section></main>`;

for (const [what, html, why] of [
  ["a bare <pre>", "<pre>x</pre>", /<pre> no es un bloque/],
  ["a <p> without a class", "<p>x</p>", /<p> no es un bloque/],
  ["an aside of no kind", '<aside class="tip"><p>x</p></aside>', /<aside class="tip"> no es un bloque/],
  ["a decision with no trade-off", '<details class="decision"><summary><span class="decision-title">x</span></summary><div class="decision-body"><p class="decision-why">y</p></div></details>', /decision-cost/],
  ["a <style> with no block after it", "<style>.x{}</style>", /bloque libre/],
  ["a freeform block that takes a template class", '<div class="note">x</div>', /no es un bloque/],
]) {
  test(`the converter refuses ${what}`, () => {
    assert.throws(() => readSummary(wrap(html)), (error) => error instanceof SummaryError && why.test(error.message));
  });
}

test("a table with its own <style> is a freeform block", () => {
  const { sections } = readSummary(wrap('<style>.modes td { color: var(--add); }</style><div class="table-wrap modes"><table><tr><td>✓</td></tr></table></div>'));
  assert.deepEqual(sections[0].blocks.map((b) => b.kind), ["freeform"]);
});

test("template.html, with every block of the catalog, converts and draws", () => {
  const summary = readSummary(template());
  const kinds = new Set([...summary.header, ...summary.sections.flatMap((s) => s.blocks)].map((b) => b.kind));
  assert.deepEqual([...kinds].sort(), ["assumption", "callout", "chart", "decision", "diff", "discarded", "example", "note", "story", "tests"]);
  const md = toMarkdown(summary, { original: "template.html" });
  assert.deepEqual(problemsIn(md, { components: COMPONENTS }), []);
});

// 3 and 4, on the real pages.

for (const n of PAGES) {
  test(`#${n}: ${n}.md is what the converter writes from ${n}.html`, () => {
    assert.equal(markdown(n), toMarkdown(readSummary(page(n)), { original: `${n}.html`, source: SOURCE[n] }));
  });

  test(`#${n}: every marker of the Markdown draws`, () => {
    assert.deepEqual(problemsIn(markdown(n), { components: COMPONENTS }), []);
  });

  test(`#${n}: the Markdown has the same blocks as the page`, () => {
    const want = inventoryOfSummary(readSummary(page(n)));
    assert.ok(want.decisions > 0 && want.diffs > 0 && want.tests > 0, "the page has blocks to count");
    if (n === "7") assert.ok(Object.entries(want).every(([, count]) => count > 0), `the fixture has every block: ${JSON.stringify(want)}`);
    assert.deepEqual(inventoryOfMarkdown(markdown(n), COMPONENTS), want);
  });

  test(`#${n}: the code of each diff, the charts, the tooltips and the links arrive byte by byte`, () => {
    assert.deepEqual(factsOfMarkdown(markdown(n), COMPONENTS), factsOfSummary(readSummary(page(n))));
  });

  test(`#${n}: every text of the page's <main> is on the drawn page`, () => {
    const drawn = drawnText(markdown(n), COMPONENTS);
    const missing = textOfSummary(page(n)).filter((text) => !drawn.includes(text));
    assert.deepEqual(missing, []);
  });

  test(`#${n}: the header counts the shown lines as summarize-pr's check does`, () => {
    const { shown } = checkSummary(page(n));
    const header = /<!-- as: pr-header [^>]*shown-additions="(\d+)" shown-deletions="(\d+)"/.exec(markdown(n));
    assert.deepEqual({ additions: Number(header?.[1]), deletions: Number(header?.[2]) }, shown);
  });
}
