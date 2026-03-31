// Docsify Plugin: Component Renderer
//
// Turns markdown code fences into rendered components and splits guide pages into tabs.
// Docsify gives plugins 3 hooks that run on every page navigation:
//   beforeEach(markdown) — raw markdown before Docsify renders it
//   afterEach(html, next)  — rendered HTML before it hits the DOM
//   doneEach()             — after the DOM is updated
//
// This file is only wiring. All transformation logic lives in
// component-renderer-engine.js (window.__CREngine).

(function() {
  var E = window.__CREngine;

  window.$docsify = window.$docsify || {};
  window.$docsify.plugins = (window.$docsify.plugins || []).concat([
    function componentRendererPlugin(hook, vm) {

      // beforeEach: store raw markdown, parse and strip frontmatter
      hook.beforeEach(function(markdown) {
        window.__rawMarkdown = markdown;
        window.__pageMetadata = null;
        window.__pageSections = null;

        if (!E.hasFrontmatter(markdown)) return markdown;

        window.__pageMetadata = E.extractFrontmatter(markdown);
        return E.stripFrontmatter(markdown);
      });

      // afterEach: render code fence components, build tabbed page for guides
      hook.afterEach(function(html, next) {
        html = E.processCodeFenceComponents(html);

        if (!window.__pageMetadata || window.__pageMetadata.type !== 'guide') {
          next(html);
          return;
        }

        next(E.buildTabbedPage(html, window.__rawMarkdown, window.__pageMetadata));
      });

      // doneEach: post-render enhancements
      hook.doneEach(function() {
        E.highlightCode();
        E.processMermaidDiagrams();

        if (window.processRegionDirectives) {
          processRegionDirectives();
        }

        if (window.htmx) {
          var section = document.querySelector('.markdown-section');
          if (section) htmx.process(section);
        }

        E.initScrollReveal();
      });
    }
  ]);
})();
