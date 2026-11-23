// Unit tests for transportes/docsify/: the exportButton plugin driven by a fake Docsify on linkedom.
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveObjectURL } from "node:buffer";
import { readFile } from "node:fs/promises";
import { marked } from "marked";
import { parseHTML } from "linkedom";
import {
  DEFAULT_MARKED_URL,
  exportButton,
  exportPage,
  fileNameFor,
} from "../transportes/docsify/mod.js";
import { MERMAID_FILTER_FILE } from "../motor/mod.js";
import { captureMermaidSvgs } from "../transportes/browser/mod.js";
import {
  hasCommand,
  readDefaultMermaidFilter,
  readDefaultTemplate,
  systemEngines,
} from "../transportes/node/mod.js";
import { BUILT_IN_MAP, TERMINAL_DOC } from "./helpers.mjs";

const PAGE_MD = "# Guía de Exportación\n\nHola.\n\n```mermaid\ngraph LR\n  A --> B\n```\n";

/** Engines that answer without Pandoc or Typst and remember what they were asked. */
function recordingEngines() {
  const calls = { pandoc: [], compilePdf: [] };
  return {
    calls,
    async pandoc(request) {
      calls.pandoc.push(request);
      return request.options.filters ? "= Doc\n%%MERMAID_SVG_0%%\n" : "= Doc\n";
    },
    async compilePdf(source) {
      calls.compilePdf.push(source);
      return new Uint8Array([37, 80, 68, 70, 45]);
    },
  };
}

/** A page like the one Docsify draws, plus a fake Docsify that runs the plugin's hooks. */
function docsifyPage({ withDiagram = true } = {}) {
  const { document } = parseHTML(`<!DOCTYPE html><html><head></head><body><main>
    <article class="markdown-section"><h1>Guía de Exportación</h1><p>Hola.</p>
    ${withDiagram ? '<div class="mermaid"><svg viewBox="0 0 10 10"><rect/></svg></div>' : ""}
    </article></main></body></html>`);
  const hooks = { beforeEach: [], doneEach: [] };
  const hook = {
    beforeEach: (fn) => hooks.beforeEach.push(fn),
    doneEach: (fn) => hooks.doneEach.push(fn),
  };
  return {
    document,
    install(plugin) {
      plugin(hook, {});
    },
    render(markdown) {
      let content = markdown;
      for (const fn of hooks.beforeEach) content = fn(content);
      for (const fn of hooks.doneEach) fn();
      return content;
    },
  };
}

/** Clicks a button and waits for the download link the plugin creates. */
function clickAndCatchDownload(document, button) {
  return new Promise((resolve) => {
    document.addEventListener("click", (event) => {
      const link = event.target;
      if (link.tagName !== "A" || !link.download) return;
      resolve({ filename: link.download, blob: resolveObjectURL(link.href) });
    });
    button.click();
  });
}

/** Waits until the plugin finishes its async work and re-enables its buttons. */
async function settled(document) {
  for (let i = 0; i < 50; i++) {
    const busy = [...document.querySelectorAll(".docs-export-bar button")].some((b) => b.disabled);
    if (!busy) return;
    await new Promise((r) => setTimeout(r, 5));
  }
  throw new Error("el plugin no terminó");
}

const SOURCES = { templateSource: "#let x = 1\n$body$\n", mermaidFilterSource: "return {}" };

test("exportButton needs pandocWasmUrl unless the site brings its own engines", () => {
  assert.throws(() => exportButton({}), /pandocWasmUrl/);
  assert.doesNotThrow(() => exportButton({ engines: recordingEngines() }));
  assert.doesNotThrow(() => exportButton({ pandocWasmUrl: "https://x.test/pandoc.wasm" }));
  assert.throws(() => exportButton({ engines: recordingEngines(), formats: ["docx"] }), /docx/);
});

