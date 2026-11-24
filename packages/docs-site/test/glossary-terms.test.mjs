// glossary-terms: each term of a GLOSSARY.md gets the id kiri-glosario gives it in vocabulary.ttl,
// so a link with ?id=<slug> (from a PR summary or a PR body) lands on it. The page also gets a
// search box and an index of its groups, built from the drawn Markdown.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseHTML } from "linkedom";
import { marked } from "marked";
import { buildTools, filterTerms, glossaryTerms, landOn, markTerms, termSlug } from "../plugins/glossary-terms.js";

const ROOT = new URL("../../../", import.meta.url);

/** A glossary with two groups, as the search and the index need. */
const TWO_GROUPS = `# Ejemplo

Un glosario de prueba.

## El sitio

**site.js**:
El Docsify de este repo ya armado.
_Avoid_: el loader, el script de Docsify

## Exportar

**Motor**:
La parte que convierte una página sin saber dónde corre.
_Avoid_: core, engine

**Transporte**:
La parte que lleva el Motor a un lugar donde corre.
_Avoid_: adapter, wrapper

**engines**:
Las herramientas con las que el Motor convierte.
_Avoid_: motores, backends
`;

/** A GLOSSARY.md drawn as Docsify would draw it, inside #main: the repo's, or the given Markdown. */
async function glossaryPage(markdown) {
  markdown ??= await readFile(new URL("GLOSSARY.md", ROOT), "utf8");
  return parseHTML(`<main id="main"><section class="markdown-section">${marked.parse(markdown)}</section></main>`).document;
}

test("the slug is the one kiri-glosario writes", () => {
  assert.equal(termSlug("site.js"), "site-js");
  assert.equal(termSlug("Área de trabajo"), "area-de-trabajo");
  assert.equal(termSlug("engines"), "engines");
});

// Also the check that vocabulary.ttl is not behind GLOSSARY.md: kiri-glosario lives in a private repo,
// so CI cannot run its --check. A term added without regenerating the .ttl fails here.
test("every term of the repo's glossary gets the id of its concept in vocabulary.ttl", async () => {
  const ids = markTerms((await glossaryPage()).querySelector("#main"));
  const ttl = await readFile(new URL("vocabulary.ttl", ROOT), "utf8");
  const concepts = [...ttl.matchAll(/^glosario:([a-z0-9-]+) a skos:Concept ;/gm)].map((match) => match[1]);
  assert.deepEqual(ids, concepts);
});

test("an entry has its name and address on one side, its definition and the names not to use on the other", () => {
  const { document } = parseHTML(
    `<main id="main"><p><strong>Motor</strong>:\nLa parte que convierte.\n<em>Avoid</em>: core, engine</p>` +
      `<p><strong>Nota</strong> sin dos puntos.</p><p>Texto con <strong>negrita</strong>: no es término.</p></main>`,
  );
  const main = document.querySelector("#main");
  assert.deepEqual(markTerms(main, "/_catalogo/GLOSSARY"), ["motor"]);
  const term = document.getElementById("motor");
  assert.equal(term.querySelector(".glossary-term-name").textContent, "Motor");
  assert.equal(term.querySelector(".glossary-term-link").getAttribute("href"), "#/_catalogo/GLOSSARY?id=motor");
  assert.equal(term.querySelector(".glossary-term-definition").textContent.trim(), "La parte que convierte.");
  assert.equal(term.querySelector(".glossary-term-avoid").textContent, "No digas core, engine");
  assert.deepEqual([...term.querySelectorAll(".glossary-term-avoid s")].map((s) => s.textContent), ["core", "engine"]);
  assert.equal(document.querySelectorAll(".glossary-term").length, 1);
  // Marking the same page twice changes nothing.
  assert.deepEqual(markTerms(main, "/_catalogo/GLOSSARY"), ["motor"]);
  assert.equal(term.querySelectorAll(".glossary-term-link").length, 1);
});

/** The two-group glossary with its entries laid out and its search box built. */
async function builtPage() {
  const document = await glossaryPage(TWO_GROUPS);
  const main = document.querySelector("#main");
  // Docsify gives each heading an id; marked alone does not.
  for (const heading of main.querySelectorAll("h2")) heading.id = termSlug(heading.textContent);
  markTerms(main, "/_catalogo/GLOSSARY");
  return { document, main, input: buildTools(main) };
}

/** The ids of the terms the page shows. */
function shownTerms(main) {
  return [...main.querySelectorAll("p.glossary-term")].filter((term) => !term.hidden).map((term) => term.id);
}

test("the page gets a search box and an index of its groups with how many terms each has", async () => {
  const { main, input } = await builtPage();
  assert.equal(main.querySelector("label.glossary-search-label").getAttribute("for"), input.id);
  assert.equal(main.querySelector(".glossary-status").textContent, "4 términos en 2 grupos");
  const index = [...main.querySelectorAll(".glossary-index-entry")].map((entry) => [
    entry.querySelector(".glossary-index-name").textContent,
    entry.querySelector(".glossary-index-count").textContent,
    entry.getAttribute("href"),
  ]);
  assert.deepEqual(index, [["El sitio", "1", "#el-sitio"], ["Exportar", "3", "#exportar"]]);
  // The tools go above the first group, after the title and the introduction.
  assert.equal(main.querySelector(".glossary-tools").nextElementSibling.tagName, "H2");
  // Built once: a second call returns the same box.
  assert.equal(buildTools(main), input);
  assert.equal(main.querySelectorAll(".glossary-tools").length, 1);
});

