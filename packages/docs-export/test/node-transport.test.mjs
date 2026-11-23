// Integration tests for the Node transport against local Pandoc (and Typst when installed or in CI).
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as builtIn from "../../docs-site/components/mod.js";
import { expandComponentsToTypst, Export } from "../motor/mod.js";
import {
  hasCommand,
  readDefaultMermaidFilter,
  readDefaultTemplate,
  systemEngines,
} from "../transportes/node/mod.js";
import { assertBalancedTypst, BUILT_IN_MAP, PARSERS, TERMINAL_DOC } from "./helpers.mjs";

test("systemEngines converts real terminal.md to clean Typst with 3 terminal windows and intact example", async () => {
  const [markdown, template] = await Promise.all([
    readFile(TERMINAL_DOC, "utf8"),
    readDefaultTemplate(),
  ]);

  const typst = await Export.ofMarkdown(markdown)
    .title("Terminal")
    .toc()
    .templateSource(template)
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

test("raw {=typst} blocks pass through Pandoc verbatim, whereas plain-text placeholders get escaped", async () => {
  const engines = systemEngines();
  const rawTypst = await Export.ofMarkdown('```{=typst}\n#terminal-window(lines: ("ok",))\n```\n')
    .toTypst(engines);
  assert.ok(rawTypst.includes('#terminal-window(lines: ("ok",))'));

  const plainPlaceholder = await Export.ofMarkdown("%%DOCS_EXPORT_COMPONENT_0%%\n")
    .toTypst(engines);
  assert.ok(!plainPlaceholder.includes("%%DOCS_EXPORT_COMPONENT_0%%"));
  assert.ok(plainPlaceholder.includes("%%DOCS\\_EXPORT\\_COMPONENT\\_0%%"));
});

test("metadata title with # and $ is escaped by Pandoc, and --- emits #horizontalrule", async () => {
  const template = await readDefaultTemplate();
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
    readDefaultTemplate(),
    readDefaultMermaidFilter(),
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

test("every built-in component with .typstPDF produces well-formed Typst (and compiles if typst is available)", async () => {
  const samples = {
    terminal: [
      '<!-- as: terminal exit="0" estado="prototipo" nota="Ruta C:\\tmp\\out con barra." -->',
      "```console",
      '$ bench run --quick -m "con comillas"',
      '│ limpio   ████░░  66% "ok" \\done',
      "```",
      "",
    ].join("\n"),
  };

  const withTypst = Object.values(builtIn).filter((c) => typeof c.typstPDF === "function");
  assert.ok(withTypst.length >= 1, "expected at least terminal to define .typstPDF");

  const engines = systemEngines();
  const template = await readDefaultTemplate();

  for (const component of withTypst) {
    const sample = samples[component.name];
    assert.ok(sample, `missing sample Markdown for component "${component.name}"`);

    const expanded = expandComponentsToTypst(sample, {
      components: new Map([[component.name, component]]),
      ...PARSERS,
    });
    assert.ok(expanded.includes("{=typst}"), `${component.name}: expected raw Typst block`);

    const rawBody = expanded.split(/`+\{=typst\}\n/)[1].split(/\n`+\n/)[0];
    assertBalancedTypst(rawBody, component.name);

    const typstDoc = await Export.ofMarkdown(sample)
      .title(`Test ${component.name}`)
      .templateSource(template)
      .components(new Map([[component.name, component]]))
      .toTypst(engines);

    assert.ok(typstDoc.includes(rawBody), `${component.name}: Pandoc must preserve raw Typst verbatim`);
    assert.ok(!typstDoc.includes(`<!-- as: ${component.name}`), `${component.name}: marker should be expanded`);

    if (hasCommand("typst")) {
      const pdf = await engines.compilePdf(typstDoc);
      assert.ok(pdf.byteLength > 100);
      assert.equal(Buffer.from(pdf.slice(0, 5)).toString("ascii"), "%PDF-");
    } else if (process.env.CI === "true") {
      assert.fail("CI=true requires the typst binary to validate generated Typst documents");
    }
  }
});

test("systemEngines reports clear OS-agnostic errors when binaries are missing or virtual filenames escape tmpdir", async () => {
  const missing = systemEngines({
    pandocBin: "pandoc-definitely-not-installed",
    typstBin: "typst-definitely-not-installed",
  });

  await assert.rejects(
    () => Export.ofMarkdown("# Hola\n").toTypst(missing),
    /pandoc no está instalado.*pandoc\.org/,
  );

  await assert.rejects(
    () => Export.ofMarkdown("# Hola\n").toPdf({ ...systemEngines(), compilePdf: missing.compilePdf }),
    /typst no está instalado.*typst\.app/,
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
      readDefaultTemplate(),
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

test(
  "terminal-window draws the first output line right under the bar, with no blank line between them",
  { skip: !hasCommand("typst") && process.env.CI !== "true" ? "typst binary not installed locally" : false },
  async () => {
    const template = await readDefaultTemplate();
    const typst = await Export.ofMarkdown("<!-- as: terminal -->\n```console\n$ c\nx\n```\n")
      .templateSource(template)
      .components(BUILT_IN_MAP)
      .toTypst(systemEngines());

    const dir = mkdtempSync(join(tmpdir(), "docs-export-terminal-"));
    try {
      const file = join(dir, "page.typ");
      writeFileSync(file, typst);
      const output = execFileSync(
        "typst",
        ["eval", "query(raw).map(r => r.location().position().y.pt())", "--in", file],
        { encoding: "utf8" },
      );
      const [commandY, firstLineY] = JSON.parse(output);
      // The bar's bottom inset (6pt) plus the body's top inset (10pt) put the first line about 16pt
      // below the command; a default block gap between bar and body pushes it to about 29pt.
      assert.ok(
        firstLineY - commandY < 20,
        `first output line is ${(firstLineY - commandY).toFixed(1)}pt below the command`,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  },
);
