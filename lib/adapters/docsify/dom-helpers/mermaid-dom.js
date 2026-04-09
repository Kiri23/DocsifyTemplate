// Shared DOM operations used by both renderer.js and htmx-virtual.js.
// Extracted to avoid duplication.

// transformDOM callback: converts <pre><code class="lang-mermaid"> to <div class="mermaid">.
export function convertMermaidCode(codeEl) {
  const pre = codeEl.parentElement;
  const container = document.createElement('div');
  container.className = 'mermaid';
  container.textContent = codeEl.textContent;
  pre.parentElement.replaceChild(container, pre);
}

// Batch-execute mermaid on all .mermaid divs within root.
// Must be called AFTER convertMermaidCode has run.
export function runMermaid(root) {
  if (!window.mermaid) return;
  const els = root.querySelectorAll('.mermaid');
  if (els.length === 0) return;
  if (typeof mermaid.run === 'function') {
    mermaid.run({ nodes: els });
  } else {
    mermaid.init(undefined, els);
  }
}
