// End-to-end tests for the `npm run docs:exportar` CLI (transportes/node/bin/exportar.mjs).
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { hasCommand } from "../transportes/node/mod.js";
import { runCli } from "../transportes/node/bin/exportar.mjs";
import { PARSERS, TERMINAL_DOC } from "./helpers.mjs";

const CLI_PATH = fileURLToPath(
  new URL("../transportes/node/bin/exportar.mjs", import.meta.url),
);

const tempDirs = [];
after(() => tempDirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

function makeTempDir() {
  const dir = mkdtempSync(join(tmpdir(), "docs-export-cli-"));
  tempDirs.push(dir);
  return dir;
}

/** Runs exportar.mjs as a subprocess and returns exit status, stdout, and stderr. */
function execCli(args) {
  try {
    const stdout = execFileSync("node", [CLI_PATH, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { status: 0, stdout, stderr: "" };
  } catch (error) {
    return {
      status: error.status,
      stdout: error.stdout?.toString("utf8") ?? "",
      stderr: error.stderr?.toString("utf8") ?? "",
    };
  }
}

test("CLI writes Typst to stdout when --out is omitted", () => {
  const result = execCli([TERMINAL_DOC]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal((result.stdout.match(/#terminal-window\(/g) ?? []).length, 3);
  assert.ok(result.stdout.includes('<!-- as: terminal exit="0" -->'));
});

test("CLI writes .typ file honoring --out, --title, --subtitle, --author, --date, --toc, and --template", () => {
  const dir = makeTempDir();
  const outFile = join(dir, "nested", "terminal.typ");
  const customTemplate = join(dir, "custom.typ");
  writeFileSync(
    customTemplate,
    "// CUSTOM\n// T:$title$ S:$subtitle$ A:$author$ D:$date$ TOC:$if(toc)$yes$endif$\n$body$\n",
  );

  const result = execCli([
    TERMINAL_DOC,
    "--out", outFile,
    "--title", "Guía Terminal",
    "--subtitle", "Manual",
    "--author", "Christian",
    "--date", "2026-11-23",
    "--toc",
    "--template", customTemplate,
  ]);
  assert.equal(result.status, 0, result.stderr);

  const written = readFileSync(outFile, "utf8");
  assert.ok(written.startsWith("// CUSTOM\n"));
  assert.ok(written.includes("T:Guía Terminal S:Manual A:Christian D:2026-11-23 TOC:yes"));
  assert.equal((written.match(/#terminal-window\(/g) ?? []).length, 3);
});

test("CLI keeps mermaid blocks intact as code blocks with no leftover placeholders", () => {
  const dir = makeTempDir();
  const pageFile = join(dir, "diagram.md");
  writeFileSync(pageFile, "# Flujo\n\nAntes.\n\n```mermaid\ngraph LR\n  A --> B\n```\n\nDespués.\n");

  const result = execCli([pageFile]);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(!result.stdout.includes("%%MERMAID_SVG_"));
  assert.ok(result.stdout.includes("graph LR"));
  assert.ok(result.stdout.includes("A --> B"));
});

test("CLI rejects missing positional argument and unsupported --out extensions with exit 2", () => {
  const noArgs = execCli([]);
  assert.equal(noArgs.status, 2);
  assert.match(noArgs.stderr, /uso: exportar\.mjs/);

  const badExt = execCli([TERMINAL_DOC, "--out", "/tmp/out.txt"]);
  assert.equal(badExt.status, 2);
  assert.match(badExt.stderr, /extensión no soportada/);
});

test("CLI fails with clear error on --out .pdf when typst is absent, or writes a PDF when present", () => {
  const dir = makeTempDir();
  const outPdf = join(dir, "terminal.pdf");
  const result = execCli([TERMINAL_DOC, "--out", outPdf]);

  if (hasCommand("typst")) {
    assert.equal(result.status, 0, result.stderr);
    const bytes = readFileSync(outPdf);
    assert.equal(bytes.subarray(0, 5).toString("ascii"), "%PDF-");
  } else {
    assert.equal(result.status, 1);
    assert.match(result.stderr, /typst no está instalado/);
    assert.match(result.stderr, /typst\.app/);
  }
});

test("CLI loads custom JSON components, warns on malformed markers, and runs full PDF path", async () => {
  const dir = makeTempDir();
  const componentFile = join(dir, "summary.js");
  const dataFile = join(dir, "stats.json");
  const pageFile = join(dir, "page.md");
  const outPdf = join(dir, "page.pdf");

  writeFileSync(
    componentFile,
    [
      'import { page } from "docs-site/as/shapes.js";',
      "export const summary = {",
      '  name: "summary",',
      '  takes: page().json("src"),',
      "  read({ data }) { return { total: data.total }; },",
      "  view: () => null,",
      '  typstPDF({ total }) { return `#strong[Total: ${total}]`; },',
      "};",
      "",
    ].join("\n"),
  );
  writeFileSync(dataFile, JSON.stringify({ total: 42 }));
  writeFileSync(
    pageFile,
    [
      "# Custom",
      "",
      '<!-- as: terminal exit="999" -->',
      "```console",
      "broken",
      "```",
      "",
      '<!-- as: summary src="stats.json" -->',
      "",
    ].join("\n"),
  );

  let compiledTypst = "";
  const errChunks = [];
  const code = await runCli([pageFile, "--out", outPdf, "--components", componentFile], {
    stderr: { write: (s) => errChunks.push(s) },
    engines: {
      ...PARSERS,
      pandoc: ({ stdin }) => stdin,
      compilePdf: (src) => {
        compiledTypst = src;
        return new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
      },
    },
  });

  assert.equal(code, 0, errChunks.join(""));
  assert.match(errChunks.join(""), /aviso:.*exit tiene que ser un entero entre 0 y 255/);
  assert.ok(compiledTypst.includes("#strong[Total: 42]"));
  assert.equal(readFileSync(outPdf).subarray(0, 5).toString("ascii"), "%PDF-");
});
