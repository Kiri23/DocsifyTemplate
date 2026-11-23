// Turns the Mermaid placeholders left by filters/mermaid-placeholder.lua into inline images.
// Called by motor/export.js after Pandoc finishes, and reused by the browser transport.
import { escapeTypstString } from "../../docs-site/as/typst.js";

const PLACEHOLDER = /%%MERMAID_SVG_(\d+)%%/g;

// What the document shows where a diagram was expected but none was captured.
export const MISSING_DIAGRAM_NOTE = "#emph[(diagrama Mermaid no capturado)]";

/** Replaces each Mermaid placeholder with its matching diagram, or a visible note when absent. */
export function inlineMermaidSvgs(typstSource, svgs = [], { onWarning } = {}) {
  return typstSource.replace(PLACEHOLDER, (_match, indexText) => {
    const index = Number(indexText);
    const svg = Number.isInteger(index) && index >= 0 ? svgs[index] : undefined;
    if (!svg) {
      onWarning?.(`el diagrama Mermaid ${index + 1} no se capturó; queda una nota en su lugar`);
      return MISSING_DIAGRAM_NOTE;
    }
    return `#image(bytes("${escapeTypstString(svg)}"), format: "svg", width: 80%)`;
  });
}
