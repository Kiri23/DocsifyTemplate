// glossary-terms: each term of a GLOSSARY.md gets the id kiri-glosario gives it in vocabulary.ttl,
// so a link with ?id=<slug> (from a PR summary or a PR body) lands on it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseHTML } from "linkedom";
import { marked } from "marked";
import { glossaryTerms, markTerms, termSlug } from "../plugins/glossary-terms.js";

const ROOT = new URL("../../../", import.meta.url);

/** The repo's GLOSSARY.md drawn as Docsify would draw it, inside #main. */
async function glossaryPage() {
  const markdown = await readFile(new URL("GLOSSARY.md", ROOT), "utf8");
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

test("the names not to use go on their own line, and other paragraphs are left alone", () => {
  const { document } = parseHTML(
    `<main id="main"><p><strong>Motor</strong>:\nLa parte que convierte.\n<em>Avoid</em>: core, engine</p>` +
      `<p><strong>Nota</strong> sin dos puntos.</p><p>Texto con <strong>negrita</strong>: no es término.</p></main>`,
  );
  assert.deepEqual(markTerms(document.querySelector("#main")), ["motor"]);
  const term = document.getElementById("motor");
  assert.equal(term.querySelector(".glossary-term-avoid").textContent, "Avoid: core, engine");
  assert.equal(document.querySelectorAll(".glossary-term").length, 1);
});

/** Runs the plugin on a page and returns the page's document afterwards. */
async function afterPlugin(file, query) {
  const document = await glossaryPage();
  globalThis.document = document;
  let scrolled = null;
  document.defaultView.HTMLElement.prototype.scrollIntoView = function () {
    scrolled = this.id;
  };
  const hooks = {};
  glossaryTerms()({ doneEach: (f) => (hooks.doneEach = f) }, { route: { file, query } });
  hooks.doneEach();
  return { document, scrolled };
}

test("on the glossary page, a link with ?id= lands on its term", async () => {
  const { document, scrolled } = await afterPlugin("_catalogo/GLOSSARY.md", { id: "engines" });
  assert.equal(scrolled, "engines");
  assert.ok(document.getElementById("engines").classList.contains("glossary-term-wanted"));
});

test("on any other page the plugin does nothing", async () => {
  const { document, scrolled } = await afterPlugin("README.md", { id: "engines" });
  assert.equal(scrolled, null);
  assert.equal(document.querySelectorAll(".glossary-term").length, 0);
});
