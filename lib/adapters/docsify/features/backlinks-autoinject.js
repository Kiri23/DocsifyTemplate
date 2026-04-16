// Auto-inject a BacklinksPanel at the end of every page, unless the page
// already rendered one from a ```backlinks-panel fence (which produces a
// placeholder div with data-preact-component="BacklinksPanel").
//
// Must run BEFORE bridge.mountAll() so the injected placeholder is mounted
// in the same Preact render pass as fence-rendered components.

import { bridge } from '../../../core/registry.js';

export function injectBacklinksPanel(section) {
  if (!section) return;
  if (section.querySelector('[data-preact-component="BacklinksPanel"]')) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'auto-backlinks mt-8';
  wrapper.innerHTML = bridge.createPlaceholder('BacklinksPanel', {});
  section.appendChild(wrapper);
}
