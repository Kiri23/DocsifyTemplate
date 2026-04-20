// Custom Elements adapter.
// Uses preact-custom-element's register() for full lifecycle management.
// withJsonProps bridges the HTML string attribute → parsed object for components.

import register from 'preact-custom-element';
import { h } from 'preact';

function withJsonProps(Component) {
  return function WrappedComponent({ 'data-props': raw, ...rest }) {
    const data = raw ? JSON.parse(raw) : {};
    return h(Component, { data, ...rest });
  };
}

export function defineCustomElements(components) {
  for (const [tag, Component] of Object.entries(components)) {
    if (!tag.includes('-')) continue;
    if (customElements.get(tag)) continue;
    register(withJsonProps(Component), tag, ['data-props'], { shadow: false });
  }
}

export function renderCustomElement(tag, data) {
  const json = JSON.stringify(data).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  return `<${tag} data-props="${json}"></${tag}>`;
}
