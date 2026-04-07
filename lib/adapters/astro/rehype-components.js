// Astro Adapter — Rehype plugin
// Walks the HTML AST, finds YAML code fences, renders components to static HTML.
// Uses the same core/engine.js as the Docsify adapter.
//
// Usage in astro.config.mjs:
//   import { rehypeComponents } from './lib/adapters/astro/rehype-components.js';
//   export default defineConfig({
//     markdown: { rehypePlugins: [rehypeComponents] }
//   });

import { visit } from 'unist-util-visit';
import { h } from 'preact';
import renderToString from 'preact-render-to-string';
import yaml from 'js-yaml';
import { COMPONENT_REGISTRY, toCamelCase } from '../../core/engine.js';

// Load components once, cache the registry
let componentsCache = null;
async function loadComponents() {
  if (componentsCache) return componentsCache;

  // Set up global for components to register on (Node has no window)
  if (typeof globalThis.PreactComponents === 'undefined') {
    globalThis.PreactComponents = {};
  }

  await import('../../components/shared.js');
  await Promise.all([
    import('../../components/entity-schema.js'),
    import('../../components/card-grid.js'),
    import('../../components/api-endpoint.js'),
    import('../../components/status-flow.js'),
    import('../../components/config-example.js'),
    import('../../components/step-type.js'),
    import('../../components/directive-table.js'),
    import('../../components/side-by-side.js'),
    import('../../components/file-tree.js'),
  ]);

  componentsCache = globalThis.PreactComponents;
  return componentsCache;
}

export function rehypeComponents() {
  return async (tree) => {
    const components = await loadComponents();
    const replacements = [];

    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'pre' || !parent) return;

      const codeNode = node.children && node.children.find(
        child => child.tagName === 'code' && child.properties && child.properties.className
      );
      if (!codeNode) return;

      const classes = Array.isArray(codeNode.properties.className)
        ? codeNode.properties.className
        : [codeNode.properties.className];

      let matchedName = null;
      for (const name of COMPONENT_REGISTRY) {
        if (classes.some(cls => cls === `language-${name}`)) {
          matchedName = name;
          break;
        }
      }
      if (!matchedName) return;

      const rawYaml = codeNode.children
        .filter(child => child.type === 'text')
        .map(child => child.value)
        .join('');

      const fnName = toCamelCase(matchedName);
      const Component = components[fnName];
      if (!Component) return;

      try {
        const data = yaml.load(rawYaml);
        const htmlString = renderToString(h(Component, { data }));
        replacements.push({ parent, index, html: htmlString });
      } catch (e) {
        console.error(`[astro-adapter] Error rendering ${matchedName}:`, e.message);
      }
    });

    // Apply replacements in reverse (preserve indices)
    for (let i = replacements.length - 1; i >= 0; i--) {
      const { parent, index, html } = replacements[i];
      parent.children[index] = { type: 'raw', value: html };
    }
  };
}
