// Node Panel — signals POC (fence 2).
// Reads `selectedNode` (a computed signal). Auto-updates when fence 1 writes.
// See state/demo-store.js and issue #15.

import { html } from 'htm/preact';
import { selectedNode } from '../state/demo-store.js';

const NodePanel = () => {
  const node = selectedNode.value;

  if (!node) {
    return html`
      <div class="bg-surface-raised rounded-xl p-6 border border-dashed border-border-strong text-center">
        <div class="flex items-center justify-center gap-2 mb-2">
          <span class="inline-flex w-2 h-2 rounded-full bg-text-muted"></span>
          <h4 class="text-sm font-bold text-text-secondary m-0" style="border: none;">
            Fence 2 — Node panel
          </h4>
        </div>
        <p class="text-sm text-text-tertiary m-0">
          Select a node in fence 1 to populate this panel.
        </p>
      </div>
    `;
  }

  return html`
    <div class="bg-surface-raised rounded-xl p-4 border border-primary/40">
      <div class="flex items-center gap-2 mb-3">
        <span class="inline-flex w-2 h-2 rounded-full bg-primary"></span>
        <h4 class="text-sm font-bold text-text-secondary m-0" style="border: none;">
          Fence 2 — Node panel
        </h4>
      </div>
      <h3 class="text-lg font-bold text-text-primary mb-2" style="border: none; margin-top: 0;">
        ${node.title}
      </h3>
      <p class="text-sm text-text-secondary mb-3" style="margin-top: 0;">
        ${node.summary}
      </p>
      <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm m-0">
        <dt class="text-text-tertiary">ID</dt>
        <dd class="font-mono text-text-primary m-0">${node.id}</dd>
        <dt class="text-text-tertiary">Type</dt>
        <dd class="text-text-primary m-0">${node.type}</dd>
        <dt class="text-text-tertiary">Importance</dt>
        <dd class="text-text-primary m-0">${node.importance}</dd>
      </dl>
    </div>
  `;
};

export { NodePanel };
