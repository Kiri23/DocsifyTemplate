// frame-open: each iframe of a page gets a link above it that opens what it shows in a new tab.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { addOpenLinks } from "../plugins/frame-open.js";

test("an iframe gets a link to its page, in a new tab, once", () => {
  const { document } = parseHTML(
    `<main id="main"><p>Texto</p><iframe src="prs/55.html" width="100%"></iframe></main>`,
  );
  const main = document.querySelector("#main");
  assert.equal(addOpenLinks(main), 1);
  const link = document.querySelector("iframe").previousElementSibling;
  assert.equal(link.className, "frame-open");
  assert.match(link.getAttribute("href"), /prs\/55\.html$/);
  assert.equal(link.getAttribute("target"), "_blank");
  assert.equal(link.getAttribute("rel"), "noopener");
  // Drawn again, the page keeps its one link.
  assert.equal(addOpenLinks(main), 0);
  assert.equal(document.querySelectorAll(".frame-open").length, 1);
});

test("a page without iframes gets nothing", () => {
  const { document } = parseHTML(`<main id="main"><p>Texto</p></main>`);
  assert.equal(addOpenLinks(document.querySelector("#main")), 0);
});
