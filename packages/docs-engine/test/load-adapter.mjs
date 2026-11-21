// Loads the Docsify adapter the way a page does, with linkedom in place of the browser, and says
// what it registered. adapter.test.mjs runs it in its own process per case, so each load starts
// clean. With "own" as its argument, the page's config brings a component of its own first.
import { parseHTML } from "linkedom";
import jsyaml from "js-yaml";

const page = parseHTML("<!DOCTYPE html><html><head></head><body><div id=app></div></body></html>");
globalThis.window = globalThis;
for (const name of ["document", "HTMLElement", "customElements", "Node", "MutationObserver", "CustomEvent", "Event"]) {
  if (!(name in globalThis) && page[name]) globalThis[name] = page[name];
}
globalThis.document = page.document;
globalThis.HTMLElement = page.HTMLElement;
globalThis.customElements = page.customElements;
globalThis.jsyaml = jsyaml;
if (process.argv[2] === "own") {
  window.__docsifyTemplateConfig = { components: { "feedback-semana": ({ data }) => `FS:${data.semana}` } };
}

await import("../src/adapters/docsify/index.js");

// Each plugin of the adapter is called with a hook that counts what it registers.
const registered = { beforeEach: 0, afterEach: 0, doneEach: 0, mounted: 0, ready: 0, init: 0 };
const before = [];
const hook = Object.fromEntries(Object.keys(registered).map((name) => [name, (fn) => {
  registered[name]++;
  if (name === "beforeEach") before.push(fn);
}]));
for (const plugin of window.$docsify.plugins) plugin(hook, { route: { file: "x.md" }, config: window.$docsify });

// The markdown of a page with a fence of the page's own component, through the adapter's beforeEach.
let markdown = "# Semana\n\n```feedback-semana\nsemana: 2026-W47\n```\n";
for (const fn of before) markdown = fn(markdown) ?? markdown;

console.log(JSON.stringify({
  registered,
  own: Boolean(customElements.get("feedback-semana")),
  stock: Boolean(customElements.get("entity-schema")),
  fence: markdown.includes("<feedback-semana"),
}));
