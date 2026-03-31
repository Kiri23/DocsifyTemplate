// Docsify Plugin: Tutorial Header
// Injects wayfinding orientation (breadcrumb, time, difficulty, outcome)
// for pages with frontmatter type: tutorial

(function () {
  function buildBreadcrumb(vm) {
    var path = vm.route.path || '';
    // Remove leading slash and file extension
    var parts = path.replace(/^\//, '').replace(/\.md$/, '').split('/');
    // Filter empty parts
    parts = parts.filter(function (p) { return p.length > 0; });
    if (parts.length <= 1) return '';

    // Build breadcrumb from path segments (skip last — that's the current page)
    var crumbs = parts.slice(0, -1).map(function (segment) {
      var label = segment.charAt(0).toUpperCase() + segment.slice(1);
      return '<span class="tutorial-breadcrumb-segment">' + label + '</span>';
    });

    return '<nav class="tutorial-breadcrumb" aria-label="Breadcrumb">' +
      crumbs.join('<span class="tutorial-breadcrumb-sep" aria-hidden="true">/</span>') +
      '</nav>';
  }

  function buildHeader(meta, vm) {
    var parts = [];

    // Breadcrumb
    parts.push(buildBreadcrumb(vm));

    // Meta bar: badge + time + difficulty
    var metaItems = [];
    metaItems.push('<span class="tutorial-badge">Tutorial</span>');

    if (meta.time) {
      metaItems.push('<span class="tutorial-meta-item">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
        meta.time + '</span>');
    }

    if (meta.difficulty) {
      var diffLabel = meta.difficulty;
      metaItems.push('<span class="tutorial-meta-item tutorial-difficulty-' + diffLabel + '">' + diffLabel + '</span>');
    }

    parts.push('<div class="tutorial-meta-bar">' + metaItems.join('') + '</div>');

    // Outcome
    if (meta.outcome) {
      parts.push('<p class="tutorial-outcome"><strong>What you\'ll build:</strong> ' + meta.outcome + '</p>');
    }

    return '<div class="tutorial-header">' + parts.join('') + '</div>';
  }

  window.$docsify = window.$docsify || {};
  window.$docsify.plugins = (window.$docsify.plugins || []).concat([
    function tutorialHeaderPlugin(hook, vm) {
      hook.afterEach(function (html, next) {
        var meta = window.__pageMetadata;
        if (!meta || meta.type !== 'tutorial') {
          next(html);
          return;
        }

        var header = buildHeader(meta, vm);

        // Inject after the first <h1>
        var h1End = html.indexOf('</h1>');
        if (h1End !== -1) {
          var insertAt = h1End + 5;
          html = html.slice(0, insertAt) + header + html.slice(insertAt);
        } else {
          html = header + html;
        }

        next(html);
      });
    }
  ]);
})();
