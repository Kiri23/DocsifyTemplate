// Unit tests mirroring motor/mermaid.js.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPandocRequest, Export, inlineMermaidSvgs, MISSING_DIAGRAM_NOTE } from "../motor/mod.js";

test("inlineMermaidSvgs splices escaped SVGs and leaves a visible note for unmatched placeholders", () => {
  const typst = "Before\n%%MERMAID_SVG_0%%\nMiddle\n%%MERMAID_SVG_1%%\n%%MERMAID_SVG_2%%\nAfter";
  const result = inlineMermaidSvgs(typst, [
    '<svg viewBox="0 0 10 10"><text>a\\b</text></svg>',
    '<svg><line x1="0" y1="0"/></svg>',
  ]);

  assert.ok(
    result.includes('#image(bytes("<svg viewBox=\\"0 0 10 10\\"><text>a\\\\b</text></svg>"), format: "svg", width: 80%)'),
  );
  assert.ok(
    result.includes('#image(bytes("<svg><line x1=\\"0\\" y1=\\"0\\"/></svg>"), format: "svg", width: 80%)'),
  );
  assert.ok(!result.includes("%%MERMAID_SVG_"));
  assert.ok(result.includes(`Middle\n#image`), "the second diagram follows Middle");
  assert.ok(result.endsWith(`${MISSING_DIAGRAM_NOTE}\nAfter`), "the third placeholder becomes a note");
});

test("inlineMermaidSvgs warns once per diagram it could not place", () => {
  const warnings = [];
  inlineMermaidSvgs("%%MERMAID_SVG_0%%\n%%MERMAID_SVG_1%%", ["<svg/>"], { onWarning: (m) => warnings.push(m) });
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /diagrama Mermaid 2/);
});

test("the Mermaid filter only goes to Pandoc when there are captured diagrams", () => {
  assert.equal(buildPandocRequest({ mermaidFilterSource: "return {}" }).options.filters, undefined);
  assert.equal(buildPandocRequest({ mermaidFilterSource: "return {}", mermaidSvgs: [] }).options.filters, undefined);
  assert.deepEqual(
    Object.keys(buildPandocRequest({ mermaidFilterSource: "return {}", mermaidSvgs: ["<svg/>"] }).files),
    ["mermaid-placeholder.lua"],
  );
});

test("toTypst with the filter set and no diagrams keeps the Mermaid code instead of a placeholder", async () => {
  let request;
  const typst = await Export.ofMarkdown("```mermaid\ngraph LR\n```\n")
    .mermaidFilterSource("return {}")
    .toTypst({ pandoc: async (r) => { request = r; return "```mermaid\ngraph LR\n```\n"; } });
  assert.equal(request.options.filters, undefined);
  assert.match(typst, /graph LR/);
  assert.doesNotMatch(typst, /%%MERMAID_SVG_/);
});
