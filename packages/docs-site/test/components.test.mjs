// Each component reads its Markdown: what it gets from a page that fits, and why it refuses one that
// doesn't. problemsIn is what `npm run check:docs` runs on every page.
import { test } from "node:test";
import assert from "node:assert/strict";
import { marked } from "marked";
import { parseHTML } from "linkedom";
import { findMarks } from "../as/core.js";
import { problemsIn } from "../bin/check.mjs";
import { annotatedBlock, optionPicker, stepper } from "../components/mod.js";

/** What a component reads from the Markdown under the first marker of a page. */
function read(component, md, attrs = {}) {
  const { document } = parseHTML(`<main>${marked.parse(md)}</main>`);
  const mark = findMarks(document.querySelector("main"))[0];
  return component.read(component.takes.collect(mark), attrs);
}

const BLOCK = "<!-- as: annotated-block -->\n```\nVersion  score\nlabels   100±0\n```\n";

test("annotated-block: each item names a piece of the block and keeps its note", () => {
  const { notes } = read(annotatedBlock, BLOCK + "1. `score`: the average\n2. `100±0` — mean ± spread\n");
  assert.deepEqual(notes.map(({ n, mark, note }) => ({ n, mark, note })), [
    { n: 1, mark: "score", note: "the average" },
    { n: 2, mark: "100±0", note: "mean ± spread" },
  ]);
});

test("annotated-block: a piece that isn't in the block is refused", () => {
  assert.deepEqual(problemsIn(BLOCK + "1. `effect`: how to read it\n"), [
    "1: `effect` (punto 1) no está en el bloque de código",
  ]);
});

test("annotated-block: an item that doesn't start with a piece is refused", () => {
  assert.deepEqual(problemsIn(BLOCK + "1. The `score`: the average\n"), [
    "1: el punto 1 de la lista no empieza con un `trozo` del bloque",
  ]);
});

const TABLE = `<!-- as: option-picker label="isolation" -->
| Lo que ve la corrida | \`clean\` | \`none\` |
| --- | --- | --- |
| tu login | sí | sí |
| plugins | no | ✓ |
| tu carpeta | no: una vacía | yes |
`;

test("option-picker: one column per value, and what gets through instead", () => {
  const props = read(optionPicker, TABLE, { label: "isolation" });
  assert.deepEqual(props.options, ["clean", "none"]);
  assert.equal(props.pick, "clean");
  assert.equal(props.label, "isolation");
  assert.deepEqual(props.rows.map((r) => r.fates.clean), [
    { passes: true, instead: null },
    { passes: false, instead: null },
    { passes: false, instead: "una vacía" },
  ]);
  assert.ok(props.rows.every((r) => r.fates.none.passes));
});

test("option-picker: a cell that isn't yes or no is refused, not guessed", () => {
  const bad = TABLE.replace("| plugins | no |", "| plugins | a veces |");
  assert.deepEqual(problemsIn(bad), [
    '1: fila 2, columna clean: "a veces" no empieza con sí o no',
  ]);
});

test("option-picker: default has to be one of the columns", () => {
  const bad = TABLE.replace('label="isolation"', 'default="hermetic"');
  assert.deepEqual(problemsIn(bad), ['1: default="hermetic" no es una columna de la tabla (clean, none)']);
});

const STEPS = "# Guide\n\n<!-- as: stepper -->\n\n## One\n\nfirst\n\n```sh\nrun\n```\n\n## Two\n\nsecond\n";

test("stepper: each ## is a step with the page's own nodes", () => {
  const { steps } = read(stepper, STEPS);
  // Docsify gives each heading its id; the step keeps it so a link to the heading opens the step.
  assert.deepEqual(steps.map((s) => [s.title, s.nodes.map((n) => n.localName)]), [
    ["One", ["h2", "p", "pre"]],
    ["Two", ["h2", "p"]],
  ]);
  assert.equal(steps[0].id, steps[0].nodes[0].id);
});

test("stepper: a single step is refused", () => {
  assert.deepEqual(problemsIn("<!-- as: stepper -->\n\n## Only\n\ntext\n"), [
    "1: un stepper necesita al menos dos ## (pasos)",
  ]);
});

test("check reports the line of each marker that fails", () => {
  const md = "# Page\n\n<!-- as: stepper -->\n\n## A\n\n## B\n\n<!-- /as -->\n\ntext\n\n<!-- as: nope -->\n\ntext\n";
  assert.deepEqual(problemsIn(md), [
    "13: no hay un componente \"nope\"; los que hay: annotated-block, option-picker, stepper",
  ]);
});
