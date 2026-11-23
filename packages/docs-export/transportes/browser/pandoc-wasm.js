// Runs Pandoc compiled to WebAssembly inside the browser.
// Used by transportes/browser/engines.js; the .wasm file never lives in this repo, the site
// says where to download it from.
//
// Adapted from pandoc.js, the JavaScript interface shipped with pandoc.wasm:
//   Copyright (c) 2025 Tweag I/O Limited and John MacFarlane. MIT License.
// Changes: it starts from a URL it is given instead of a file next to it, it receives the WASI
// helper library instead of importing it, companion files may be plain text, and convert takes
// one object with named parts.

// The command line pandoc.wasm starts with, as if typed in a terminal (with 64 MB of memory).
const ARGS = ["pandoc.wasm", "+RTS", "-H64m", "-RTS"];

/** Downloads pandoc.wasm from the given address and returns a converter that reuses it. */
export async function startPandocWasm({ wasmUrl, wasiShim, fetchWasm = fetch }) {
  if (typeof wasmUrl !== "string" || wasmUrl === "") {
    throw new Error("startPandocWasm necesita wasmUrl (la dirección de pandoc.wasm)");
  }
  const response = await fetchWasm(wasmUrl, { cache: "force-cache" });
  if (!response.ok) {
    throw new Error(`no se pudo descargar pandoc.wasm desde ${wasmUrl} (HTTP ${response.status})`);
  }

  const { WASI, OpenFile, File, ConsoleStdout, PreopenDirectory } = wasiShim;

  const fileSystem = new Map();
  const fds = [
    new OpenFile(new File(new Uint8Array(), { readonly: true })),
    ConsoleStdout.lineBuffered((msg) => console.log(`[pandoc.wasm] ${msg}`)),
    ConsoleStdout.lineBuffered((msg) => console.warn(`[pandoc.wasm] ${msg}`)),
    new PreopenDirectory("/", fileSystem),
  ];
  const wasi = new WASI(ARGS, [], fds, { debug: false });

  const { instance } = await WebAssembly.instantiate(await response.arrayBuffer(), {
    wasi_snapshot_preview1: wasi.wasiImport,
  });

  wasi.initialize(instance);
  instance.exports.__wasm_call_ctors();
  startHaskellRuntime(instance);

  const encoder = new TextEncoder();
  const decoder = new TextDecoder("utf-8", { fatal: true });

  /** Converts one document with the given settings and returns what Pandoc printed. */
  async function convert({ options, stdin, files = {} }) {
    const optionBytes = encoder.encode(JSON.stringify(options));
    const optionPtr = instance.exports.malloc(optionBytes.length);
    new Uint8Array(instance.exports.memory.buffer, optionPtr, optionBytes.length).set(optionBytes);

    fileSystem.clear();
    const inFile = new File(stdin ? encoder.encode(stdin) : new Uint8Array(), { readonly: true });
    const outFile = new File(new Uint8Array(), { readonly: false });
    const errFile = new File(new Uint8Array(), { readonly: false });
    const warningsFile = new File(new Uint8Array(), { readonly: false });
    fileSystem.set("stdin", inFile);
    fileSystem.set("stdout", outFile);
    fileSystem.set("stderr", errFile);
    fileSystem.set("warnings", warningsFile);
    for (const [name, content] of Object.entries(files)) {
      fileSystem.set(name, new File(await bytesOf(content), { readonly: true }));
    }

    instance.exports.convert(optionPtr, optionBytes.length);

    const rawWarnings = decoder.decode(warningsFile.data);
    return {
      stdout: decoder.decode(outFile.data),
      stderr: decoder.decode(errFile.data),
      warnings: rawWarnings ? JSON.parse(rawWarnings) : [],
    };
  }

  return { convert };

  /** Turns a companion file (text or Blob) into bytes for the virtual folder. */
  async function bytesOf(content) {
    if (typeof content === "string") return encoder.encode(content);
    if (content instanceof Uint8Array) return content;
    return new Uint8Array(await content.arrayBuffer());
  }
}

/** Starts pandoc.wasm with its command line. Copied as is from upstream: a black box, not reviewed line by line. */
function startHaskellRuntime(instance) {
  const { malloc, memory } = instance.exports;
  const view = () => new DataView(memory.buffer);

  const argcPtr = malloc(4);
  view().setUint32(argcPtr, ARGS.length, true);
  const argv = malloc(4 * (ARGS.length + 1));
  for (let i = 0; i < ARGS.length; ++i) {
    const arg = malloc(ARGS[i].length + 1);
    new TextEncoder().encodeInto(ARGS[i], new Uint8Array(memory.buffer, arg, ARGS[i].length));
    view().setUint8(arg + ARGS[i].length, 0);
    view().setUint32(argv + 4 * i, arg, true);
  }
  view().setUint32(argv + 4 * ARGS.length, 0, true);
  const argvPtr = malloc(4);
  view().setUint32(argvPtr, argv, true);

  instance.exports.hs_init_with_rtsopts(argcPtr, argvPtr);
}
