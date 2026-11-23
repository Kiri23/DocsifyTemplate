// Turns the Mermaid placeholders left by filters/mermaid-placeholder.lua into inline images.
// Called by motor/export.js after Pandoc finishes, and reused by the browser transport.
import { escapeTypstString } from "../../docs-site/as/typst.js";

const PLACEHOLDER = /%%MERMAID_SVG_(\d+)%%/g;

/** Replaces each Mermaid placeholder with its matching diagram, or removes it when absent. */
export function inlineMermaidSvgs(typstSource, svgs = []) {
  return typstSource.replace(PLACEHOLDER, (_match, indexText) => {
    const index = Number(indexText);
    if (!Number.isInteger(index) || index < 0 || index >= svgs.length) return "";
    const svg = svgs[index];
    if (!svg) return "";
    return `#image(bytes("${escapeTypstString(svg)}"), format: "svg", width: 80%)`;
  });
}
