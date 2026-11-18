// file-links: a link without .md opens the file, from the folder of the page, also when the site
// is published under a folder (GitHub Pages serves a repo at /<repo>/).
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { fileLinks } from "../plugins/file-links.js";

/** Runs the plugin on one page of a site at `url` and returns where its link ends up. */
function linkAfter(url, file, href) {
  const { document } = parseHTML(`<main id="main"><a href="${href}">x</a></main>`);
  globalThis.document = document;
  globalThis.location = new URL(url);
  const hooks = {};
  const hook = { init: (f) => (hooks.init = f), doneEach: (f) => (hooks.doneEach = f) };
  const vm = { config: {}, route: { file } };
  fileLinks()(hook, vm);
  hooks.init();
  hooks.doneEach();
  return document.querySelector("a").getAttribute("href");
}

test("a site at the root of its domain", () => {
  assert.equal(linkAfter("http://localhost:3011/#/bin/SCRIPTS", "bin/SCRIPTS.md", "kiri-pm"), "/bin/kiri-pm");
});

test("a site under a folder, like GitHub Pages", () => {
  assert.equal(
    linkAfter("https://kiri23.github.io/MyClaudeSkills/#/bin/SCRIPTS", "bin/SCRIPTS.md", "../conducta/x.ttl"),
    "/MyClaudeSkills/conducta/x.ttl",
  );
});

test("a link to a page or another site is left alone", () => {
  assert.equal(linkAfter("http://h/#/README", "README.md", "#/other"), "#/other");
  assert.equal(linkAfter("http://h/#/README", "README.md", "https://github.com"), "https://github.com");
});
