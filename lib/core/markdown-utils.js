// Markdown utilities.
// Pure functions. No window, no document, no framework dependency.

const FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)\n---/;

export const COMPONENT_REGISTRY = [
  'entity-schema', 'api-endpoint', 'status-flow', 'directive-table',
  'step-type', 'config-example', 'card-grid', 'side-by-side', 'file-tree',
  'node-list', 'node-panel', 'backlinks-panel', 'backlinks-echo'
];

// --- Frontmatter ---

export function hasFrontmatter(markdown) {
  return FRONTMATTER_REGEX.test(markdown);
}

export function extractFrontmatter(markdown) {
  const match = markdown.match(FRONTMATTER_REGEX);
  if (!match) return null;

  const metadata = {};
  match[1].split('\n').forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) return;
    const key = line.substring(0, colonIndex).trim();
    let value = line.substring(colonIndex + 1).trim();
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, -1).split(',').map(v => v.trim());
    }
    metadata[key] = value;
  });

  return metadata;
}

export function stripFrontmatter(markdown) {
  return markdown.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
}

// --- String utilities ---

export function toCamelCase(name) {
  return name.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
}
