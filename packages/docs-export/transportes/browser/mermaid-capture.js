// Takes the Mermaid diagrams the page already drew and turns them into SVG text Typst can read.
// Used by transportes/docsify/export-button.js; the motor splices them in with inlineMermaidSvgs.

const SVG_NS = "http://www.w3.org/2000/svg";

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
  const width = parseFloat(box.getAttribute("width") || "100");
  const height = parseFloat(box.getAttribute("height") || "20");
  const text = doc.createElementNS(SVG_NS, "text");
  text.setAttribute("x", String(x + width / 2));
  text.setAttribute("y", String(y + height / 2 + 5));
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("dominant-baseline", "middle");
  text.setAttribute("font-size", "14");
  text.setAttribute("font-family", "sans-serif");
  text.textContent = box.textContent.trim();
  return text;
}
