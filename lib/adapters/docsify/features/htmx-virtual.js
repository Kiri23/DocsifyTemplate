// HTMX Virtual Routes — intercepts /api/switch/* for tab content swapping.
// No real HTTP requests. Reads from window.__pageSections.
// Uses transformDOM to re-process content after swap (no duplicated logic).

import { transformDOM } from '../../../core/dom-transform.js';
import { convertMermaidCode, runMermaid } from '../dom-helpers/mermaid-dom.js';
import { processRegionDirectives } from '../../../components/region-toggle.js';

(function() {
  document.addEventListener('htmx:configRequest', function(e) {
    var path = e.detail.path;
    if (!path || !path.startsWith('/api/switch/')) return;

    e.preventDefault();

    var viewType = path.replace('/api/switch/', '');

    if (!window.__pageSections || !window.__pageSections[viewType]) {
      console.warn('[htmx-virtual] No section found for:', viewType);
      return;
    }

    var target = document.getElementById('tab-content');
    if (!target) return;

    target.className = '';
    target.innerHTML = window.__pageSections[viewType];
    void target.offsetHeight;
    target.className = 'tab-zone-' + viewType;

    // Re-process content using shared DOM transforms
    transformDOM(target, {
      mermaidCode: convertMermaidCode,
      codeBlock: function(el) { if (window.Prism) Prism.highlightElement(el); },
    });

    runMermaid(target);
    processRegionDirectives();
  });
})();
