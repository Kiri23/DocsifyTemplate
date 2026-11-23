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
  assert.throws(() => typstCompilerFrom({}, { globalScope: {} }), /\$typst\.pdf/);
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

test("without marked, a page with components fails with the motor's message", async () => {
  const { document } = parseHTML("<!DOCTYPE html><html><body></body></html>");
  const engines = browserEngines({ pandocWasmUrl: PANDOC_URL, document });
  assert.equal(engines.parseMarkdown, undefined);
  const markdown = await readFile(TERMINAL_DOC, "utf8");
  await assert.rejects(
    Export.ofMarkdown(markdown).components(BUILT_IN_MAP).toTypst({ ...engines, pandoc: async () => "" }),
    /parseMarkdown/,
  );
});
