// Entity Schema — Preact + HTM version
// Demonstrates: composition, state (expand/collapse), importing shared components.
// No IIFE, no Babel, no JSX — just ES modules + tagged templates.

import { html } from 'htm/preact';
import { useState } from 'preact/hooks';
import { DarkContainer, HeaderBar, TypeBadge, RequiredBadge, Chevron } from './shared.js';

// --- Internal component (not exported to registry) ---

const FieldRow = ({ field }) => {
  const [open, setOpen] = useState(false);
  const hasDetail = field.description || (field.values && field.values.length > 0);

  return html`
    <div class="border-b border-gray-700/50 last:border-b-0">
      <div
        class="flex items-center gap-2 px-4 py-2.5 ${hasDetail ? 'cursor-pointer hover:bg-gray-800/40' : ''}"
        onClick=${() => hasDetail && setOpen(!open)}
      >
        ${hasDetail
          ? html`<${Chevron} open=${open} />`
          : html`<span class="w-2 inline-block" />`
        }
        <span class="text-gray-200 font-mono text-sm">${field.name}</span>
        <${TypeBadge} type=${field.type} />
        ${field.required && html`<${RequiredBadge} />`}
      </div>
      ${open && hasDetail && html`
        <div class="px-4 pb-3 pl-8 text-gray-400 text-sm space-y-1">
          ${field.description && html`<p class="m-0">${field.description}</p>`}
          ${field.values && field.values.length > 0 && html`
            <div class="flex flex-wrap gap-1">
              ${field.values.map((v, i) => html`
                <span key=${i} class="bg-gray-800 text-gray-300 text-xs px-2 py-0.5 rounded font-mono">
                  ${String(v)}
                </span>
              `)}
            </div>
          `}
        </div>
      `}
    </div>
  `;
};

// --- Main component ---

const EntitySchema = ({ data }) => {
  const name = data.name || 'Entity';
  const fields = data.fields || [];

  return html`
    <${DarkContainer}>
      <${HeaderBar} title=${name}>
        ${data.parent && html`
          <span class="text-gray-400 text-xs font-mono">extends ${data.parent}</span>
        `}
      <//>
      <div>
        ${fields.map((field, i) => html`
          <${FieldRow} key=${field.name || i} field=${field} />
        `)}
      </div>
    <//>
  `;
};

export { EntitySchema };