test("the search finds a term by its name, its definition or a name not to use, without accents", async () => {
  const { main } = await builtPage();
  assert.equal(filterTerms(main, "site.j"), 1);
  assert.deepEqual(shownTerms(main), ["site-js"]);
  // The labels of an entry ("No digas", its address) are not what it says.
  assert.equal(filterTerms(main, "no digas"), 0);
  assert.equal(filterTerms(main, "PAGINA"), 1);
  assert.deepEqual(shownTerms(main), ["motor"]);
  assert.equal(filterTerms(main, "wrapper"), 1);
  assert.deepEqual(shownTerms(main), ["transporte"]);
  // A group with no term left hides with its heading, and the index says so.
  assert.equal(main.querySelector("#el-sitio").hidden, true);
  assert.equal(main.querySelector("#exportar").hidden, false);
  assert.equal(main.querySelector('[data-group="el-sitio"] .glossary-index-count').textContent, "0");
  assert.equal(main.querySelector('[data-group="el-sitio"]').getAttribute("tabindex"), "-1");
  assert.equal(main.querySelector(".glossary-status").textContent, "1 de 4 términos");
  assert.equal(filterTerms(main, "  "), 4);
  assert.equal(main.querySelector("#el-sitio").hidden, false);
  assert.equal(main.querySelector('[data-group="el-sitio"]').hasAttribute("tabindex"), false);
});

test("typing in the box filters, and a search with no result offers to clear it", async () => {
  const { document, main, input } = await builtPage();
  const Event = document.defaultView.Event;
  input.value = "zzz";
  input.dispatchEvent(new Event("input"));
  assert.deepEqual(shownTerms(main), []);
  const empty = main.querySelector(".glossary-empty");
  assert.equal(empty.hidden, false);
  assert.equal(empty.querySelector(".glossary-empty-query").textContent, "zzz");
  assert.equal(main.querySelector(".glossary-index").hidden, true);
  empty.querySelector("button").dispatchEvent(new Event("click"));
  assert.equal(input.value, "");
  assert.equal(empty.hidden, true);
  assert.equal(shownTerms(main).length, 4);
});

test("a glossary with one group gets no index, and a page with no terms gets no search box", () => {
  const one = parseHTML(`<main id="main"><h1>X</h1><h2 id="a">A</h2><p><strong>Uno</strong>: def.</p></main>`).document;
  markTerms(one.querySelector("#main"));
  assert.ok(buildTools(one.querySelector("#main")));
  assert.equal(one.querySelector(".glossary-index"), null);
  assert.equal(one.querySelector(".glossary-status").textContent, "1 término en 1 grupo");
  const none = parseHTML(`<main id="main"><h1>X</h1><h2>A</h2><p>Nada.</p></main>`).document;
  markTerms(none.querySelector("#main"));
  assert.equal(buildTools(none.querySelector("#main")), null);
});

test("landing on a term marks only that one and shows it even if a search was hiding it", async () => {
  const { main, input } = await builtPage();
  main.ownerDocument.defaultView.HTMLElement.prototype.scrollIntoView = function () {};
  assert.equal(landOn(main, "motor"), true);
  input.value = "site";
  filterTerms(main, "site");
  assert.equal(landOn(main, "engines"), true);
  assert.deepEqual([...main.querySelectorAll(".glossary-term-wanted")].map((term) => term.id), ["engines"]);
  assert.equal(main.querySelector("#engines").hidden, false);
  assert.equal(input.value, "");
  assert.equal(landOn(main, "no-existe"), false);
  assert.equal(main.querySelectorAll(".glossary-term-wanted").length, 0);
});

/** Runs the plugin on a page and returns the page's document afterwards. */
async function afterPlugin(file, query) {
  const document = await glossaryPage(TWO_GROUPS);
  globalThis.document = document;
  let scrolled = null;
  document.defaultView.HTMLElement.prototype.scrollIntoView = function () {
    scrolled = this.id;
  };
  const hooks = {};
  glossaryTerms()(
    { doneEach: (f) => (hooks.doneEach = f), mounted: () => {} },
    { route: { file, query, path: "/" + file.replace(/\.md$/, "") } },
  );
  hooks.doneEach();
  return { document, scrolled };
}

test("on the glossary page, a link with ?id= lands on its term", async () => {
  const { document, scrolled } = await afterPlugin("_catalogo/GLOSSARY.md", { id: "engines" });
  assert.equal(scrolled, "engines");
  assert.ok(document.getElementById("engines").classList.contains("glossary-term-wanted"));
  assert.equal(document.querySelector("#engines .glossary-term-link").getAttribute("href"), "#/_catalogo/GLOSSARY?id=engines");
  assert.equal(document.querySelectorAll(".glossary-tools").length, 1);
});

test("on any other page the plugin does nothing", async () => {
  const { document, scrolled } = await afterPlugin("README.md", { id: "engines" });
  assert.equal(scrolled, null);
  assert.equal(document.querySelectorAll(".glossary-term").length, 0);
  assert.equal(document.querySelectorAll(".glossary-tools").length, 0);
});
