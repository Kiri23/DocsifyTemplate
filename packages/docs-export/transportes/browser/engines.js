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
  const typstCompiler = loadOnce(async () => typstCompilerFrom(await importModule(typstUrl)));

  return {
    // Without marked the components step cannot run; the motor says so if a page needs it.
    parseMarkdown: marked
      ? { lexer: (source) => marked.lexer(source), parser: (tokens) => marked.parser(tokens) }
      : undefined,

    parseHtml(html) {
      const main = document.createElement("main");
      main.innerHTML = html;
      return main;
    },

    async pandoc({ options, stdin, files = {} }) {
      const { convert } = await pandocWasm();
      const { stdout, stderr } = await convert(options, stdin, files);
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
