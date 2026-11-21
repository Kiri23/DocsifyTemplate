// The marker and the shapes: what a page may write after "as:" and what each shape takes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { marked } from "marked";
import { parseHTML } from "linkedom";
import { addComponents, findMarks, jsonSources, parseMark, prepare } from "../as/core.js";
import { page, section, sequence, ShapeError } from "../as/shapes.js";

/** A Markdown page rendered the way the site renders it, and its first marker. */
function firstMark(md) {
  const { document } = parseHTML(`<main>${marked.parse(md)}</main>`);
  return findMarks(document.querySelector("main"))[0];
}

test("a marker says a name and its attributes", () => {
  assert.deepEqual(parseMark(' as: option-picker default="clean" in="Llega" '), {
    name: "option-picker",
    attrs: { default: "clean", in: "Llega" },
  });
  assert.deepEqual(parseMark("as: stepper"), { name: "stepper", attrs: {} });
});

test("a badly written marker says how to write it", () => {
  assert.throws(() => parseMark("as: Option Picker"), /marca mal escrita/);
  assert.throws(() => parseMark("as: picker default=clean"), /marca mal escrita/);
});

test("a marker inside a code block is an example, not a marker", () => {
  assert.equal(firstMark("```md\n<!-- as: stepper -->\n```\n"), undefined);
});

test("sequence takes the elements right after the marker, in order", () => {
  const mark = firstMark("<!-- as: x -->\n```\ncode\n```\n1. `code`: note\n");
  assert.deepEqual(sequence("pre", "ol").collect(mark).map((n) => n.localName), ["pre", "ol"]);
});

test("sequence says what it expected and what it found", () => {
  const mark = firstMark("<!-- as: x -->\n```\ncode\n```\n\nA paragraph.\n");
  assert.throws(() => sequence("pre", "ol").collect(mark), {
    name: "Error",
    message: "esperaba <ol> después de <pre>, encontré <p>",
  });
});

test("section runs to a bigger heading, to <!-- /as --> or to the end", () => {
  const md = "# Page\n\n<!-- as: x -->\n\n## One\n\ntext\n\n## Two\n\n<!-- /as -->\n\n## After\n";
  const nodes = section("h2").collect(firstMark(md));
  assert.deepEqual(nodes.map((n) => n.textContent.trim()), ["One", "text", "Two"]);
  const open = section("h2").collect(firstMark("<!-- as: x -->\n\n## One\n\n## Two\n\n# Next\n"));
  assert.deepEqual(open.map((n) => n.textContent.trim()), ["One", "Two"]);
});

test("prepare names the components there are when the name is unknown", () => {
  const known = new Map([["stepper", { name: "stepper", attrs: [] }]]);
  assert.throws(() => prepare(firstMark("<!-- as: steper -->\n\n## A\n"), known),
    /no hay un componente "steper"; los que hay: stepper/);
});

test("prepare fails on an attribute the component doesn't know", () => {
  const known = new Map([["stepper", { name: "stepper", attrs: [] }]]);
  assert.throws(() => prepare(firstMark('<!-- as: stepper colour="red" -->\n\n## A\n'), known),
    /stepper no conoce "colour"; conoce: ninguno/);
});

test("ShapeError is the error a component throws when its Markdown doesn't fit", () => {
  assert.ok(new ShapeError("x") instanceof Error);
});

test("page takes everything under the marker and leaves what is above", () => {
  const md = "# Retro\n\nIntro.\n\n<!-- as: x -->\n\n## Semana\n\n| a |\n| - |\n| 1 |\n\n# Otra\n";
  assert.deepEqual(page().collect(firstMark(md)).map((n) => n.localName), ["h2", "table", "h1"]);
  assert.deepEqual(page().collect(firstMark("# Retro\n\n<!-- as: x -->\n")), []);
});

/** A whole-page component that reads a JSON file and refuses one without weeks. */
const retro = {
  name: "retro",
  takes: page().json("src"),
  attrs: ["title"],
  read({ nodes, attrs, data }) {
    if (!Array.isArray(data?.weeks)) throw new ShapeError("retro necesita { weeks: [...] }");
    return { weeks: data.weeks, title: attrs.title, fallback: nodes.length };
  },
  view: () => null,
};
const RETRO = new Map([["retro", retro]]);

test("a shape with .json() reads the file the marker names, through the loader it is given", () => {
  const asked = [];
  const load = (src) => (asked.push(src), { weeks: [1, 2] });
  const { props } = prepare(firstMark('<!-- as: retro src="retro.json" title="Nov" -->\n\nOn GitHub.\n'), RETRO, { load });
  assert.deepEqual(asked, ["retro.json"]);
  assert.deepEqual(props, { weeks: [1, 2], title: "Nov", fallback: 1 });
});

test("a .json() marker says when its file is missing, unread or the wrong shape", () => {
  const mark = (md) => firstMark(md);
  assert.throws(() => prepare(mark("<!-- as: retro -->\n"), RETRO, { load: () => ({}) }),
    /retro lee un JSON: falta src="archivo.json" en la marca/);
  assert.throws(() => prepare(mark('<!-- as: retro src="r.json" -->\n'), RETRO),
    /retro lee r.json, y aquí no hay cómo cargarlo/);
  assert.throws(() => prepare(mark('<!-- as: retro src="r.json" -->\n'), RETRO, { load: () => ({}) }),
    /retro necesita \{ weeks: \[...\] \}/);
  assert.throws(() => prepare(mark('<!-- as: retro href="r.json" -->\n'), RETRO, { load: () => ({}) }),
    /retro no conoce "href"; conoce: title, src/);
});

test("jsonSources lists the files the page's .json() markers name, and nothing else", () => {
  const md = '<!-- as: retro src="a.json" -->\n\n<!-- as: stepper src="b.json" -->\n\n<!-- as: nadie src="c.json" -->\n\n<!-- as: Mal -->\n';
  const { document } = parseHTML(`<main>${marked.parse(md)}</main>`);
  const known = new Map([...RETRO, ["stepper", { name: "stepper", takes: section("h2"), attrs: [] }]]);
  assert.deepEqual(jsonSources(document.querySelector("main"), known), ["a.json"]);
});

test("addComponents adds a repo's components and refuses a stray export or a taken name", () => {
  const stepper = { name: "stepper", takes: section("h2"), read() {}, view() {} };
  const { components, problems } = addComponents([stepper], {
    "propios/retro.js": { retro, helper: () => 1 },
    "propios/otro.js": { stepper: { ...stepper } },
  });
  assert.deepEqual(components.map((c) => c.name), ["stepper", "retro"]);
  assert.deepEqual(problems, [
    'propios/retro.js exporta "helper", que no es un componente: le falta takes, read, view',
    'propios/otro.js: ya hay un componente "stepper"; ponele otro nombre',
  ]);
});
