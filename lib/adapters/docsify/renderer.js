// Docsify Adapter — single orchestrator.
// Wires core engine + DOM transforms to Docsify's plugin lifecycle.
// This is the ONLY file that registers a docsify plugin.

import {
  hasFrontmatter,
  extractFrontmatter,
  stripFrontmatter
} from '../../core/markdown-utils.js';
import { transformMarkdown } from '../../core/markdown-transform.js';
import { transformDOM, injectDOM, observeDOM } from '../../core/dom-transform.js';
import { bridge, getComponent } from '../../core/registry.js';
import { Tabs } from '../../components/tabs.js';
import { processRegionDirectives } from '../../components/region-toggle.js';

// Hooks — exported functions, no standalone plugin registrations
import { addCopyButton, observeCopyButtons } from './features/copy-button.js';
import { injectExportBar } from './features/latex-export.js';
import { injectGemmaChat } from './features/gemma-chat.js';
import { initSidebarGroups, observeSidebar } from './features/sidebar.js';
import { convertMermaidCode, runMermaid } from './dom-helpers/mermaid-dom.js';

// --- Docsify-specific: render a component via bridge ---

function renderComponent(fnName, data) {
  if (getComponent(fnName)) {
    if (bridge.mode === 'string' && bridge.renderToStringSync) {
      return bridge.renderToStringSync(fnName, data);
    }
    return bridge.createPlaceholder(fnName, data);
  }
  return null;
}

// --- Docsify-specific: tabbed page builder ---

function buildTabbedPage(html, metadata) {
  if (!metadata || metadata.type !== 'guide') return html;

  const splitMarker = /<h2[^>]*>.*?Technical Reference.*?<\/h2>/i;
  const parts = html.split(splitMarker);
  let quickStartHtml, technicalHtml;

  if (parts.length >= 2) {
    quickStartHtml = parts[0];
    technicalHtml = '<h2>Technical Reference</h2>' + parts.slice(1).join('');
  } else {
    quickStartHtml = html;
    technicalHtml = html;
  }

  window.__pageSections = { 'quick-start': quickStartHtml, 'technical': technicalHtml };

  const tabs = Tabs([
    { label: 'Quick Start', href: '/api/switch/quick-start', active: true },
    { label: 'Technical Reference', href: '/api/switch/technical', active: false }
  ], 'tab-content');

  return tabs + '<div id="tab-content" class="tab-zone-quick-start" role="tabpanel">' + quickStartHtml + '</div>';
}

// --- Register single Docsify plugin ---

let cleanupObservers = null;

window.$docsify = window.$docsify || {};
window.$docsify.plugins = (window.$docsify.plugins || []).concat([
  function docsifyAdapter(hook) {

    // --- beforeEach: markdown string transforms ---
    hook.beforeEach(function(markdown) {
      window.__rawMarkdown = markdown;
      window.__pageMetadata = null;
      window.__pageSections = null;

      if (hasFrontmatter(markdown)) {
        window.__pageMetadata = extractFrontmatter(markdown);
        markdown = stripFrontmatter(markdown);
      }

      markdown = transformMarkdown(markdown, {
        parseYaml: window.jsyaml.load,
        renderComponent
      });

      return markdown;
    });

    // --- afterEach: HTML string transforms ---
    hook.afterEach(function(html, next) {
      if (!window.__pageMetadata || window.__pageMetadata.type !== 'guide') {
        next(html);
        return;
      }
      next(buildTabbedPage(html, window.__pageMetadata));
    });

    // --- doneEach: DOM transforms ---
    hook.doneEach(function() {
      const section = document.querySelector('.markdown-section');
      if (!section) return;

      // Cleanup previous observers before setting up new ones
      if (cleanupObservers) {
        cleanupObservers();
        cleanupObservers = null;
      }

      // Category A: enhance existing content
      transformDOM(section, {
        mermaidCode: convertMermaidCode,
        codeBlock: function(el) {
          if (window.Prism) Prism.highlightElement(el);
          addCopyButton(el);
        },
      });

      // Region directives process all at once (needs sibling traversal)
      processRegionDirectives();

      // Mermaid batch-run (needs all divs converted first)
      runMermaid(section);

      // Mount Preact components
      bridge.mountAll();

      // HTMX activation
      if (window.htmx) htmx.process(section);

      // Category B: inject UI
      injectDOM(section, {
        exportBar: injectExportBar,
        gemmaChat: injectGemmaChat,
      });

      // Category C: observe future changes
      cleanupObservers = observeDOM(section, {
        copyButtons: observeCopyButtons,
      });

      // Sidebar (operates on .sidebar-nav, not section — runs with setTimeout per docsify quirk)
      setTimeout(initSidebarGroups, 0);
    });

    // Sidebar observer — persistent across page navigations
    observeSidebar();
  }
]);
