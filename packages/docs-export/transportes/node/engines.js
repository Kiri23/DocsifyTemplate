// Node transport engines backed by local `pandoc` and `typst` binaries, `marked`, and `linkedom`.
// Writes virtual template/filter files and a Pandoc defaults.json to a temporary directory per call.
import { execFileSync, spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import { parseHTML } from "linkedom";

const PACKAGE_ROOT = fileURLToPath(new URL("../..", import.meta.url));
export const DEFAULT_TEMPLATE_PATH = join(PACKAGE_ROOT, "templates", "branded.typ");
export const DEFAULT_MERMAID_FILTER_PATH = join(PACKAGE_ROOT, "filters", "mermaid-placeholder.lua");

/** Runs a child process with optional UTF-8 stdin and captures stdout and stderr. */
function runProcess(bin, args, { cwd, stdin, missingMessage }) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      cwd,
      stdio: [stdin !== undefined ? "pipe" : "ignore", "pipe", "pipe"],
    });
    const outChunks = [];
    const errChunks = [];

    child.stdout.on("data", (chunk) => outChunks.push(chunk));
    child.stderr.on("data", (chunk) => errChunks.push(chunk));
    child.on("error", (error) => {
      if (error.code === "ENOENT") {
        reject(new Error(missingMessage));
        return;
      }
      reject(error);
    });
    child.on("close", (code) => {
      const stdout = Buffer.concat(outChunks);
      const stderr = Buffer.concat(errChunks).toString("utf8").trim();
      if (code !== 0) {
        reject(new Error(`${bin} falló con código ${code}${stderr ? `: ${stderr}` : ""}`));
        return;
      }
      resolve({ stdout, stderr });
    });

    if (stdin !== undefined) {
      child.stdin.end(stdin, "utf8");
    }
  });
}

/** Rejects virtual file names that try to escape the temporary working directory. */
function assertSafeFilename(name) {
  if (!name || basename(name) !== name || name === "." || name === "..") {
    throw new Error(`nombre de archivo virtual inválido: "${name}"`);
  }
}

/** Checks whether an executable is available in PATH (or at an explicit path). */
export function hasCommand(bin) {
  try {
    execFileSync(bin, ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/** Reads the bundled branded.typ Pandoc template as UTF-8 text. */
export function defaultTemplateSource() {
  return readFile(DEFAULT_TEMPLATE_PATH, "utf8");
}

/** Reads the bundled mermaid-placeholder.lua Pandoc filter as UTF-8 text. */
export function defaultMermaidFilterSource() {
  return readFile(DEFAULT_MERMAID_FILTER_PATH, "utf8");
}

/**
 * Creates the `engines` adapter expected by `Export.toTypst` / `Export.toPdf` using local binaries.
 * `toTypst` needs only `pandoc`; `toPdf` also invokes `typst` and raises an actionable error if missing.
 * @param {{ pandocBin?: string, typstBin?: string }} [options]
 */
export function systemEngines({ pandocBin = "pandoc", typstBin = "typst" } = {}) {
  return {
    parseMarkdown: {
      lexer: (source) => marked.lexer(source),
      parser: (tokens) => marked.parser(tokens),
    },

    parseHtml(html) {
      const { document } = parseHTML(`<!DOCTYPE html><html><body><main>${html}</main></body></html>`);
      return document.querySelector("main");
    },

    async pandoc({ options, stdin, files = {} }) {
      const dir = await mkdtemp(join(tmpdir(), "docs-export-pandoc-"));
      try {
        for (const [name, content] of Object.entries(files)) {
          assertSafeFilename(name);
          await writeFile(join(dir, name), content, "utf8");
        }
        await writeFile(join(dir, "defaults.json"), JSON.stringify(options), "utf8");
        const { stdout } = await runProcess(pandocBin, ["-d", "defaults.json"], {
          cwd: dir,
          stdin,
          missingMessage:
            `pandoc no está instalado o no está en PATH (probado: "${pandocBin}"). Instalalo con: brew install pandoc`,
        });
        return stdout.toString("utf8");
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },

    async typst(typstSource) {
      const dir = await mkdtemp(join(tmpdir(), "docs-export-typst-"));
      try {
        const inputFile = join(dir, "main.typ");
        const outputFile = join(dir, "out.pdf");
        await writeFile(inputFile, typstSource, "utf8");
        await runProcess(typstBin, ["compile", inputFile, outputFile], {
          cwd: dir,
          missingMessage:
            `typst no está instalado o no está en PATH (probado: "${typstBin}"). ` +
            "Instalalo con: brew install typst (o exportá a .typ, que solo necesita pandoc).",
        });
        return new Uint8Array(await readFile(outputFile));
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  };
}
