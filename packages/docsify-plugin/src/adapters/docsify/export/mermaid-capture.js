/* mermaid-capture.js — Capture and clean Mermaid SVGs from the DOM */

// Capture rendered Mermaid SVGs from the DOM.
// Cleans foreignObject → native SVG <text> so Typst can render text.
export function captureMermaidSVGs() {
  var svgs = [];
  var svgElements = document.querySelectorAll('.markdown-section .mermaid svg');
  svgElements.forEach(function (svg) {
    var clone = svg.cloneNode(true);
    clone.querySelectorAll('foreignObject').forEach(function (fo) {
      var textContent = fo.textContent.trim();
      var svgText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      var x = parseFloat(fo.getAttribute('x') || '0');
      var y = parseFloat(fo.getAttribute('y') || '0');
      var w = parseFloat(fo.getAttribute('width') || '100');
      var h = parseFloat(fo.getAttribute('height') || '20');
      svgText.setAttribute('x', String(x + w / 2));
      svgText.setAttribute('y', String(y + h / 2 + 5));
      svgText.setAttribute('text-anchor', 'middle');
      svgText.setAttribute('dominant-baseline', 'middle');
      svgText.setAttribute('font-size', '14');
      svgText.setAttribute('font-family', 'sans-serif');
      svgText.textContent = textContent;
      fo.parentNode.replaceChild(svgText, fo);
    });
    svgs.push(new XMLSerializer().serializeToString(clone));
  });
  return svgs;
}

// Replace %%MERMAID_SVG_N%% placeholders in Typst source with image.decode
export function inlineMermaidSVGs(typstSource, svgs) {
  return typstSource.replace(/%%MERMAID_SVG_(\d+)%%/g, function (match, idx) {
    var i = parseInt(idx);
    if (i >= svgs.length) return '';
    var escaped = svgs[i].replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return '#image.decode("' + escaped + '", width: 80%)';
  });
}
