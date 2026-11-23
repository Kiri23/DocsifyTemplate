// Turns the page a Docsify site is showing into a Typst or PDF file ready to download.
// Called by transportes/docsify/export-button.js; runs the motor (motor/export.js) with the
// engines it is given, so it never downloads anything itself.
import { Export } from "../../motor/mod.js";
import { countMermaidFences } from "../browser/mermaid-capture.js";

export const EXPORT_FORMATS = Object.freeze({
  typ: Object.freeze({ extension: ".typ", mime: "text/plain;charset=utf-8" }),
  pdf: Object.freeze({ extension: ".pdf", mime: "application/pdf" }),
});

/** Makes a file name from the page title: lower case, words joined by dashes. */
export function fileNameFor(title, extension) {
  const slug = (title ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "documento"}${extension}`;
}

/** Builds the downloadable file for one page in the chosen format. */
export async function exportPage({
  markdown,
  format,
  engines,
  title,
  templateSource,
  mermaidFilterSource,
  mermaidSvgs = [],
  components,
  onWarning = () => {},
}) {
  const target = EXPORT_FORMATS[format];
  if (!target) {
    throw new Error(`formato de export desconocido "${format}": usá "typ" o "pdf"`);
  }

  let job = Export.ofMarkdown(markdown).onWarning(onWarning);
  if (title) job = job.title(title);
  if (templateSource !== undefined) job = job.templateSource(templateSource);
  if (components) job = job.components(components);

  // The motor swaps each Mermaid block for the diagram at the same position, so the drawn
  // diagrams only go in when there is one per block. Otherwise the blocks stay as code.
  const fences = countMermaidFences(markdown);
  if (fences > 0 && mermaidFilterSource !== undefined) {
    if (mermaidSvgs.length === fences) {
      job = job.mermaidFilterSource(mermaidFilterSource).mermaidSvgs(mermaidSvgs);
    } else {
      onWarning(
        `la página tiene ${fences} diagrama(s) Mermaid y se capturaron ${mermaidSvgs.length} dibujados; ` +
          "se exportan como bloque de código",
      );
    }
  }

  const filename = fileNameFor(title, target.extension);
  if (format === "pdf") {
    return { filename, mime: target.mime, content: await job.toPdf(engines) };
  }
  return { filename, mime: target.mime, content: await job.toTypst(engines) };
}
