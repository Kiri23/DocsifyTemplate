// Unit tests for transportes/docsify/: the exportButton plugin driven by a fake Docsify on linkedom.
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveObjectURL } from "node:buffer";
import { readFile } from "node:fs/promises";
import { marked } from "marked";
import { parseHTML } from "linkedom";
import { exportButton, filenameFromTitle } from "../transportes/docsify/mod.js";
import { MERMAID_FILTER_FILE } from "../motor/mod.js";
import { browserEngines } from "../transportes/browser/mod.js";
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

/** Clicks a button and waits for the download link the plugin creates; no download in 2 s is a failure. */
function clickAndCatchDownload(document, button) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("el click no terminó en una descarga")), 2000);
    document.addEventListener("click", (event) => {
      const link = event.target;
      if (link.tagName !== "A" || !link.download) return;
      clearTimeout(timer);
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

// Template and filter as the plugin would download them from the site.
const SOURCES = {
  fetchText: async (url) => (url.endsWith(".typ") ? "#let x = 1\n$body$\n" : "return {}"),
};

test("exportButton needs engines and known formats", { timeout: 5000 }, () => {
  assert.throws(() => exportButton({}), /browserEngines\(\{ pandocWasmUrl \}\)/);
  assert.doesNotThrow(() => exportButton({ engines: recordingEngines() }));
  assert.throws(() => exportButton({ engines: recordingEngines(), formats: ["docx"] }), /docx/);
});

test("exportButton draws one bar with .typ and .pdf buttons at the top of the page", { timeout: 5000 }, () => {
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

test("exportButton draws only the formats the site asks for", { timeout: 5000 }, () => {
  const page = docsifyPage();
  page.install(exportButton({ engines: recordingEngines(), document: page.document, formats: ["typ"], ...SOURCES }));
  page.render(PAGE_MD);
  const formats = [...page.document.querySelectorAll(".docs-export-bar button")].map((b) => b.dataset.format);
  assert.deepEqual(formats, ["typ"]);
});

test(".typ button downloads the page's Typst with its drawn Mermaid diagram", { timeout: 5000 }, async () => {
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

test(".pdf button compiles with the engines and downloads a PDF", { timeout: 5000 }, async () => {
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

test("a failed export says why in the bar and frees the buttons", { timeout: 5000 }, async () => {
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

test("the plugin downloads template and filter from their addresses once", { timeout: 5000 }, async () => {
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

test("a page without drawn diagrams exports its Mermaid blocks as code, without the filter", { timeout: 5000 }, async () => {
  const page = docsifyPage({ withDiagram: false });
  const engines = recordingEngines();
  page.install(exportButton({ engines, document: page.document, ...SOURCES }));
  page.render(PAGE_MD);
  await clickAndCatchDownload(page.document, page.document.querySelector('[data-format="typ"]'));
  await settled(page.document);
  assert.equal(engines.calls.pandoc[0].options.filters, undefined);
});

test("with browserEngines, components read the page with Docsify's window.marked", { timeout: 5000 }, async () => {
  const markdown = await readFile(TERMINAL_DOC, "utf8");
  const page = docsifyPage({ withDiagram: false });
  const engines = browserEngines({ pandocWasmUrl: "https://assets.test/pandoc.wasm", document: page.document });
  let stdin;
  engines.pandoc = async (request) => { stdin = request.stdin; return "= ok\n"; };

  const previous = globalThis.marked;
  globalThis.marked = marked;
  try {
    page.install(exportButton({ engines, components: BUILT_IN_MAP, document: page.document, ...SOURCES }));
    page.render(markdown);
    await clickAndCatchDownload(page.document, page.document.querySelector('[data-format="typ"]'));
    await settled(page.document);
  } finally {
    globalThis.marked = previous;
  }
  assert.match(stdin, /\{=typst\}/, "terminal se expandió con su vista typstPDF");
});

test("with real Pandoc and the real Lua filter, the drawn diagram replaces its Mermaid block", {
  timeout: 5000,
  skip: !hasCommand("pandoc") && "pandoc no está instalado",
}, async () => {
  const [template, filter] = await Promise.all([readDefaultTemplate(), readDefaultMermaidFilter()]);
  const page = docsifyPage();
  page.install(exportButton({
    engines: systemEngines(),
    document: page.document,
    fetchText: async (url) => (url.endsWith(".typ") ? template : filter),
  }));
  page.render(PAGE_MD);
  const { blob } = await clickAndCatchDownload(page.document, page.document.querySelector('[data-format="typ"]'));
  await settled(page.document);
  const typst = await blob.text();
  assert.doesNotMatch(typst, /%%MERMAID_SVG_/);
  assert.doesNotMatch(typst, /graph LR/);
  assert.match(typst, /#image\(bytes\(".*viewBox.*format: "svg"/s);
});

test("filenameFromTitle names files from the page title", { timeout: 5000 }, () => {
  assert.equal(filenameFromTitle("Configuración  Rápida!", ".pdf"), "configuracion-rapida.pdf");
  assert.equal(filenameFromTitle(undefined, ".typ"), "documento.typ");
});

test("after moving to another page, the button exports that page", { timeout: 5000 }, async () => {
  const page = docsifyPage({ withDiagram: false });
  const engines = recordingEngines();
  page.install(exportButton({ engines, document: page.document, ...SOURCES }));
  page.render("# Primera\n");
  // Docsify draws the next page into a fresh section, without the old bar.
  page.document.querySelector(".docs-export-bar").remove();
  page.render("# Segunda\n");
  await clickAndCatchDownload(page.document, page.document.querySelector('[data-format="typ"]'));
  await settled(page.document);
  assert.equal(engines.calls.pandoc[0].stdin, "# Segunda\n");
});

test("the motor's warnings reach the bar and the console", { timeout: 5000 }, async () => {
  const page = docsifyPage({ withDiagram: false });
  const engines = { ...recordingEngines(), pandoc: async () => "= Doc\n%%MERMAID_SVG_1%%\n" };
  // One drawn diagram for a page whose Pandoc output asks for two: the second is missing.
  page.document.querySelector(".markdown-section").insertAdjacentHTML("beforeend", '<div class="mermaid"><svg/></div>');
  page.install(exportButton({ engines, document: page.document, ...SOURCES }));
  page.render(PAGE_MD);
  const original = console.warn;
  const warned = [];
  console.warn = (m) => warned.push(m);
  try {
    await clickAndCatchDownload(page.document, page.document.querySelector('[data-format="typ"]'));
    await settled(page.document);
  } finally {
    console.warn = original;
  }
  assert.match(page.document.querySelector('[role="status"]').textContent, /Listo, con 1 aviso\(s\)/);
  assert.match(warned[0], /^docs-export: el diagrama Mermaid 2 no se capturó/);
});

test("a template that failed to download is asked for again on the next click", { timeout: 5000 }, async () => {
  const page = docsifyPage({ withDiagram: false });
  let attempts = 0;
  page.install(exportButton({
    engines: recordingEngines(),
    document: page.document,
    fetchText: async () => {
      attempts++;
      if (attempts === 1) throw new Error("HTTP 503");
      return "$body$";
    },
  }));
  page.render(PAGE_MD);
  const button = page.document.querySelector('[data-format="typ"]');
  const original = console.error;
  console.error = () => {};
  try {
    button.click();
    await new Promise((r) => setTimeout(r, 10));
    await settled(page.document);
  } finally {
    console.error = original;
  }
  assert.match(page.document.querySelector('[role="status"]').textContent, /HTTP 503/);
  const { filename } = await clickAndCatchDownload(page.document, button);
  await settled(page.document);
  assert.equal(filename, "guia-de-exportacion.typ");
  assert.equal(attempts, 2);
});
