// Unit tests for transportes/browser/mermaid-capture.js on a page built with linkedom.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { captureMermaidSvgs, countMermaidFences, inlineMermaidSvgs } from "../transportes/browser/mod.js";

const PAGE = `<!DOCTYPE html><html><body><article class="markdown-section">
  <h1>Flujo</h1>
  <div class="mermaid"><svg viewBox="0 0 200 100" id="uno">
    <g><foreignObject x="10" y="20" width="80" height="30"><div><span> Inicio </span></div></foreignObject></g>
  </svg></div>
  <p>Texto</p>
  <div class="mermaid"><svg xmlns="http://www.w3.org/2000/svg" id="dos"><rect width="5" height="5"/></svg></div>
  <svg id="ajeno"></svg>
</article></body></html>`;

test("captureMermaidSvgs takes only drawn diagrams, in page order, as SVG text", () => {
  const { document } = parseHTML(PAGE);
  const svgs = captureMermaidSvgs(document.querySelector(".markdown-section"));
  assert.equal(svgs.length, 2);
  assert.match(svgs[0], /id="uno"/);
  assert.match(svgs[1], /id="dos"/);
  for (const svg of svgs) assert.match(svg, /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
});

test("captureMermaidSvgs turns HTML labels into centered SVG text Typst can draw", () => {
  const { document } = parseHTML(PAGE);
  const [first] = captureMermaidSvgs(document.querySelector(".markdown-section"));
  assert.doesNotMatch(first, /foreignObject/i);
  const label = parseHTML(`<html><body>${first}</body></html>`).document.querySelector("text");
  assert.equal(label.textContent, "Inicio");
  assert.equal(label.getAttribute("x"), "50");
  assert.equal(label.getAttribute("y"), "40");
  assert.equal(label.getAttribute("text-anchor"), "middle");
});

test("captureMermaidSvgs leaves the page untouched", () => {
  const { document } = parseHTML(PAGE);
  const section = document.querySelector(".markdown-section");
  const before = section.innerHTML;
  captureMermaidSvgs(section);
  assert.equal(section.innerHTML, before);
});

test("countMermaidFences counts mermaid blocks and ignores ones quoted inside other code", () => {
  const markdown = [
    "# Doc",
    "```mermaid",
    "graph LR; A-->B",
    "```",
    "````markdown",
    "```mermaid",
    "graph LR; C-->D",
    "```",
    "````",
    "~~~ mermaid",
    "sequenceDiagram",
    "~~~",
    "```js",
    "const mermaid = 1;",
    "```",
  ].join("\n");
  assert.equal(countMermaidFences(markdown), 2);
  assert.equal(countMermaidFences("sin diagramas"), 0);
});

test("captured diagrams splice into Pandoc's placeholders through inlineMermaidSvgs", () => {
  const { document } = parseHTML(PAGE);
  const svgs = captureMermaidSvgs(document.querySelector(".markdown-section"));
  const typst = inlineMermaidSvgs("A\n%%MERMAID_SVG_0%%\nB\n%%MERMAID_SVG_1%%\n", svgs);
  assert.doesNotMatch(typst, /%%MERMAID_SVG_/);
  assert.equal((typst.match(/#image\(bytes\("/g) || []).length, 2);
  assert.match(typst, /format: "svg"/);
});
