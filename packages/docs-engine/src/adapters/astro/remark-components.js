// Astro Adapter — Remark plugin for YAML code fence components.
// Runs on the markdown AST BEFORE Shiki syntax highlighting.
//
// Usage in astro.config.mjs:
//   import { remarkComponents } from '...adapters/astro/remark-components.js';
//   import { defaultComponents } from '...components/index.js';
//   export default defineConfig({
//     markdown: { remarkPlugins: [[remarkComponents, { components: defaultComponents }]] }
//   });

import { visit } from 'unist-util-visit';
import { h } from 'preact';
import renderToString from 'preact-render-to-string';
import yaml from 'js-yaml';
import { toCamelCase } from '../../core/markdown-utils.js';

export function remarkComponents(options = {}) {
  const { components = {} } = options;
  const langs = new Set(Object.keys(components));

  return async (tree) => {
    const replacements = [];

    visit(tree, 'code', (node, index, parent) => {
      if (!node.lang || !langs.has(node.lang) || !parent) return;

      const Component = components[node.lang];
      if (!Component) return;

      try {
        const data = yaml.load(node.value);
        const htmlString = renderToString(h(Component, { data }));
        replacements.push({ parent, index, html: htmlString, position: node.position });
      } catch (e) {
        console.error(`[astro-remark] Error rendering ${node.lang}:`, e.message);
      }
    });

    for (let i = replacements.length - 1; i >= 0; i--) {
      const { parent, index, html, position } = replacements[i];
      parent.children[index] = { type: 'html', value: html, position };
    }
  };
}
