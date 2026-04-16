// Docsify Adapter — single orchestrator.
// Wires core engine + DOM transforms to Docsify's plugin lifecycle.
// This is the ONLY file that registers a docsify plugin.
// All feature gating reads from config.js.

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
import { isFeatureEnabled, getConfig } from '../../core/config.js';

// Hooks — exported functions, no standalone plugin registrations
import { addCopyButton, observeCopyButtons } from './features/copy-button.js';
import { injectExportBar } from './features/latex-export.js';
import { injectGemmaChat } from './features/gemma-chat.js';
import { initSidebarGroups, observeSidebar } from './features/sidebar.js';
import { renderWikiLinks } from './features/wiki-links.js';
import { convertMermaidCode, runMermaid } from './dom-helpers/mermaid-dom.js';
import { bootBacklinksStore, basenameMap } from '../../state/backlinks-store.js';
import { effect } from '@preact/signals';

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
  const cfg = getConfig();
  const tabsCfg = cfg.features.tabs;
  const triggerType = tabsCfg.triggerType || 'guide';
  const labels = tabsCfg.labels || { 'quick-start': 'Quick Start', 'technical': 'Technical Reference' };

  if (!metadata || metadata.type !== triggerType) return html;

  const techLabel = labels['technical'] || 'Technical Reference';
  const splitMarker = new RegExp('<h2[^>]*>.*?' + techLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '.*?<\\/h2>', 'i');
  const parts = html.split(splitMarker);
  let quickStartHtml, technicalHtml;

  if (parts.length >= 2) {
    quickStartHtml = parts[0];
    technicalHtml = '<h2>' + techLabel + '</h2>' + parts.slice(1).join('');
  } else {
    quickStartHtml = html;
    technicalHtml = html;
  }

  window.__pageSections = { 'quick-start': quickStartHtml, 'technical': technicalHtml };

  const tabs = Tabs([
    { label: labels['quick-start'] || 'Quick Start', href: '/api/switch/quick-start', active: true },
    { label: techLabel, href: '/api/switch/technical', active: false }
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
      if (!isFeatureEnabled('tabs')) { next(html); return; }
      const triggerType = getConfig().features.tabs.triggerType || 'guide';
      if (!window.__pageMetadata || window.__pageMetadata.type !== triggerType) {
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
      const copyEnabled = isFeatureEnabled('copyButton');
      transformDOM(section, {
        mermaidCode: isFeatureEnabled('mermaid') ? convertMermaidCode : null,
        codeBlock: function(el) {
          if (window.Prism) Prism.highlightElement(el);
          if (copyEnabled) addCopyButton(el);
        },
      });

      // Wiki-links: [[basename]] → <a href="#/path">
      renderWikiLinks(section);

      // Region directives process all at once (needs sibling traversal)
      processRegionDirectives();

      // Mermaid batch-run (needs all divs converted first)
      if (isFeatureEnabled('mermaid')) runMermaid(section);

      // Mount Preact components
      bridge.mountAll();

      // HTMX activation
      if (window.htmx) htmx.process(section);

      // Category B: inject UI (config-gated)
      const injectors = {};
      if (isFeatureEnabled('export')) injectors.exportBar = injectExportBar;
      if (isFeatureEnabled('chat'))   injectors.gemmaChat = () => injectGemmaChat(getConfig());
      injectDOM(section, injectors);

      // Category C: observe future changes
      const observers = {};
      if (copyEnabled) observers.copyButtons = observeCopyButtons;
      cleanupObservers = observeDOM(section, observers);

      // Sidebar (operates on .sidebar-nav, not section — runs with setTimeout per docsify quirk)
      setTimeout(initSidebarGroups, 0);
    });

    // Sidebar observer — persistent across page navigations
    observeSidebar();

    // Boot backlinks/wiki-links scan once (idempotent); re-render wiki-links
    // when the basename map arrives so the first page doesn't miss them.
    bootBacklinksStore();
    let firstRun = true;
    effect(() => {
      // Subscribe to basenameMap changes. Skip the initial synchronous run.
      const map = basenameMap.value;
      if (firstRun) { firstRun = false; return; }
      if (Object.keys(map).length === 0) return;
      const section = document.querySelector('.markdown-section');
      if (section) renderWikiLinks(section);
    });
  }
]);
