// YAML Components — unified plugin + convenience wrapper.
//
// The plugin (yamlComponents) is the real product:
//   finds named code fences with YAML content, calls the registered transform.
//   Output is whatever the transform returns — HTML, LaTeX, Typst, anything.
//
// transformMarkdown is a convenience wrapper for callers that work with
// markdown strings instead of unified pipelines directly.

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';
import { toCamelCase } from './markdown-utils.js';

// ─── The unified plugin ───────────────────────────────────────────────────────
//
// options.parseYaml   (string) => object
// options.transforms  { [fenceName]: (data, node) => string | null }
//
// Usage with Preact/HTML:
//   .use(yamlComponents, { parseYaml, transforms: { 'entity-schema': (data) => renderer.createPlaceholder('EntitySchema', data) } })
//
// Usage with LaTeX:
//   .use(yamlComponents, { parseYaml, transforms: latexRenderers })
//
// Usage with Typst:
//   .use(yamlComponents, { parseYaml, transforms: typstRenderers })

export function yamlComponents(options = {}) {
  const { parseYaml, transforms = {} } = options;

  return function transformer(tree) {
    const replacements = [];

    visit(tree, 'code', (node, index, parent) => {
      if (!node.lang || !transforms[node.lang] || !parent) return;

      try {
        const data = parseYaml(node.value);
        const result = transforms[node.lang](data, node);
        if (result != null) {
          replacements.push({ index, parent, result });
        }
      } catch(e) {
        console.error('[yaml-components] Error processing fence:', node.lang, e);
      }
    });

    // Apply in reverse so earlier indices stay valid
    for (const { index, parent, result } of replacements.reverse()) {
      parent.children.splice(index, 1, { type: 'html', value: result });
    }
  };
}

// ─── Convenience wrapper ──────────────────────────────────────────────────────
// For callers that pass markdown strings and need the result as a string.
// Handles the mermaid/image/hr extras that are specific to the export pipeline.

export function transformMarkdown(markdown, { parseYaml, renderComponent, transforms, mermaid, image, hr }) {
  // Build transforms map — accept either explicit transforms or legacy renderComponent
  const resolvedTransforms = transforms || buildTransformsFromRenderer(renderComponent, parseYaml);

  // String-offset approach for mermaid/image/hr extras (these aren't code fences)
  if (mermaid || image || hr) {
    return transformWithExtras(markdown, { parseYaml, resolvedTransforms, mermaid, image, hr });
  }

  // Pure AST path — use the plugin
  const processor = unified().use(remarkParse).use(yamlComponents, { parseYaml, transforms: resolvedTransforms });
  const tree = processor.parse(markdown);
  processor.runSync(tree);

  // Serialize back to markdown string (Docsify converts this to HTML itself)
  return serializeToMarkdown(tree, markdown);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Adapts legacy renderComponent(fnName, data, lang) → transforms map shape
function buildTransformsFromRenderer(renderComponent) {
  if (!renderComponent) return {};
  return new Proxy({}, {
    get(_, lang) {
      return (data) => renderComponent(toCamelCase(lang), data, lang);
    },
    has() { return true; }
  });
}

// Serialize AST back to markdown string by rebuilding from positions
// (unified doesn't ship remark-stringify in the browser CDN setup — we use position offsets)
function serializeToMarkdown(tree, original) {
  const replacements = [];

  visit(tree, 'html', (node) => {
    if (node.position) {
      replacements.push({
        start: node.position.start.offset,
        end: node.position.end.offset,
        value: node.value
      });
    }
  });

  if (!replacements.length) return original;

  replacements.sort((a, b) => b.start - a.start);
  let result = original;
  for (const r of replacements) {
    result = result.slice(0, r.start) + r.value + result.slice(r.end);
  }
  return result;
}

// Legacy path for export pipeline (mermaid/image/hr operate on string offsets)
function transformWithExtras(markdown, { parseYaml, resolvedTransforms, mermaid, image, hr }) {
  const processor = unified().use(remarkParse);
  const tree = processor.parse(markdown);
  const replacements = [];
  let mermaidCounter = 0;
  let imageCounter = 0;

  visit(tree, (node) => {
    if (!node.position) return;

    if (node.type === 'code' && node.lang && resolvedTransforms[node.lang]) {
      try {
        const data = parseYaml(node.value);
        const result = resolvedTransforms[node.lang](data, node);
        if (result != null) {
          replacements.push({ start: node.position.start.offset, end: node.position.end.offset, replacement: result });
        }
      } catch(e) {
        console.error('[yaml-components] Error processing fence:', node.lang, e);
      }
    }

    if (node.type === 'code' && node.lang === 'mermaid' && mermaid) {
      const result = mermaid(mermaidCounter++);
      if (result != null) replacements.push({ start: node.position.start.offset, end: node.position.end.offset, replacement: result });
    }

    if (node.type === 'image' && image) {
      const result = image(node.url || '', node.alt || '', imageCounter++);
      if (result != null) replacements.push({ start: node.position.start.offset, end: node.position.end.offset, replacement: result });
    }

    if (node.type === 'thematicBreak' && hr) {
      const result = hr();
      if (result != null) replacements.push({ start: node.position.start.offset, end: node.position.end.offset, replacement: result });
    }
  });

  replacements.sort((a, b) => b.start - a.start);
  let result = markdown;
  for (const r of replacements) {
    result = result.slice(0, r.start) + r.replacement + result.slice(r.end);
  }
  return result;
}
