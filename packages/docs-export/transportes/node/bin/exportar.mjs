#!/usr/bin/env node
// Exports a Markdown page to Typst or PDF using local Pandoc (and Typst for PDF).
// Reuses component loading and JSON resolution from docs-site/bin/check.mjs.
//
//   npm run docs:exportar -- packages/docs-site/docs/componentes/terminal.md
//   npm run docs:exportar -- docs/guia.md --out guia.typ --title "Guía" --toc
//   npm run docs:exportar -- docs/guia.md --out guia.pdf --components docs/propios/retro.js
import { realpathSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { componentsWith, jsonBeside } from "../../../../docs-site/bin/check.mjs";
import { filesUnder } from "../../../../docs-site/bin/lib/files.mjs";
import { Export } from "../../../motor/mod.js";
import { readDefaultTemplate, systemEngines } from "../engines.js";

const USAGE =
  "uso: exportar.mjs <archivo.md> [--out <ruta.typ|ruta.pdf>] [--title <texto>] " +
  "[--subtitle <texto>] [--author <texto>] [--date <texto>] [--toc] " +
  "[--template <ruta.typ>] [--components <módulo.js>]…";

/** Decides whether to produce Typst or PDF from the requested output file extension. */
export function resolveFormat(outPath) {
  if (!outPath) return "typst";
  const ext = extname(outPath).toLowerCase();
  if (ext === ".typ") return "typst";
  if (ext === ".pdf") return "pdf";
  throw new Error(`extensión no soportada en --out "${outPath}": usá .typ o .pdf`);
}

/** Runs the export command from parsed command-line words and reports the process exit code. */
export async function runCli(argv, { stdout = process.stdout, stderr = process.stderr, engines } = {}) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        out: { type: "string" },
        title: { type: "string" },
        subtitle: { type: "string" },
        author: { type: "string" },
        date: { type: "string" },
        toc: { type: "boolean", default: false },
        template: { type: "string" },
        components: { type: "string", multiple: true, default: [] },
      },
    });
  } catch (error) {
    stderr.write(`${error.message}\n${USAGE}\n`);
    return 2;
  }

  const { values, positionals } = parsed;
  if (positionals.length !== 1) {
    stderr.write(`${USAGE}\n`);
    return 2;
  }

  let format;
  try {
    format = resolveFormat(values.out);
  } catch (error) {
    stderr.write(`${error.message}\n${USAGE}\n`);
    return 2;
  }

  const inputPath = resolve(positionals[0]);
  try {
    const [markdown, templateText] = await Promise.all([
      readFile(inputPath, "utf8"),
      values.template ? readFile(resolve(values.template), "utf8") : readDefaultTemplate(),
    ]);

    const { components, problems } = await componentsWith(values.components);
    if (problems.length > 0) {
      for (const problem of problems) stderr.write(`${problem}\n`);
      return 1;
    }

    const folder = dirname(inputPath);
    const files = await filesUnder(folder, "/");
    const load = jsonBeside({ page: inputPath, folder, files });

    // The CLI has no browser to render Mermaid SVGs, so mermaid blocks stay as code blocks
    // rather than turning into unresolved placeholders.
    let job = Export.ofMarkdown(markdown)
      .templateSource(templateText)
      .components(components)
      .jsonLoader(load)
      .onWarning((message) => stderr.write(`aviso: ${message}\n`));

    if (values.title !== undefined) job = job.title(values.title);
    if (values.subtitle !== undefined) job = job.subtitle(values.subtitle);
    if (values.author !== undefined) job = job.author(values.author);
    if (values.date !== undefined) job = job.date(values.date);
    if (values.toc) job = job.toc();

    const activeEngines = engines ?? systemEngines();

    if (format === "pdf") {
      const pdfBytes = await job.toPdf(activeEngines);
      const outPath = resolve(values.out);
      await mkdir(dirname(outPath), { recursive: true });
      await writeFile(outPath, pdfBytes);
      return 0;
    }

    const typstText = await job.toTypst(activeEngines);
    if (values.out) {
      const outPath = resolve(values.out);
      await mkdir(dirname(outPath), { recursive: true });
      await writeFile(outPath, typstText, "utf8");
    } else {
      stdout.write(typstText);
    }
    return 0;
  } catch (error) {
    stderr.write(`${error.message}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  process.exit(await runCli(process.argv.slice(2)));
}
