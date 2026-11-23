// Integration tests for the Node transport against the local pandoc binary (and typst when present).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import * as builtIn from "../../docs-site/components/mod.js";
import { Export } from "../motor/mod.js";
import {
  defaultMermaidFilterSource,
  defaultTemplateSource,
  hasCommand,
  systemEngines,
} from "../transportes/node/mod.js";

const TERMINAL_DOC = fileURLToPath(
  new URL("../../docs-site/docs/componentes/terminal.md", import.meta.url),
);
const BUILT_IN_MAP = new Map(Object.values(builtIn).map((c) => [c.name, c]));

test("systemEngines converts real terminal.md to clean Typst with 3 terminal windows and intact example", async () => {
  const [markdown, template, mermaidFilter] = await Promise.all([
    readFile(TERMINAL_DOC, "utf8"),
    defaultTemplateSource(),
    defaultMermaidFilterSource(),
  ]);

  const typst = await Export.ofMarkdown(markdown)
    .title("Terminal")
    .toc()
    .templateSource(template)
    .mermaidFilterSource(mermaidFilter)
    .components(BUILT_IN_MAP)
    .toTypst(systemEngines());

  assert.equal((typst.match(/#terminal-window\(/g) ?? []).length, 3);
  assert.ok(typst.includes('command: "npm run check:docs -- packages/docs-site/docs"'));
  assert.ok(typst.includes('estado: "prototipo"'));
  assert.ok(typst.includes('nota: "Salida simulada para revisar columnas antes de implementar el comando."'));
  assert.ok(typst.includes('<!-- as: terminal exit="0" -->'));
  assert.ok(typst.includes("`$ `"), "gfm+raw_attribute should keep trailing space in inline code");
  assert.ok(typst.includes("#outline(indent: auto)"));
  assert.ok(typst.includes("#let horizontalrule ="));
});

test("metadata title with # and $ is escaped by Pandoc, and --- emits #horizontalrule", async () => {
  const template = await defaultTemplateSource();
  const typst = await Export.ofMarkdown("# Intro\n\n---\n\nFin.\n")
    .title("C# & $5 #evil()")
    .templateSource(template)
    .toTypst(systemEngines());

  assert.ok(typst.includes("C\\# & \\$5"));
  assert.ok(!typst.includes("[C# & $5 #evil()]"));
  assert.ok(typst.includes("#horizontalrule"));
});

test("mermaid-placeholder.lua + inlineMermaidSvgs splices SVGs into Pandoc Typst output", async () => {
  const [template, mermaidFilter] = await Promise.all([
    defaultTemplateSource(),
    defaultMermaidFilterSource(),
  ]);
  const md = "# Diagrama\n\n```mermaid\ngraph LR\n  A --> B\n```\n";

  const typst = await Export.ofMarkdown(md)
    .templateSource(template)
    .mermaidFilterSource(mermaidFilter)
    .mermaidSvgs(['<svg viewBox="0 0 100 50"><text>A to B</text></svg>'])
    .toTypst(systemEngines());

  assert.ok(!typst.includes("%%MERMAID_SVG_0%%"));
  assert.ok(
    typst.includes('#image(bytes("<svg viewBox=\\"0 0 100 50\\"><text>A to B</text></svg>"), format: "svg", width: 80%)'),
  );
});

test("systemEngines reports clear errors when binaries are missing or virtual filenames escape tmpdir", async () => {
  const missing = systemEngines({
    pandocBin: "pandoc-definitely-not-installed",
    typstBin: "typst-definitely-not-installed",
  });

  await assert.rejects(
    () => Export.ofMarkdown("# Hola\n").toTypst(missing),
    /pandoc no está instalado.*brew install pandoc/,
  );

  await assert.rejects(
    () => Export.ofMarkdown("# Hola\n").toPdf({ ...systemEngines(), typst: missing.typst }),
    /typst no está instalado.*brew install typst/,
  );

  await assert.rejects(
    () => systemEngines().pandoc({
      options: { from: "gfm+raw_attribute", to: "typst" },
      stdin: "# Hola\n",
      files: { "../escape.typ": "bad" },
    }),
    /nombre de archivo virtual inválido/,
  );
});

test(
  "systemEngines compiles real terminal.md to a valid PDF when typst is installed",
  { skip: !hasCommand("typst") && process.env.CI !== "true" ? "typst binary not installed locally" : false },
  async () => {
    const [markdown, template] = await Promise.all([
      readFile(TERMINAL_DOC, "utf8"),
      defaultTemplateSource(),
    ]);

    const pdf = await Export.ofMarkdown(markdown)
      .title("Terminal")
      .templateSource(template)
      .components(BUILT_IN_MAP)
      .toPdf(systemEngines());

    assert.ok(pdf instanceof Uint8Array);
    assert.ok(pdf.byteLength > 500);
    assert.equal(Buffer.from(pdf.slice(0, 5)).toString("ascii"), "%PDF-");
  },
);
