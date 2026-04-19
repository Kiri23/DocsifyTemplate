// Astro Adapter — Rehype plugin for YAML code fence components.
// Walks the HTML AST after markdown → HTML conversion.
//
// Usage in astro.config.mjs:
//   import { rehypeComponents } from '...adapters/astro/rehype-components.js';
//   import { defaultComponents } from '...components/index.js';
//   export default defineConfig({
//     markdown: { rehypePlugins: [[rehypeComponents, { components: defaultComponents }]] }
//   });

import { visit } from 'unist-util-visit';
import { h } from 'preact';
import renderToString from 'preact-render-to-string';
import yaml from 'js-yaml';
import { toCamelCase } from '../../core/markdown-utils.js';

export function rehypeComponents(options = {}) {
  const { components = {} } = options;
  const langs = new Set(Object.keys(components));

  return async (tree) => {
    const replacements = [];

    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'pre' || !parent) return;

      const codeNode = node.children?.find(
        child => child.tagName === 'code' && child.properties?.className
      );
      if (!codeNode) return;

      const classes = Array.isArray(codeNode.properties.className)
        ? codeNode.properties.className
        : [codeNode.properties.className];

      const matchedLang = [...langs].find(name =>
        classes.some(cls => cls === `language-${name}`)
      );
      if (!matchedLang) return;

      const Component = components[matchedLang];
      if (!Component) return;

      const rawYaml = codeNode.children
        .filter(child => child.type === 'text')
        .map(child => child.value)
        .join('');

      try {
        const data = yaml.load(rawYaml);
        const htmlString = renderToString(h(Component, { data }));
        replacements.push({ parent, index, html: htmlString });
      } catch (e) {
        console.error(`[astro-rehype] Error rendering ${matchedLang}:`, e.message);
      }
    });

    for (let i = replacements.length - 1; i >= 0; i--) {
      const { parent, index, html } = replacements[i];
      parent.children[index] = { type: 'raw', value: html };
    }
  };
}
