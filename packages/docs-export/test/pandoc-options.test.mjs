// Unit tests mirroring motor/pandoc-options.js.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildPandocRequest,
  DEFAULT_INPUT_FORMAT,
  MERMAID_FILTER_FILE,
  TEMPLATE_FILE,
} from "../motor/mod.js";

test("buildPandocRequest places template and Lua filter text in virtual files", () => {
  const request = buildPandocRequest({
    title: "C# & $5",
    subtitle: "Sub",
    author: "Ada",
    date: "2026-11-23",
    toc: true,
    templateSource: "$body$",
    mermaidFilterSource: "return {}",
    mermaidSvgs: ["<svg/>"],
    templateVariables: { "color-accent": "#0891b2" },
  });

  assert.deepEqual(request.options, {
    from: DEFAULT_INPUT_FORMAT,
    to: "typst",
    standalone: true,
    metadata: { title: "C# & $5", subtitle: "Sub", author: "Ada", date: "2026-11-23" },
    "table-of-contents": true,
    template: TEMPLATE_FILE,
    variables: { "color-accent": "#0891b2" },
    filters: [MERMAID_FILTER_FILE],
  });
  assert.deepEqual(request.files, {
    [TEMPLATE_FILE]: "$body$",
    [MERMAID_FILTER_FILE]: "return {}",
  });
});

test("the Mermaid filter only goes to Pandoc when there are captured diagrams", () => {
  assert.equal(buildPandocRequest({ mermaidFilterSource: "return {}" }).options.filters, undefined);
  assert.equal(buildPandocRequest({ mermaidFilterSource: "return {}", mermaidSvgs: [] }).options.filters, undefined);
  assert.deepEqual(
    Object.keys(buildPandocRequest({ mermaidFilterSource: "return {}", mermaidSvgs: ["<svg/>"] }).files),
    ["mermaid-placeholder.lua"],
  );
});