test("exportButton draws one bar with .typ and .pdf buttons at the top of the page", () => {
  const page = docsifyPage();
  page.install(exportButton({ engines: recordingEngines(), document: page.document, ...SOURCES }));
  assert.equal(page.render(PAGE_MD), PAGE_MD, "the plugin hands Docsify the Markdown unchanged");
  page.render(PAGE_MD);

  const bars = page.document.querySelectorAll(".docs-export-bar");
  assert.equal(bars.length, 1);
  assert.equal(page.document.querySelector(".markdown-section").firstElementChild, bars[0]);
  const formats = [...bars[0].querySelectorAll("button")].map((b) => b.dataset.format);
  assert.deepEqual(formats, ["typ", "pdf"]);
  assert.equal(page.document.querySelectorAll("#docs-export-style").length, 1);
});

test("exportButton draws only the formats the site asks for", () => {
  const page = docsifyPage();
  page.install(exportButton({ engines: recordingEngines(), document: page.document, formats: ["typ"], ...SOURCES }));
  page.render(PAGE_MD);
  const formats = [...page.document.querySelectorAll(".docs-export-bar button")].map((b) => b.dataset.format);
  assert.deepEqual(formats, ["typ"]);
});

test(".typ button downloads the page's Typst with its drawn Mermaid diagram", async () => {
  const page = docsifyPage();
  const engines = recordingEngines();
  page.install(exportButton({ engines, document: page.document, ...SOURCES }));
  page.render(PAGE_MD);

  const button = page.document.querySelector('[data-format="typ"]');
  const { filename, blob } = await clickAndCatchDownload(page.document, button);
  await settled(page.document);

  assert.equal(filename, "guia-de-exportacion.typ");
  assert.match(blob.type, /^text\/plain/);
  const text = await blob.text();
  assert.match(text, /#image\(bytes\(".*<svg/s);
  assert.equal(engines.calls.pandoc[0].stdin, PAGE_MD, "the Markdown Docsify loaded is what gets exported");
  assert.deepEqual(engines.calls.pandoc[0].options.filters, [MERMAID_FILTER_FILE]);
  assert.equal(engines.calls.pandoc[0].options.metadata.title, "Guía de Exportación");
  assert.equal(engines.calls.compilePdf.length, 0, ".typ never loads Typst");
});

test(".pdf button compiles with the engines and downloads a PDF", async () => {
  const page = docsifyPage();
  const engines = recordingEngines();
  page.install(exportButton({ engines, document: page.document, ...SOURCES }));
  page.render(PAGE_MD);

  const { filename, blob } = await clickAndCatchDownload(page.document, page.document.querySelector('[data-format="pdf"]'));
  await settled(page.document);
  assert.equal(filename, "guia-de-exportacion.pdf");
  assert.equal(blob.type, "application/pdf");
  assert.deepEqual([...new Uint8Array(await blob.arrayBuffer())], [37, 80, 68, 70, 45]);
  assert.equal(engines.calls.compilePdf.length, 1);
});

test("a failed export says why in the bar and frees the buttons", async () => {
  const page = docsifyPage();
  const engines = { ...recordingEngines(), pandoc: async () => { throw new Error("pandoc.wasm falló: boom"); } };
  page.install(exportButton({ engines, document: page.document, ...SOURCES }));
  page.render(PAGE_MD);

  const original = console.error;
  console.error = () => {};
  try {
    page.document.querySelector('[data-format="typ"]').click();
    await new Promise((r) => setTimeout(r, 10));
    await settled(page.document);
  } finally {
    console.error = original;
  }
  assert.match(page.document.querySelector('.docs-export-bar [role="status"]').textContent, /No se pudo exportar: pandoc\.wasm falló: boom/);
});

test("without pandocWasmUrl engines, the plugin loads template and filter by address, once", async () => {
  const page = docsifyPage();
  const asked = [];
  const engines = recordingEngines();
  page.install(exportButton({
    engines,
    document: page.document,
    templateUrl: "https://site.test/branded.typ",
    mermaidFilterUrl: "https://site.test/mermaid.lua",
    fetchText: async (url) => { asked.push(url); return url.endsWith(".typ") ? "TEMPLATE" : "return {}"; },
  }));
  page.render(PAGE_MD);
  const button = page.document.querySelector('[data-format="typ"]');
  await clickAndCatchDownload(page.document, button);
  await settled(page.document);
  await clickAndCatchDownload(page.document, button);
  await settled(page.document);
  assert.deepEqual(asked.sort(), ["https://site.test/branded.typ", "https://site.test/mermaid.lua"]);
  assert.equal(engines.calls.pandoc[0].files["template.typ"], "TEMPLATE");
});

test("exportButton builds browser engines from pandocWasmUrl and loads marked only for components", async () => {
  const page = docsifyPage({ withDiagram: false });
  const asked = [];
  const importModule = async (url) => {
    asked.push(url);
    if (url === DEFAULT_MARKED_URL) return { marked };
    return {};
  };
  page.install(exportButton({
    pandocWasmUrl: "https://assets.test/pandoc.wasm",
    components: BUILT_IN_MAP,
    document: page.document,
    importModule,
    ...SOURCES,
  }));
  page.render(PAGE_MD);
  const original = console.error;
  console.error = () => {};
  try {
    page.document.querySelector('[data-format="typ"]').click();
    await new Promise((r) => setTimeout(r, 10));
    await settled(page.document);
  } finally {
    console.error = original;
  }
  // marked was loaded for the components; pandoc.wasm then fails to download in Node, which is fine.
  assert.equal(asked[0], DEFAULT_MARKED_URL);
  assert.match(page.document.querySelector('[role="status"]').textContent, /No se pudo exportar/);
});

test("exportPage passes the Mermaid filter only when every block has its drawn diagram", async () => {
  const markdown = "# T\n\n```mermaid\ngraph LR\n```\n\n```mermaid\ngraph TD\n```\n";
  const warnings = [];
  const engines = recordingEngines();
  const file = await exportPage({
    markdown,
    format: "typ",
    engines,
    title: "T",
    mermaidFilterSource: "return {}",
    mermaidSvgs: ["<svg/>"],
    onWarning: (m) => warnings.push(m),
  });
  assert.equal(engines.calls.pandoc[0].options.filters, undefined);
  assert.doesNotMatch(file.content, /%%MERMAID_SVG_/);
  assert.match(warnings[0], /2 diagrama\(s\) Mermaid y se capturaron 1/);
});

test("exportPage expands components through their typstPDF view", async () => {
  const markdown = await readFile(TERMINAL_DOC, "utf8");
  const engines = { ...recordingEngines(), parseMarkdown: { lexer: (s) => marked.lexer(s), parser: (t) => marked.parser(t) } };
  engines.parseHtml = (html) => parseHTML(`<html><body><main>${html}</main></body></html>`).document.querySelector("main");
  await exportPage({ markdown, format: "typ", engines, components: BUILT_IN_MAP });
  assert.match(engines.calls.pandoc[0].stdin, /\{=typst\}/);
});

test("exportPage rejects unknown formats and names files from the title", async () => {
  await assert.rejects(exportPage({ markdown: "x", format: "docx", engines: recordingEngines() }), /docx/);
  assert.equal(fileNameFor("Configuración  Rápida!", ".pdf"), "configuracion-rapida.pdf");
  assert.equal(fileNameFor(undefined, ".typ"), "documento.typ");
});

test("exportPage with real Pandoc and the real Lua filter puts the drawn diagram where the block was", {
  skip: !hasCommand("pandoc") && "pandoc no está instalado",
}, async () => {
  const [templateSource, mermaidFilterSource] = await Promise.all([readDefaultTemplate(), readDefaultMermaidFilter()]);
  const page = docsifyPage();
  const file = await exportPage({
    markdown: PAGE_MD,
    format: "typ",
    engines: systemEngines(),
    title: "Guía",
    templateSource,
    mermaidFilterSource,
    mermaidSvgs: captureMermaidSvgs(page.document.querySelector(".markdown-section")),
  });
  assert.doesNotMatch(file.content, /%%MERMAID_SVG_/);
  assert.doesNotMatch(file.content, /graph LR/);
  assert.match(file.content, /#image\(bytes\(".*viewBox.*format: "svg"/s);
});
