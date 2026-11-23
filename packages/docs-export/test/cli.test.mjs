// End-to-end tests for the `npm run docs:exportar` CLI (transportes/node/bin/exportar.mjs).
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import { parseHTML } from "linkedom";
import { hasCommand } from "../transportes/node/mod.js";
import { runCli } from "../transportes/node/bin/exportar.mjs";

const CLI_PATH = fileURLToPath(
  new URL("../transportes/node/bin/exportar.mjs", import.meta.url),
);
const TERMINAL_DOC = fileURLToPath(
  new URL("../../docs-site/docs/componentes/terminal.md", import.meta.url),
);

const tempDirs = [];
after(() => tempDirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

function makeTempDir() {
  const dir = mkdtempSync(join(tmpdir(), "docs-export-cli-"));
  tempDirs.push(dir);
  return dir;
}

/** Runs exportar.mjs as a subprocess and returns { status, stdout, stderr }. */
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

test("CLI writes .typ file with --out, --title, and --toc", () => {
  const dir = makeTempDir();
  const outFile = join(dir, "nested", "terminal.typ");

  const result = execCli([TERMINAL_DOC, "--out", outFile, "--title", "Guía Terminal", "--toc"]);
  assert.equal(result.status, 0, result.stderr);

  const written = readFileSync(outFile, "utf8");
  assert.ok(written.includes("Guía Terminal"));
  assert.ok(written.includes("#outline(indent: auto)"));
  assert.equal((written.match(/#terminal-window\(/g) ?? []).length, 3);
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
    assert.match(result.stderr, /brew install typst/);
  }
});

test("CLI supports custom --components with .typst views and runs full PDF path with injected engines", async () => {
  const dir = makeTempDir();
  const componentFile = join(dir, "badge.js");
  const pageFile = join(dir, "page.md");
  const outPdf = join(dir, "page.pdf");

  writeFileSync(
    componentFile,
    [
      'import { sequence } from "docs-site/as/shapes.js";',
      "export const badge = {",
      '  name: "badge",',
      '  takes: sequence("p"),',
      "  read({ nodes: [p] }) { return { text: p.textContent.trim() }; },",
      "  view: () => null,",
      '  typst({ text }) { return `#strong[${text}]`; },',
      "};",
      "",
    ].join("\n"),
  );
  writeFileSync(pageFile, "# Custom\n\n<!-- as: badge -->\n\nListo para exportar.\n");

  let compiledTypst = "";
  const errChunks = [];
  const code = await runCli([pageFile, "--out", outPdf, "--components", componentFile], {
    stderr: { write: (s) => errChunks.push(s) },
    engines: {
      parseMarkdown: {
        lexer: (src) => marked.lexer(src),
        parser: (tokens) => marked.parser(tokens),
      },
      parseHtml: (html) =>
        parseHTML(`<!DOCTYPE html><html><body><main>${html}</main></body></html>`).document.querySelector("main"),
      pandoc: ({ stdin }) => stdin,
      typst: (src) => {
        compiledTypst = src;
        return new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
      },
    },
  });

  assert.equal(code, 0, errChunks.join(""));
  assert.ok(compiledTypst.includes("#strong[Listo para exportar.]"));
  assert.equal(readFileSync(outPdf).subarray(0, 5).toString("ascii"), "%PDF-");
});
