// Browser transport engines: Pandoc and Typst compiled to WebAssembly, downloaded from addresses
// the site gives. The browser twin of transportes/node/engines.js, passed to motor/export.js.
// Nothing heavy downloads until it is needed: pandoc.wasm on the first conversion, Typst on the
// first PDF.
import { startPandocWasm } from "./pandoc-wasm.js";
import { typstCompilerFrom } from "./typst-wasm.js";

export const DEFAULT_WASI_SHIM_URL =
  "https://cdn.jsdelivr.net/npm/@bjorn3/browser_wasi_shim@0.3.0/dist/index.js";
export const DEFAULT_TYPST_URL =
  "https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-all-in-one.ts@0.7.0-rc2/dist/esm/index.js";

/** Remembers the first result of a loader so each download happens once, and retries after a failure. */
function loadOnce(load) {
  let pending = null;
  return () => {
    pending ??= load().catch((error) => {
      pending = null;
      throw error;
    });
    return pending;
  };
}

/** Runs one job at a time: pandoc.wasm keeps a single virtual folder that each run empties. */
function oneAtATime() {
  let last = Promise.resolve();
  return (job) => {
    const run = last.then(job, job);
    last = run.catch(() => {});
    return run;
  };
}

/** Creates the WebAssembly Pandoc, Typst, and parser adapters consumed by Export. */
export function browserEngines({
  pandocWasmUrl,
  typstUrl = DEFAULT_TYPST_URL,
  wasiShimUrl = DEFAULT_WASI_SHIM_URL,
  marked,
  document = globalThis.document,
  importModule = (url) => import(url),
  fetchWasm = globalThis.fetch?.bind(globalThis),
} = {}) {
  if (typeof pandocWasmUrl !== "string" || pandocWasmUrl === "") {
    throw new Error(
      "browserEngines necesita pandocWasmUrl: la dirección donde tu sitio sirve pandoc.wasm " +
        "(el archivo no vive en este repo)",
    );
  }

  const pandocWasm = loadOnce(async () =>
    startPandocWasm({ wasmUrl: pandocWasmUrl, wasiShim: await importModule(wasiShimUrl), fetchWasm }),
  );
  const inPandocQueue = oneAtATime();
  const typstCompiler = loadOnce(async () => typstCompilerFrom(await importModule(typstUrl)));

  /** Finds the Markdown parser: the one given, or the one Docsify left on the page. */
  function markedParser() {
    const found = marked ?? globalThis.marked;
    if (!found?.lexer || !found?.parser) {
      throw new Error("no hay parser de Markdown: pasá marked a browserEngines o cargá Docsify 5 antes de exportar");
    }
    return found;
  }

  return {
    // Docsify 5 puts its own parser on window.marked, so the components read the page with
    // the same parser that drew it. It is looked up when a page is exported, after Docsify loaded.
    parseMarkdown: {
      lexer: (source) => markedParser().lexer(source),
      parser: (tokens) => markedParser().parser(tokens),
    },

    parseHtml(html) {
      const main = document.createElement("main");
      main.innerHTML = html;
      return main;
    },

    async pandoc({ options, stdin, files = {} }) {
      const { convert } = await pandocWasm();
      const { stdout, stderr } = await inPandocQueue(() => convert(options, stdin, files));
      if (!stdout && stderr) throw new Error(`pandoc.wasm falló: ${stderr.trim()}`);
      if (stderr) console.warn(`pandoc.wasm: ${stderr.trim()}`);
      return stdout;
    },

    async compilePdf(typstSource) {
      const { compilePdf } = await typstCompiler();
      return compilePdf(typstSource);
    },
  };
}
