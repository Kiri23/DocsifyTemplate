// Shared utilities for Docsify components
// Load before any component that needs these helpers.

window.ComponentUtils = (function() {

  /**
   * Escape HTML special characters including quotes.
   */
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Generate a unique ID with a component prefix.
   * @param {string} prefix - e.g. 'dt', 'es', 'api'
   * @param {string} [name] - optional slug source
   */
  function generateId(prefix, name) {
    var slug = name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : '';
    var rand = Math.random().toString(36).substr(2, 6);
    return prefix + '-' + (slug ? slug + '-' : '') + rand;
  }

  /**
   * Dark container wrapper used by most components.
   * rounded-xl, bg-gray-900, border, shadow.
   */
  function darkContainer(content, attrs) {
    var extra = attrs || '';
    return '<div class="rounded-xl overflow-hidden border border-gray-700/60 bg-gray-900 my-5 shadow-md"' + extra + '>' +
      content +
    '</div>';
  }

  /**
   * Standard header bar for dark components.
   * @param {string} title
   * @param {string} [rightHtml] - optional right-side content
   */
  function headerBar(title, rightHtml) {
    return '<div class="bg-gray-800/80 px-4 py-3 border-b border-gray-700/60 flex items-center justify-between">' +
      '<span class="font-bold text-gray-100 text-base">' + escapeHtml(title) + '</span>' +
      (rightHtml || '') +
    '</div>';
  }

  /**
   * Type/value badge (monospace, dark gray).
   */
  function typeBadge(text) {
    if (!text) return '';
    return '<span class="inline-block bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded-md font-mono">' +
      escapeHtml(text) + '</span>';
  }

  /**
   * Required badge (rose).
   */
  function requiredBadge() {
    return '<span class="inline-block bg-rose-500/20 text-rose-300 text-xs px-2 py-0.5 rounded-md font-medium">required</span>';
  }

  /**
   * Chevron for expand/collapse.
   * @param {string} className - unique chevron class for this component (e.g. 'es-chevron')
   * @param {boolean} [startOpen] - if true, starts rotated
   */
  function chevron(className, startOpen) {
    return '<span class="' + className + ' text-gray-500 text-xs transition-transform duration-200' +
      (startOpen ? ' rotate-90' : '') + '">&#9654;</span>';
  }

  /**
   * Empty spacer matching chevron width (for rows without expand).
   */
  function chevronSpacer() {
    return '<span class="w-2 inline-block"></span>';
  }

  /**
   * Inline onclick for toggling a hidden panel + rotating a chevron.
   * @param {string} panelId - ID of the element to toggle
   * @param {string} chevronClass - class of the chevron span
   */
  function toggleAttr(panelId, chevronClass) {
    return ' onclick="var el=document.getElementById(\'' + panelId + '\');el.classList.toggle(\'hidden\');this.querySelector(\'.' + chevronClass + '\').classList.toggle(\'rotate-90\')" style="cursor:pointer"';
  }

  /**
   * Section divider header (e.g. "Properties", "Config Example").
   */
  function sectionLabel(text) {
    return '<span class="text-gray-500 text-xs font-semibold uppercase tracking-wider">' + escapeHtml(text) + '</span>';
  }

  return {
    escapeHtml: escapeHtml,
    generateId: generateId,
    darkContainer: darkContainer,
    headerBar: headerBar,
    typeBadge: typeBadge,
    requiredBadge: requiredBadge,
    chevron: chevron,
    chevronSpacer: chevronSpacer,
    toggleAttr: toggleAttr,
    sectionLabel: sectionLabel
  };
})();
