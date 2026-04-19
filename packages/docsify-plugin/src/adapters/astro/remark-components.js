// Astro Adapter — Remark plugin for rendering YAML code fence components
//
// Runs on the markdown AST BEFORE Shiki syntax highlighting.
// Finds code blocks with registered component languages, parses YAML,
// renders via preact-render-to-string, and replaces with raw HTML.
//
// Usage in astro.config.mjs:
//   import { remarkComponents } from '../DocsifyTemplate/lib/adapters/astro/remark-components.js';
//   export default defineConfig({
//     markdown: { remarkPlugins: [remarkComponents] }
//   });

import { visit } from 'unist-util-visit';
import { h } from 'preact';
import renderToString from 'preact-render-to-string';
import yaml from 'js-yaml';
import { COMPONENT_REGISTRY, toCamelCase } from '../../core/markdown-utils.js';
import { getComponent } from '../../core/registry.js';

// Load component modules once — they register on the shared `components` object
let loaded = false;
async function ensureComponents() {
  if (loaded) return;
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
  loaded = true;
}

export function remarkComponents() {
  return async (tree) => {
    await ensureComponents();
    const replacements = [];

    visit(tree, 'code', (node, index, parent) => {
      if (!node.lang || !COMPONENT_REGISTRY.includes(node.lang)) return;

      const fnName = toCamelCase(node.lang);
      const Component = getComponent(fnName);
      if (!Component) {
        console.warn(`[astro-adapter] Component not found: ${fnName}`);
        return;
      }

      try {
        const data = yaml.load(node.value);
        const htmlString = renderToString(h(Component, { data }));
        replacements.push({ parent, index, html: htmlString });
      } catch (e) {
        console.error(`[astro-adapter] Error rendering ${node.lang}:`, e.message);
      }
    });

    for (let i = replacements.length - 1; i >= 0; i--) {
      const { parent, index, html } = replacements[i];
      parent.children[index] = { type: 'html', value: html };
    }
  };
}
