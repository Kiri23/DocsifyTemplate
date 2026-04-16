// Backlinks panel — reads the reverse index for the current docsify route.
// Auto-updates on hashchange via currentDoc signal. See issue #12.

import { html } from 'htm/preact';
import {
  backlinksIndex,
  currentDoc,
  incomingLinks,
  bootBacklinksStore,
  setHovered,
  clearHovered,
} from '../state/backlinks-store.js';

const BacklinksPanel = () => {
  bootBacklinksStore();

  const links = incomingLinks.value;
  const indexLoaded = Object.keys(backlinksIndex.value).length > 0;
  const here = currentDoc.value;

  if (!indexLoaded) {
    return html`
      <div class="bg-surface-raised rounded-xl p-4 border border-dashed border-border">
        <div class="flex items-center gap-2 mb-2">
          <span class="inline-flex w-2 h-2 rounded-full bg-text-muted"></span>
          <h4 class="text-sm font-bold text-text-secondary m-0" style="border: none;">Backlinks</h4>
        </div>
        <p class="text-sm text-text-tertiary m-0">Scanning docs…</p>
      </div>
    `;
  }

  if (links.length === 0) {
    return html`
      <div class="bg-surface-raised rounded-xl p-4 border border-border">
        <div class="flex items-center gap-2 mb-2">
          <span class="inline-flex w-2 h-2 rounded-full bg-primary"></span>
          <h4 class="text-sm font-bold text-text-secondary m-0" style="border: none;">Mentioned by</h4>
        </div>
        <p class="text-sm text-text-tertiary m-0">
          No other page links to <code>${here}</code>.
        </p>
      </div>
    `;
  }

  return html`
    <div class="bg-surface-raised rounded-xl p-4 border border-primary/40">
      <div class="flex items-center gap-2 mb-3">
        <span class="inline-flex w-2 h-2 rounded-full bg-primary"></span>
        <h4 class="text-sm font-bold text-text-secondary m-0" style="border: none;">
          Mentioned by ${links.length} page${links.length === 1 ? '' : 's'}
        </h4>
      </div>
      <ul class="flex flex-col gap-1 m-0 p-0" style="list-style: none;">
        ${links.map((path) => html`
          <li key=${path} style="margin: 0;">
            <a
              href=${`#${path}`}
              onMouseEnter=${() => setHovered(path)}
              onMouseLeave=${clearHovered}
              class="block px-3 py-2 rounded-md bg-surface hover:bg-primary-light hover:text-primary-text text-text-primary transition-colors no-underline font-mono text-xs"
              style="border: 1px solid transparent;"
            >${path}</a>
          </li>
        `)}
      </ul>
    </div>
  `;
};

export { BacklinksPanel };
