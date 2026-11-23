// Unit tests for transportes/browser/: engines built from injected addresses, without a browser.
import { test } from "node:test";
import assert from "node:assert/strict";
import { marked } from "marked";
import { parseHTML } from "linkedom";
import {
  browserEngines,
  DEFAULT_TYPST_URL,
  DEFAULT_WASI_SHIM_URL,
  Export,
  startPandocWasm,
  typstCompilerFrom,
} from "../transportes/browser/mod.js";
import { readFile } from "node:fs/promises";
import { BUILT_IN_MAP, TERMINAL_DOC } from "./helpers.mjs";

const PANDOC_URL = "https://assets.example.test/pandoc.wasm";

/** A module loader that records every address it is asked for and answers with fakes. */
function fakeModules(modules) {
  const asked = [];
  const importModule = async (url) => {
    asked.push(url);
    if (!(url in modules)) throw new Error(`módulo no esperado: ${url}`);
    return modules[url];
  };
  return { asked, importModule };
}

test("browserEngines refuses to start without the pandoc.wasm address", () => {
  assert.throws(() => browserEngines({}), /pandocWasmUrl/);
  assert.throws(() => browserEngines({ pandocWasmUrl: "" }), /pandocWasmUrl/);
});

test("browserEngines downloads nothing until it is used", () => {
  const { asked, importModule } = fakeModules({});
  let fetched = 0;
  browserEngines({ pandocWasmUrl: PANDOC_URL, importModule, fetchWasm: () => fetched++ });
  assert.deepEqual(asked, []);
  assert.equal(fetched, 0);
});

test("pandoc engine loads the WASI helper from its address and pandoc.wasm from the injected one", async () => {
  const wasiUrl = "https://cdn.example.test/wasi.js";
  const { asked, importModule } = fakeModules({ [wasiUrl]: {} });
  const fetchedUrls = [];
  const engines = browserEngines({
    pandocWasmUrl: PANDOC_URL,
    wasiShimUrl: wasiUrl,
    importModule,
    fetchWasm: async (url) => {
      fetchedUrls.push(url);
      return { ok: false, status: 404 };
    },
  });

  await assert.rejects(engines.pandoc({ options: {}, stdin: "# Hola" }), /pandoc\.wasm.*assets\.example\.test.*404/);
  assert.deepEqual(asked, [wasiUrl]);
  assert.deepEqual(fetchedUrls, [PANDOC_URL]);
});

test("pandoc engine retries the download after a failure instead of remembering it", async () => {
  const { asked, importModule } = fakeModules({ [DEFAULT_WASI_SHIM_URL]: {} });
  const engines = browserEngines({
    pandocWasmUrl: PANDOC_URL,
    importModule,
    fetchWasm: async () => ({ ok: false, status: 503 }),
  });
  await assert.rejects(engines.pandoc({ options: {}, stdin: "a" }), /503/);
  await assert.rejects(engines.pandoc({ options: {}, stdin: "a" }), /503/);
  assert.equal(asked.length, 2);
});

test("compilePdf loads typst once from the default address and returns its bytes", async () => {
  const seen = [];
  const typstModule = {
    $typst: {
      async pdf({ mainContent }) {
        seen.push(mainContent);
        return new Uint8Array([37, 80, 68, 70]);
      },
    },
  };
  const { asked, importModule } = fakeModules({ [DEFAULT_TYPST_URL]: typstModule });
  const engines = browserEngines({ pandocWasmUrl: PANDOC_URL, importModule });

  const first = await engines.compilePdf("= Uno");
  await engines.compilePdf("= Dos");
  assert.deepEqual([...first], [37, 80, 68, 70]);
  assert.deepEqual(seen, ["= Uno", "= Dos"]);
  assert.deepEqual(asked, [DEFAULT_TYPST_URL]);
});

test("compilePdf uses the typst address the site injects", async () => {
  const typstUrl = "https://mirror.example.test/typst.js";
  const { asked, importModule } = fakeModules({
    [typstUrl]: { $typst: { pdf: async () => new Uint8Array([1]) } },
  });
  const engines = browserEngines({ pandocWasmUrl: PANDOC_URL, typstUrl, importModule });
  await engines.compilePdf("= x");
  assert.deepEqual(asked, [typstUrl]);
});

test("typstCompilerFrom explains a module without $typst and wraps compile errors", async () => {
  assert.throws(() => typstCompilerFrom({}), /\$typst\.pdf/);
  const failing = typstCompilerFrom({ $typst: { pdf: async () => { throw new Error("unknown variable"); } } });
  await assert.rejects(failing.compilePdf("#oops"), /typst no pudo compilar.*unknown variable/);
});

test("startPandocWasm needs the address of pandoc.wasm", async () => {
  await assert.rejects(startPandocWasm({ wasiShim: {} }), /wasmUrl/);
});

