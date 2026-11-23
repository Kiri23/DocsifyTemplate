// Takes the Mermaid diagrams the page already drew and turns them into SVG text Typst can read.
// Used by transportes/docsify/export-button.js; the motor splices them in with inlineMermaidSvgs.

const SVG_NS = "http://www.w3.org/2000/svg";
// Size of a label box when the diagram doesn't say, and how the plain label is drawn.
const DEFAULT_LABEL_WIDTH = "100";
const DEFAULT_LABEL_HEIGHT = "20";
const LABEL_BASELINE_NUDGE = 5;
const LABEL_FONT_SIZE = "14";

/** Collects every drawn Mermaid diagram under the page, in page order, as SVG text. */
export function captureMermaidSvgs(root) {
  const doc = root.ownerDocument ?? root;
  const svgs = [];
  for (const svg of root.querySelectorAll(".mermaid svg")) {
    const clone = svg.cloneNode(true);
    for (const box of [...clone.querySelectorAll("foreignObject")]) {
      box.parentNode.replaceChild(plainLabelFor(box, doc), box);
    }
    if (!clone.getAttribute("xmlns")) clone.setAttribute("xmlns", SVG_NS);
    svgs.push(clone.outerHTML);
  }
  return svgs;
}

/** Replaces an HTML label inside the diagram with plain SVG text, which Typst can draw. */
function plainLabelFor(box, doc) {
  const x = parseFloat(box.getAttribute("x") || "0");
  const y = parseFloat(box.getAttribute("y") || "0");
  const width = parseFloat(box.getAttribute("width") || DEFAULT_LABEL_WIDTH);
  const height = parseFloat(box.getAttribute("height") || DEFAULT_LABEL_HEIGHT);
  const text = doc.createElementNS(SVG_NS, "text");
  text.setAttribute("x", String(x + width / 2));
  text.setAttribute("y", String(y + height / 2 + LABEL_BASELINE_NUDGE));
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("dominant-baseline", "middle");
  text.setAttribute("font-size", LABEL_FONT_SIZE);
  text.setAttribute("font-family", "sans-serif");
  text.textContent = box.textContent.trim();
  return text;
}
