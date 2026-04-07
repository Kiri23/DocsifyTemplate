// Component Renderer Engine
// Pure functions. No window, no document, no framework dependency.
// Adapters import what they need and wire it to their framework.

const FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)\n---/;

export const COMPONENT_REGISTRY = [
  'entity-schema', 'api-endpoint', 'status-flow', 'directive-table',
  'step-type', 'config-example', 'card-grid', 'side-by-side', 'file-tree'
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

// --- Section extraction ---

export function extractSections(markdown) {
  const content = stripFrontmatter(markdown);
  const sections = { quickStart: content, technical: content };

  const quickStartMatch = content.match(/##\s*Quick Start([\s\S]*?)(?=##\s*Technical Reference|$)/i);
  const technicalMatch = content.match(/##\s*Technical Reference([\s\S]*?)$/i);
  const titleMatch = content.match(/^#\s+(.+?)$/m);
  const title = titleMatch ? titleMatch[0] : '';

  if (quickStartMatch) sections.quickStart = title + '\n\n' + quickStartMatch[0];
  if (technicalMatch) sections.technical = title + '\n\n' + technicalMatch[0];

  return sections;
}

// --- String utilities ---

export function toCamelCase(name) {
  return name.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
}

export function htmlUnescape(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

// --- Code fence component processing ---
//
// The engine finds YAML code fences and delegates rendering to a callback.
// Each adapter provides its own renderComponent:
//   - Docsify: checks PreactBridge, creates placeholder or returns string
//   - Astro: calls renderToString, returns static HTML
//
// parseYaml: (string) => object
// renderComponent: (componentName: string, data: object) => string|null
//   Return string to replace the fence. Return null to keep original.

export function processCodeFenceComponents(html, { parseYaml, renderComponent }) {
  const namesPattern = COMPONENT_REGISTRY.join('|');
  const regex = new RegExp(
    '<pre[^>]*>\\s*<code[^>]*class="[^"]*(?:lang(?:uage)?)-(' + namesPattern + ')"[^>]*>([\\s\\S]*?)<\\/code>\\s*<\\/pre>',
    'gi'
  );

  return html.replace(regex, (match, componentName, rawContent) => {
    try {
      const unescaped = htmlUnescape(rawContent);
      const data = parseYaml(unescaped);
      const fnName = toCamelCase(componentName);
      const result = renderComponent(fnName, data);
      if (result !== null && result !== undefined) return result;
      console.warn('[engine] renderComponent returned null for:', fnName);
      return match;
    } catch (e) {
      console.error('[engine] Error processing ' + componentName + ':', e);
      return match;
    }
  });
}
