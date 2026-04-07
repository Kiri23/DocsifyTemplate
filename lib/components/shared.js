// Shared Preact Components
// Building blocks that other components import.
// Uses HTM tagged templates instead of JSX — no transpiler needed.

import { html } from 'htm/preact';
import { useState } from 'preact/hooks';

// --- Layout ---

export const DarkContainer = ({ children, className }) => html`
  <div class="rounded-xl overflow-hidden border border-gray-700/60 bg-gray-900 my-5 shadow-md ${className || ''}">
    ${children}
  </div>
`;

export const HeaderBar = ({ title, children }) => html`
  <div class="bg-gray-800/80 px-4 py-3 border-b border-gray-700/60 flex items-center justify-between">
    <span class="font-bold text-gray-100 text-base">${title}</span>
    ${children}
  </div>
`;

// --- Badges ---

export const TypeBadge = ({ type }) => {
  if (!type) return null;
  return html`
    <span class="inline-block bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded-md font-mono">
      ${type}
    </span>
  `;
};

export const RequiredBadge = () => html`
  <span class="inline-block bg-rose-500/20 text-rose-300 text-xs px-2 py-0.5 rounded-md font-medium">
    required
  </span>
`;

// --- Interactive ---

export const Chevron = ({ open, className }) => html`
  <span class="text-gray-500 text-xs transition-transform duration-200 inline-block ${open ? 'rotate-90' : ''} ${className || ''}">
    ▶
  </span>
`;

export const SectionLabel = ({ text }) => html`
  <span class="text-gray-500 text-xs font-semibold uppercase tracking-wider">
    ${text}
  </span>
`;

// All exported via `export const` above — index.js imports and registers them.
