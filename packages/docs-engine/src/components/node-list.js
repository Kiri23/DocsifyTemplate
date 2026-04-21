// Node List — signals POC (fence 1).
// Reads the static `nodes` array, writes `selectedId` on click.
// See state/demo-store.js and issue #15.

import { html } from 'htm/preact';
import { nodes, selectedId } from '../state/demo-store.js';

const NodeList = () => html`
  <div class="bg-surface-raised rounded-xl p-4 border border-border">
    <div class="flex items-center gap-2 mb-3">
      <span class="inline-flex w-2 h-2 rounded-full bg-primary"></span>
      <h4 class="text-sm font-bold text-text-secondary m-0" style="border: none;">
        Fence 1 — Node list
      </h4>
    </div>
    <ul class="flex flex-col gap-1 m-0 p-0" style="list-style: none;">
      ${nodes.map((node) => {
        const isActive = selectedId.value === node.id;
        return html`
          <li key=${node.id} style="margin: 0;">
            <button
              type="button"
              onClick=${() => (selectedId.value = node.id)}
              class=${`w-full text-left px-3 py-2 rounded-md transition-colors border ${
                isActive
                  ? 'bg-primary-light text-primary-text font-semibold border-primary/30'
                  : 'bg-surface hover:bg-surface-sunken text-text-primary border-transparent'
              }`}
              style="cursor: pointer;"
            >
              <span class="text-xs text-text-tertiary font-mono mr-2">${node.id}</span>
              ${node.title}
            </button>
          </li>
        `;
      })}
    </ul>
  </div>
`;

export { NodeList };
