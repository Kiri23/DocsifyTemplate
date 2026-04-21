// Demo store for the signals POC.
// Shared reactive state read/written by components mounted in separate code fences.
// See docs/content/examples/signals-poc.md and issue #15.

import { signal, computed } from '@preact/signals';

export const nodes = [
  { id: 'n1', title: 'Engineering DNA', type: 'general', importance: 0.9,
    summary: 'Separate engine from transport = keeping the DAG clean.' },
  { id: 'n2', title: 'DAG + credit assignment', type: 'general', importance: 0.85,
    summary: 'Forward DAG + reverse traversal. Backprop, build systems, workflows.' },
  { id: 'n3', title: 'Fractal DAG', type: 'general', importance: 0.85,
    summary: 'Same DAG pattern at every zoom level, from one line to full SaaS.' },
  { id: 'n4', title: 'Structure-first', type: 'general', importance: 0.9,
    summary: 'Graphs as the product, apps as views over the same structure.' },
  { id: 'n5', title: 'DocsifyTemplate drift detection', type: 'task', importance: 0.9,
    summary: 'Backprop pattern for detecting stale docs via reverse traversal.' },
];

export const selectedId = signal(null);

export const selectedNode = computed(
  () => nodes.find((n) => n.id === selectedId.value) ?? null
);
