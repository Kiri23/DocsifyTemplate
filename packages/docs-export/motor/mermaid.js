// Replaces %%MERMAID_SVG_N%% placeholders emitted by filters/mermaid-placeholder.lua
// with inline Typst image calls. Shared by both the Node and browser transports.

const PLACEHOLDER = /%%MERMAID_SVG_(\d+)%%/g;

/** Escapes a string for a Typst double-quoted literal. */
function escapeTypstString(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");
}

/**
 * Splices captured Mermaid SVGs into Typst source where the Lua filter left placeholders.
 * Placeholders without a matching SVG index are removed so Typst compilation still succeeds.
 * @param {string} typstSource Typst text produced by Pandoc
 * @param {string[]} svgs serialized SVG strings in document order
 * @returns {string}
 */
export function inlineMermaidSvgs(typstSource, svgs = []) {
  return typstSource.replace(PLACEHOLDER, (_match, indexText) => {
    const index = Number(indexText);
    if (!Number.isInteger(index) || index < 0 || index >= svgs.length) return "";
    const svg = svgs[index];
    if (!svg) return "";
    return `#image(bytes("${escapeTypstString(svg)}"), format: "svg", width: 80%)`;
  });
}
