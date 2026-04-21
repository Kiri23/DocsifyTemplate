// Collapsible sidebar groups for docsify v4.
// Exports functions for use by renderer.js (no standalone plugin registration).
//
// Docsify v4 DOM quirks this module handles:
//   - Top-level text items:  <li><p>Text</p><ul>...</ul></li>
//   - Nested text items:     <li>Text<ul>...</ul></li>  (bare text node)
//   - Double-click bug: docsify adds 'collapse' to both <li> and <p>,
//     hiding children. CSS neutralizes it; JS strips it on next tick.
//
// Our state uses 'collapsed' (with 'd') — no conflict with docsify's 'collapse'.

// ── Helpers ──

function getOrCreateToggle(li) {
  const p = li.querySelector(':scope > p');
  if (p) return p;

  for (const node of li.childNodes) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
      const span = document.createElement('span');
      span.className = 'sidebar-group-title';
      span.textContent = node.textContent.trim();
      li.replaceChild(span, node);
      return span;
    }
  }

  return null;
}

function getDepth(li, nav) {
  let depth = 0;
  let el = li.parentElement;
  while (el && el !== nav) {
    if (el.tagName === 'UL') depth++;
    el = el.parentElement;
  }
  return depth - 1;
}

function stripDocsifyCollapse() {
  for (const el of document.querySelectorAll('.sidebar .collapse')) {
    el.classList.remove('collapse');
  }
}

// ── Exported functions ──

// transformDOM callback: initialize collapsible groups.
export function initSidebarGroups() {
  const nav = document.querySelector('.sidebar-nav');
  if (!nav) return;

  for (const li of nav.querySelectorAll('li')) {
    if (li.classList.contains('sidebar-group')) continue;
    if (li.querySelector(':scope > a')) continue;
    if (!li.querySelector(':scope > ul')) continue;

    const toggle = getOrCreateToggle(li);
    if (!toggle) continue;

    li.classList.add('sidebar-group');
    li.setAttribute('data-depth', getDepth(li, nav));

    if (!li.querySelector('li.active, a.active')) {
      li.classList.add('collapsed');
    }

    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      li.classList.toggle('collapsed');
    });
  }
}

// observeDOM callback: watches for sidebar clicks to strip docsify's collapse class.
// Returns cleanup function.
export function observeSidebar() {
  function handler(e) {
    if (e.target.closest?.('.sidebar')) {
      setTimeout(stripDocsifyCollapse, 0);
    }
  }
  document.addEventListener('click', handler);
  return function() { document.removeEventListener('click', handler); };
}
