// HTMX Virtual Routes — intercepts /api/switch/* for tab content swapping
// No real HTTP requests. Reads from window.__pageSections.

(function() {
  document.addEventListener('htmx:configRequest', function(e) {
    var path = e.detail.path;
    if (!path || !path.startsWith('/api/switch/')) return;

    // Prevent real HTTP request
    e.preventDefault();

    // Extract view type: /api/switch/quick-start → "quick-start"
    var viewType = path.replace('/api/switch/', '');

    if (!window.__pageSections || !window.__pageSections[viewType]) {
      console.warn('[htmx-virtual] No section found for:', viewType);
      return;
    }

    // Swap content into target
    var target = document.getElementById('tab-content');
    if (!target) return;

    target.innerHTML = window.__pageSections[viewType];

    // Re-run post-render hooks on new content
    if (window.Prism) {
      Prism.highlightAll();
    }

    if (window.mermaid) {
      var mermaidEls = target.querySelectorAll('.mermaid');
      if (mermaidEls.length > 0) {
        mermaid.init(undefined, mermaidEls);
      }
    }

    // Re-process region directives in swapped content
    if (window.processRegionDirectives) {
      processRegionDirectives();
    }
  });
})();
