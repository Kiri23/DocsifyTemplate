// Backlinks store — signals graph for cross-doc "mentioned by" panel.
// See issue #12 and docs/content/examples/backlinks-demo.md.
//
// DAG (matches dag-signals diagram):
//
//   backlinksIndex  (signal — loaded once)   ┐
//   currentDoc      (signal — route-driven)  ├─> incomingLinks (computed)
//   hoveredDoc      (signal — hover-driven)  ┘
//                                             ─> highlightTarget (computed)

import { signal, computed } from '@preact/signals';
import { buildBacklinksIndex } from '../scan/backlinks.js';

export const backlinksIndex = signal({});
export const currentDoc = signal(routeFromHash(location.hash));
export const hoveredDoc = signal(null);

export const incomingLinks = computed(
  () => backlinksIndex.value[currentDoc.value] ?? []
);

export const highlightTarget = computed(
  () => hoveredDoc.value ?? currentDoc.value
);

// Named actions — prefer these over raw .value = x so greps stay meaningful.
export function setHovered(path) { hoveredDoc.value = path; }
export function clearHovered() { hoveredDoc.value = null; }

function routeFromHash(hash) {
  // Docsify uses `#/content/foo` → we want `/content/foo`.
  if (!hash || hash === '#' || hash === '#/') return '/';
  return hash.replace(/^#/, '').split('?')[0];
}

let booted = false;
export function bootBacklinksStore() {
  if (booted) return;
  booted = true;

  buildBacklinksIndex().then((idx) => { backlinksIndex.value = idx; });

  window.addEventListener('hashchange', () => {
    currentDoc.value = routeFromHash(location.hash);
  });
}
