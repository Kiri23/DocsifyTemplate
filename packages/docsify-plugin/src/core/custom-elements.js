// Custom Elements adapter.
// Mounts Preact components via browser-native connectedCallback.
// No Docsify coupling — works in any HTML context.

import { h, render } from 'preact';

export function defineCustomElements(components) {
  for (const [tag, Component] of Object.entries(components)) {
    if (!tag.includes('-')) continue; // Custom Element names must contain a hyphen
    if (customElements.get(tag)) continue;

    customElements.define(tag, class extends HTMLElement {
      connectedCallback() {
        const raw = this.getAttribute('data-props');
        try {
          const data = raw ? JSON.parse(raw) : {};
          render(h(Component, { data }), this);
        } catch (e) {
          console.error(`[custom-elements] <${tag}>:`, e);
          this.innerHTML = `<div style="color:#f87171;padding:1rem;border:1px solid #f87171;border-radius:.5rem">
            <strong>${tag}</strong>: ${e.message}</div>`;
        }
      }

      disconnectedCallback() {
        render(null, this);
      }
    });
  }
}

export function renderCustomElement(tag, data) {
  const json = JSON.stringify(data).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  return `<${tag} data-props="${json}"></${tag}>`;
}
