// Docsify Adapter
// Wires the portable engine to Docsify's plugin lifecycle.
// This is the ONLY file that knows about Docsify, window.$docsify, or the DOM.

import {
  hasFrontmatter,
  extractFrontmatter,
  stripFrontmatter,
  processCodeFenceComponents
} from '../../core/engine.js';
import { bridge, getComponent } from '../../core/registry.js';
import { Tabs } from '../../components/tabs.js';
import { processRegionDirectives } from '../../components/region-toggle.js';

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

// --- Docsify-specific: post-render DOM enhancements ---

function highlightCode() {
  if (window.Prism) Prism.highlightAll();
}

function processMermaidDiagrams() {
  if (!window.mermaid) return;
  const mermaidCodes = document.querySelectorAll(
    '.markdown-section pre code.lang-mermaid, .markdown-section pre code.language-mermaid'
  );
  mermaidCodes.forEach(codeEl => {
    const pre = codeEl.parentElement;
    const source = codeEl.textContent;
    const container = document.createElement('div');
    container.className = 'mermaid';
    container.textContent = source;
    pre.parentElement.replaceChild(container, pre);
  });

  const mermaidEls = document.querySelectorAll('.markdown-section .mermaid');
  if (mermaidEls.length > 0) {
    if (typeof mermaid.run === 'function') {
      mermaid.run({ nodes: mermaidEls });
    } else {
      mermaid.init(undefined, mermaidEls);
    }
  }
}

// --- Register Docsify plugin ---

window.$docsify = window.$docsify || {};
window.$docsify.plugins = (window.$docsify.plugins || []).concat([
  function componentRendererPlugin(hook) {

    hook.beforeEach(function(markdown) {
      window.__rawMarkdown = markdown;
      window.__pageMetadata = null;
      window.__pageSections = null;

      if (!hasFrontmatter(markdown)) return markdown;
      window.__pageMetadata = extractFrontmatter(markdown);
      return stripFrontmatter(markdown);
    });

    hook.afterEach(function(html, next) {
      html = processCodeFenceComponents(html, {
        parseYaml: window.jsyaml.load,
        renderComponent
      });

      if (!window.__pageMetadata || window.__pageMetadata.type !== 'guide') {
        next(html);
        return;
      }
      next(buildTabbedPage(html, window.__pageMetadata));
    });

    hook.doneEach(function() {
      bridge.mountAll();

      highlightCode();
      processMermaidDiagrams();

      processRegionDirectives();
      if (window.htmx) {
        const section = document.querySelector('.markdown-section');
        if (section) htmx.process(section);
      }
    });
  }
]);
