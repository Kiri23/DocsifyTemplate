// Shared utilities for Docsify components
// ES module with named exports. Components import what they need.

export function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function generateId(prefix, name) {
  var slug = name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : '';
  var rand = Math.random().toString(36).substr(2, 6);
  return prefix + '-' + (slug ? slug + '-' : '') + rand;
}

export function darkContainer(content, attrs) {
  var extra = attrs || '';
  return '<div class="rounded-xl overflow-hidden border border-gray-700/60 bg-gray-900 my-5 shadow-md"' + extra + '>' +
    content +
  '</div>';
}

export function headerBar(title, rightHtml) {
  return '<div class="bg-gray-800/80 px-4 py-3 border-b border-gray-700/60 flex items-center justify-between">' +
    '<span class="font-bold text-gray-100 text-base">' + escapeHtml(title) + '</span>' +
    (rightHtml || '') +
  '</div>';
}

export function typeBadge(text) {
  if (!text) return '';
  return '<span class="inline-block bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded-md font-mono">' +
    escapeHtml(text) + '</span>';
}

export function requiredBadge() {
  return '<span class="inline-block bg-rose-500/20 text-rose-300 text-xs px-2 py-0.5 rounded-md font-medium">required</span>';
}

export function chevron(className, startOpen) {
  return '<span class="' + className + ' text-gray-500 text-xs transition-transform duration-200' +
    (startOpen ? ' rotate-90' : '') + '">&#9654;</span>';
}

export function chevronSpacer() {
  return '<span class="w-2 inline-block"></span>';
}

export function toggleAttr(panelId, chevronClass) {
  return ' onclick="var el=document.getElementById(\'' + panelId + '\');el.classList.toggle(\'hidden\');this.querySelector(\'.' + chevronClass + '\').classList.toggle(\'rotate-90\')" style="cursor:pointer"';
}

export function sectionLabel(text) {
  return '<span class="text-gray-500 text-xs font-semibold uppercase tracking-wider">' + escapeHtml(text) + '</span>';
}
