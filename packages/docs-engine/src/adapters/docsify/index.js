// Docsify adapter — wires the core engine to Docsify's plugin lifecycle.
// This is the only file that knows about $docsify, hook.*, and window.*.
// Consumers who want a different shell (React, Astro) write their own adapter.

import {
  hasFrontmatter,
  extractFrontmatter,
  stripFrontmatter
} from '../../core/markdown-utils.js';
import { transformMarkdown } from '../../core/markdown-transform.js';
import { transformDOM, injectDOM, observeDOM } from '../../utils/dom-transform.js';
import { registerAll } from '../../core/registry.js';
import { isFeatureEnabled, getConfig, initConfig } from '../../core/config.js';
import { defineCustomElements, renderCustomElement } from '../../core/custom-elements.js';
import { Tabs } from '../../components/tabs.js';
import { processRegionDirectives } from '../../components/region-toggle.js';
import { defaultComponents } from '../../components/index.js';

import { addCopyButton, observeCopyButtons } from './features/copy-button.js';
import { initSidebarGroups, observeSidebar } from './features/sidebar.js';
import { convertMermaidCode, runMermaid } from './dom-helpers/mermaid-dom.js';

import './features/htmx-virtual.js';
import './features/tutorial-header.js';

initConfig(window.__docsifyTemplateConfig || {});

export function createPlugin(options = {}) {
  const allComponents = { ...defaultComponents, ...(options.components || {}) };
  registerAll(allComponents);
  defineCustomElements(allComponents);

  function renderComponent(name, data, lang) {
    if (lang && lang in allComponents) return renderCustomElement(lang, data);
    return null;
  }

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

  const cfg = getConfig();
  window.$docsify = window.$docsify || {};
  Object.assign(window.$docsify, { name: cfg.title, ...cfg.docsify });

  let cleanupObservers = null;

  window.$docsify.plugins = (window.$docsify.plugins || []).concat([
    function docsifyAdapter(hook) {

      hook.init(function() {
        for (const lang of (cfg.prism?.languages || [])) {
          const s = document.createElement('script');
          s.src = `https://cdn.jsdelivr.net/npm/prismjs@1/components/prism-${lang}.min.js`;
          s.defer = true;
          document.body.appendChild(s);
        }
        if (isFeatureEnabled('mermaid')) {
          const mCfg = cfg.features.mermaid;
          const s = document.createElement('script');
          s.src = 'https://cdn.jsdelivr.net/npm/mermaid@10.9/dist/mermaid.min.js';
          s.onload = () => mermaid.initialize({ startOnLoad: mCfg.startOnLoad ?? false, theme: mCfg.theme || 'default' });
          document.body.appendChild(s);
        }
        if (isFeatureEnabled('devTools')) {
          const s = document.createElement('script');
          s.src = 'https://cdn.jsdelivr.net/npm/eruda';
          s.onload = () => eruda.init();
          document.body.appendChild(s);
        }
      });

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

      hook.afterEach(function(html, next) {
        if (!isFeatureEnabled('tabs')) { next(html); return; }
        const triggerType = getConfig().features.tabs.triggerType || 'guide';
        if (!window.__pageMetadata || window.__pageMetadata.type !== triggerType) {
          next(html); return;
        }
        next(buildTabbedPage(html, window.__pageMetadata));
      });

      hook.doneEach(function() {
        const section = document.querySelector('.markdown-section');
        if (!section) return;

        if (cleanupObservers) { cleanupObservers(); cleanupObservers = null; }

        const copyEnabled = isFeatureEnabled('copyButton');
        transformDOM(section, {
          mermaidCode: isFeatureEnabled('mermaid') ? convertMermaidCode : null,
          codeBlock: function(el) {
            if (window.Prism) Prism.highlightElement(el);
            if (copyEnabled) addCopyButton(el);
          },
        });

        processRegionDirectives();
        if (isFeatureEnabled('mermaid')) runMermaid(section);

        if (window.htmx) htmx.process(section);

        injectDOM(section, {});

        const observers = {};
        if (copyEnabled) observers.copyButtons = observeCopyButtons;
        cleanupObservers = observeDOM(section, observers);

        setTimeout(initSidebarGroups, 0);
      });

      observeSidebar();
    }
  ]);
}

// Batteries-included default — Docsify consumers get this for free
createPlugin({ components: defaultComponents });
