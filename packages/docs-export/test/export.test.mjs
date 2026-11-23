// Unit tests mirroring motor/export.js: immutability, metadata fields, variable accumulation,
// and toTypst / toPdf orchestration with double engines.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_INPUT_FORMAT,
  Export,
  MERMAID_FILTER_FILE,
  TEMPLATE_FILE,
} from "../motor/mod.js";

test("Export is immutable and keeps each metadata field distinct while merging templateVariables", () => {
  const base = Export.ofMarkdown("# Hola\n");
  const withMeta = base
    .title("Guía")
    .subtitle("Edición 2026")
    .author("Christian")
    .date("2026-11-23")
    .toc();
  const withVars = withMeta
    .templateVariables({ brand: "Kiri", "color-accent": "#0891b2" })
    .templateVariables({ "color-accent": "#0e7490", extra: "yes" });

  assert.notEqual(base, withMeta);
  assert.notEqual(withMeta, withVars);
  assert.ok(Object.isFrozen(base));
  assert.ok(Object.isFrozen(withVars));

  assert.deepEqual(base.toPandocRequest(), {
    options: { from: DEFAULT_INPUT_FORMAT, to: "typst", standalone: true },
    files: {},
  });
  assert.deepEqual(withVars.toPandocRequest(), {
    options: {
      from: DEFAULT_INPUT_FORMAT,
      to: "typst",
      standalone: true,
      metadata: {
        title: "Guía",
        subtitle: "Edición 2026",
        author: "Christian",
        date: "2026-11-23",
      },
      "table-of-contents": true,
      variables: {
        brand: "Kiri",
        "color-accent": "#0e7490",
        extra: "yes",
      },
    },
    files: {},
  });
});

test("toPdf runs Pandoc, splices Mermaid SVGs, and passes final Typst to engines.compilePdf", async () => {
  const seen = { pandoc: null, compilePdf: null };
  const fakePdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
  const mockEngines = {
    async pandoc(req) {
      seen.pandoc = req;
      return "= Title\n%%MERMAID_SVG_0%%\n";
    },
    async compilePdf(source) {
      seen.compilePdf = source;
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
  assert.match(seen.compilePdf, /#image\(bytes\("<svg id=\\"one\\"\/>"\), format: "svg", width: 80%\)/);
});

test("toPdf fails fast before invoking pandoc when engines.compilePdf is missing", async () => {
  let pandocCalled = false;
  await assert.rejects(
    () => Export.ofMarkdown("# Hi\n").toPdf({
      pandoc() {
        pandocCalled = true;
        return "= Hi";
      },
    }),
    /engines\.compilePdf/,
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
      compilePdf: () => new Uint8Array(0),
    }),
    /PDF vacío/,
  );
});
