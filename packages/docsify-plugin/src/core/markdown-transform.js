// AST-based markdown transformer.
// Pure functions. No window, no document, no framework dependency.
//
// One function, multiple uses:
//   Docsify render: transformMarkdown(md, { parseYaml, renderComponent })
//   Export PDF:     transformMarkdown(md, { parseYaml, renderComponent, mermaid, image, hr })
//   Both call the same pipeline — extras are optional.

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';
import { COMPONENT_REGISTRY, toCamelCase } from './markdown-utils.js';

const registrySet = new Set(COMPONENT_REGISTRY);
const processor = unified().use(remarkParse);

// parseYaml: (string) => object
// renderComponent: (componentName: string, data: object, lang: string) => string|null
// mermaid: (index: number) => string|null                  — optional
// image: (src: string, alt: string, index: number) => string|null — optional
// hr: () => string|null                                    — optional
export function transformMarkdown(markdown, { parseYaml, renderComponent, mermaid, image, hr }) {
  const tree = processor.parse(markdown);
  const replacements = [];
  let mermaidCounter = 0;
  let imageCounter = 0;

  visit(tree, (node) => {
    if (!node.position) return;

    // Component fences
    if (node.type === 'code' && node.lang && registrySet.has(node.lang)) {
      try {
        const data = parseYaml(node.value);
        const fnName = toCamelCase(node.lang);
        const result = renderComponent(fnName, data, node.lang);
        if (result != null) {
          replacements.push({ start: node.position.start.offset, end: node.position.end.offset, replacement: result });
        }
      } catch (e) {
        console.error('[markdown-transform] Error processing', node.lang, e);
      }
    }

    // Mermaid fences
    if (node.type === 'code' && node.lang === 'mermaid' && mermaid) {
      const result = mermaid(mermaidCounter++);
      if (result != null) {
        replacements.push({ start: node.position.start.offset, end: node.position.end.offset, replacement: result });
      }
    }

    // Images
    if (node.type === 'image' && image) {
      const result = image(node.url || '', node.alt || '', imageCounter++);
      if (result != null) {
        replacements.push({ start: node.position.start.offset, end: node.position.end.offset, replacement: result });
      }
    }

    // Thematic breaks (HR)
    if (node.type === 'thematicBreak' && hr) {
      const result = hr();
      if (result != null) {
        replacements.push({ start: node.position.start.offset, end: node.position.end.offset, replacement: result });
      }
    }
  });

  replacements.sort((a, b) => b.start - a.start);
  let result = markdown;
  for (const r of replacements) {
    result = result.slice(0, r.start) + r.replacement + result.slice(r.end);
  }

  return result;
}
