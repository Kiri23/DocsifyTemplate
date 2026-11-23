// Unit tests for the runtime-agnostic core: Export immutability, Pandoc defaults building,
// inlineMermaidSvgs, and toTypst/toPdf orchestration with double engines.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildPandocRequest,
  DEFAULT_INPUT_FORMAT,
  Export,
  inlineMermaidSvgs,
  MERMAID_FILTER_FILE,
  TEMPLATE_FILE,
} from "../motor/mod.js";

test("Export is immutable: each fluent call returns a new frozen instance", () => {
  const base = Export.ofMarkdown("# Hola\n");
  const withTitle = base.title("Guía");
  const withToc = withTitle.toc().author("Christian").templateVariables({ brand: "Kiri" });

  assert.notEqual(base, withTitle);
  assert.notEqual(withTitle, withToc);
  assert.ok(Object.isFrozen(base));
  assert.ok(Object.isFrozen(withToc));

  assert.deepEqual(base.toPandocRequest(), {
    options: { from: DEFAULT_INPUT_FORMAT, to: "typst", standalone: true },
    files: {},
  });
  assert.deepEqual(withTitle.toPandocRequest(), {
    options: {
      from: DEFAULT_INPUT_FORMAT,
      to: "typst",
      standalone: true,
      metadata: { title: "Guía" },
    },
    files: {},
  });
  assert.deepEqual(withToc.toPandocRequest(), {
    options: {
      from: DEFAULT_INPUT_FORMAT,
      to: "typst",
      standalone: true,
      metadata: { title: "Guía", author: "Christian" },
      "table-of-contents": true,
      variables: { brand: "Kiri" },
    },
    files: {},
  });
});

test("buildPandocRequest places template and Lua filter text in virtual files", () => {
  const request = buildPandocRequest({
    title: "C# & $5",
    subtitle: "Sub",
    date: "2026-11-23",
    templateSource: "$body$",
    mermaidFilterSource: "return {}",
    templateVariables: { "color-accent": "#0891b2" },
  });

  assert.deepEqual(request.options, {
    from: DEFAULT_INPUT_FORMAT,
    to: "typst",
    standalone: true,
    metadata: { title: "C# & $5", subtitle: "Sub", date: "2026-11-23" },
    template: TEMPLATE_FILE,
    variables: { "color-accent": "#0891b2" },
    filters: [MERMAID_FILTER_FILE],
  });
  assert.deepEqual(request.files, {
    [TEMPLATE_FILE]: "$body$",
    [MERMAID_FILTER_FILE]: "return {}",
  });
});

test("inlineMermaidSvgs splices escaped SVGs and strips unmatched placeholders", () => {
  const typst = "Before\n%%MERMAID_SVG_0%%\nMiddle\n%%MERMAID_SVG_1%%\n%%MERMAID_SVG_2%%\nAfter";
  const result = inlineMermaidSvgs(typst, [
    '<svg viewBox="0 0 10 10"><text>a\\b</text></svg>',
    '<svg><line x1="0" y1="0"/></svg>',
  ]);

  assert.ok(result.includes('#image(bytes("<svg viewBox=\\"0 0 10 10\\"><text>a\\\\b</text></svg>"), format: "svg", width: 80%)'));
  assert.ok(result.includes('#image(bytes("<svg><line x1=\\"0\\" y1=\\"0\\"/></svg>"), format: "svg", width: 80%)'));
  assert.ok(!result.includes("%%MERMAID_SVG_"));
});

test("toPdf runs Pandoc, splices Mermaid SVGs, and passes final Typst to engines.typst", async () => {
  const seen = { pandoc: null, typst: null };
  const fakePdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
  const mockEngines = {
    async pandoc(req) {
      seen.pandoc = req;
      return "= Title\n%%MERMAID_SVG_0%%\n";
    },
    async typst(source) {
      seen.typst = source;
      return fakePdf;
    },
  };

  const pdf = await Export.ofMarkdown("# Title\n")
    .title("Title")
    .templateSource("$body$")
    .mermaidFilterSource("return {}")
    .mermaidSvgs(['<svg id="one"/>'])
    .toPdf(mockEngines);

  assert.deepEqual(pdf, fakePdf);
  assert.equal(seen.pandoc.stdin, "# Title\n");
  assert.equal(seen.pandoc.files[TEMPLATE_FILE], "$body$");
  assert.equal(seen.pandoc.files[MERMAID_FILTER_FILE], "return {}");
  assert.match(seen.typst, /#image\(bytes\("<svg id=\\"one\\"\/>"\), format: "svg", width: 80%\)/);
});

test("toPdf fails fast before invoking pandoc when engines.typst is missing", async () => {
  let pandocCalled = false;
  await assert.rejects(
    () => Export.ofMarkdown("# Hi\n").toPdf({
      pandoc() {
        pandocCalled = true;
        return "= Hi";
      },
    }),
    /engines\.typst/,
  );
  assert.equal(pandocCalled, false);
});

test("Export validates builder arguments and engine outputs", async () => {
  assert.throws(() => Export.ofMarkdown(42), TypeError);
  assert.throws(() => Export.ofMarkdown("ok").title(null), TypeError);
  assert.throws(() => Export.ofMarkdown("ok").mermaidSvgs("not-an-array"), TypeError);
  assert.throws(() => Export.ofMarkdown("ok").templateVariables(["a"]), TypeError);

  await assert.rejects(
    () => Export.ofMarkdown("ok").toTypst({}),
    /engines\.pandoc/,
  );
  await assert.rejects(
    () => Export.ofMarkdown("ok").toPdf({
      pandoc: () => "= ok",
      typst: () => new Uint8Array(0),
    }),
    /PDF vacío/,
  );
});