test("browser engines parse HTML in the page and expand components with an injected marked", async () => {
  const { document } = parseHTML("<!DOCTYPE html><html><body></body></html>");
  const engines = browserEngines({ pandocWasmUrl: PANDOC_URL, marked, document });

  const main = engines.parseHtml("<p>uno</p><!-- as: x -->");
  assert.equal(main.tagName, "MAIN");
  assert.equal(main.querySelector("p").textContent, "uno");

  const markdown = await readFile(TERMINAL_DOC, "utf8");
  let stdin;
  const typst = await Export.ofMarkdown(markdown)
    .components(BUILT_IN_MAP)
    .toTypst({ ...engines, pandoc: async (request) => { stdin = request.stdin; return "ok"; } });
  assert.equal(typst, "ok");
  assert.match(stdin, /\{=typst\}/, "el componente terminal se expandió con su vista typstPDF");
});

test("without marked and before Docsify loads, components fail saying which parser is missing", async () => {
  const { document } = parseHTML("<!DOCTYPE html><html><body></body></html>");
  const engines = browserEngines({ pandocWasmUrl: PANDOC_URL, document });
  assert.equal(globalThis.marked, undefined);
  const markdown = await readFile(TERMINAL_DOC, "utf8");
  await assert.rejects(
    Export.ofMarkdown(markdown).components(BUILT_IN_MAP).toTypst({ ...engines, pandoc: async () => "" }),
    /no hay parser de Markdown/,
  );
});

test("pandoc runs one conversion at a time, because pandoc.wasm shares one virtual folder", async () => {
  // A WebAssembly stand-in: each conversion records which page it found in the shared folder.
  const seenStdin = [];
  const seenTemplates = [];
  let folder;
  const exports = {
    memory: { buffer: new ArrayBuffer(4096) },
    malloc: (() => { let next = 8; return (n) => { const at = next; next += n + 8; return at; }; })(),
    __wasm_call_ctors() {},
    hs_init_with_rtsopts() {},
    convert() {
      seenStdin.push(new TextDecoder().decode(folder.get("stdin").data));
      seenTemplates.push(new TextDecoder().decode(folder.get("template.typ").data));
    },
  };
  const shim = {
    WASI: class { constructor() { this.wasiImport = {}; } initialize() {} },
    OpenFile: class {},
    File: class { constructor(data) { this.data = data; } },
    ConsoleStdout: { lineBuffered: () => ({}) },
    PreopenDirectory: class { constructor(_name, map) { folder = map; } },
  };
  const realInstantiate = WebAssembly.instantiate;
  WebAssembly.instantiate = async () => ({ instance: { exports } });
  try {
    const engines = browserEngines({
      pandocWasmUrl: PANDOC_URL,
      importModule: async () => shim,
      fetchWasm: async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) }),
    });
    // A Blob companion file makes each conversion wait while it copies, which is when two could mix.
    const files = { "template.typ": new Blob(["$body$"]) };
    await Promise.all([1, 2, 3].map((n) => engines.pandoc({ options: {}, stdin: `# ${n}`, files }).catch(() => {})));
  } finally {
    WebAssembly.instantiate = realInstantiate;
  }
  assert.deepEqual(seenStdin, ["# 1", "# 2", "# 3"]);
  assert.deepEqual(seenTemplates, ["$body$", "$body$", "$body$"], "la plantilla llega a la carpeta de pandoc.wasm");
});

/** Runs one conversion against a pandoc.wasm stand-in that prints the given output and errors. */
async function convertWithFakePandoc({ stdout, stderr }) {
  let folder;
  const encoder = new TextEncoder();
  const exports = {
    memory: { buffer: new ArrayBuffer(4096) },
    malloc: (() => { let next = 8; return (n) => { const at = next; next += n + 8; return at; }; })(),
    __wasm_call_ctors() {},
    hs_init_with_rtsopts() {},
    convert() {
      folder.get("stdout").data = encoder.encode(stdout);
      folder.get("stderr").data = encoder.encode(stderr);
    },
  };
  const shim = {
    WASI: class { constructor() { this.wasiImport = {}; } initialize() {} },
    OpenFile: class {},
    File: class { constructor(data) { this.data = data; } },
    ConsoleStdout: { lineBuffered: () => ({}) },
    PreopenDirectory: class { constructor(_name, map) { folder = map; } },
  };
  const engines = browserEngines({
    pandocWasmUrl: PANDOC_URL,
    importModule: async () => shim,
    fetchWasm: async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) }),
  });
  const realInstantiate = WebAssembly.instantiate;
  WebAssembly.instantiate = async () => ({ instance: { exports } });
  try {
    return await engines.pandoc({ options: {}, stdin: "x" });
  } finally {
    WebAssembly.instantiate = realInstantiate;
  }
}

test("a pandoc.wasm run that prints only an error becomes an error with Pandoc's message", async () => {
  await assert.rejects(
    convertWithFakePandoc({ stdout: "", stderr: "Unknown reader: gfmx\n" }),
    /pandoc\.wasm falló: Unknown reader: gfmx/,
  );
});

test("a pandoc.wasm run with output and a warning returns the output", async () => {
  const original = console.warn;
  const warned = [];
  console.warn = (m) => warned.push(m);
  try {
    assert.equal(await convertWithFakePandoc({ stdout: "= Doc\n", stderr: "aviso\n" }), "= Doc\n");
  } finally {
    console.warn = original;
  }
  assert.deepEqual(warned, ["pandoc.wasm: aviso"]);
});
