// Backlinks echo — demo companion to backlinks-panel.
// Reads currentDoc + incomingLinks + backlinksIndex from the same store.
// Proves two components can derive from the same signals without knowing
// about each other — the reactive DAG emerges from imports.

import { html } from 'htm/preact';
import {
  backlinksIndex,
  currentDoc,
  incomingLinks,
} from '../state/backlinks-store.js';

const BacklinksEcho = () => {
  const here = currentDoc.value;
  const count = incomingLinks.value.length;
  const total = Object.keys(backlinksIndex.value).length;

  return html`
    <div class="bg-tech-surface rounded-xl p-4 border border-border">
      <div class="flex items-center gap-2 mb-3">
        <span class="inline-flex w-2 h-2 rounded-full bg-tech-accent"></span>
        <h4 class="text-sm font-bold text-tech-heading m-0" style="border: none;">Reactive echo</h4>
      </div>
      <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm m-0">
        <dt class="text-tech-subheading">currentDoc</dt>
        <dd class="font-mono text-tech-text m-0 break-all">${here}</dd>
        <dt class="text-tech-subheading">incomingLinks</dt>
        <dd class="font-mono text-tech-text m-0">${count} page${count === 1 ? '' : 's'}</dd>
        <dt class="text-tech-subheading">docs indexed</dt>
        <dd class="font-mono text-tech-text m-0">${total}</dd>
      </dl>
      <p class="text-xs text-tech-text mt-3 mb-0 opacity-70">
        Navigate to another page — this box updates without re-mounting the panel above.
      </p>
    </div>
  `;
};

export { BacklinksEcho };
