// Unit tests mirroring motor/mermaid.js.
import { test } from "node:test";
import assert from "node:assert/strict";
import { inlineMermaidSvgs } from "../motor/mod.js";

test("inlineMermaidSvgs splices escaped SVGs and strips unmatched placeholders", () => {
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
});
