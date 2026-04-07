// React/Gatsby/Next.js adapter — renders any DocsifyTemplate component as static HTML.
// Usage: <DocsComponent component="EntitySchema" data={{ name: 'User', fields: [...] }} />

import { h } from 'preact';
import { renderToString } from 'preact-render-to-string';
import { components } from '../../core/registry.js';

export default function DocsComponent({ component, data }) {
  const Component = components[component];
  if (!Component) return <div>Component not found: {component}</div>;
  const html = renderToString(h(Component, { data }));
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
