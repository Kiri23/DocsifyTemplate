// DOM transform functions — three lifecycle patterns for DOM manipulation.
// Pure functions. Require a DOM root element. No framework dependency.
//
// transformDOM(root, callbacks) — enhance existing elements, fire once
// injectDOM(root, callbacks)    — create and insert new UI, fire once
// observeDOM(root, callbacks)   — watch for future changes, persistent

const selectors = {
  codeBlock: 'pre > code',
  mermaidCode: 'pre code.lang-mermaid, pre code.language-mermaid',
  mermaidDiv: '.mermaid',
  preactPlaceholder: '[data-preact-component]',
};

// Category A: find elements by selector, call callback on each.
export function transformDOM(root, callbacks) {
  for (const [key, fn] of Object.entries(callbacks)) {
    if (!fn) continue;
    const selector = selectors[key];
    if (selector) {
      root.querySelectorAll(selector).forEach(fn);
    }
  }
}

// Category B: each callback receives root, creates/inserts UI.
export function injectDOM(root, callbacks) {
  for (const fn of Object.values(callbacks)) {
    if (fn) fn(root);
  }
}

// Category C: each callback sets up observers/listeners on root.
// Returns a cleanup function that tears down all observers.
export function observeDOM(root, callbacks) {
  const cleanups = [];
  for (const fn of Object.values(callbacks)) {
    if (fn) {
      const cleanup = fn(root);
      if (typeof cleanup === 'function') cleanups.push(cleanup);
    }
  }
  return () => cleanups.forEach(fn => fn());
}
