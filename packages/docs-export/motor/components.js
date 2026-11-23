// Expands `<!-- as: name -->` markers whose component defines a `.typst(props)` view into
// fenced raw Typst blocks (`{=typst}`). Uses the exact same `findMarks` + `prepare` pipeline
// as docs-site/bin/check.mjs and the live site, with the Markdown lexer and HTML parser
// supplied by the transport so this module stays free of Node and browser globals.
import { findMarks, prepare, ShapeError } from "../../docs-site/as/core.js";

const TOKEN_SENTINEL = /^\s*__docs_export_tok:(\d+)__\s*$/;
const SINGLE_COMMENT = /^<!--[\s\S]*-->$/;

/**
 * Wraps raw Typst markup in a fenced `{=typst}` block whose fence is longer than any run
 * of backticks inside the snippet, so Pandoc passes it through byte-for-byte.
 * @param {string} typstSource
 * @returns {string}
 */
export function wrapRawTypst(typstSource) {
  let longest = 2;
  for (const match of typstSource.matchAll(/`+/g)) {
    if (match[0].length > longest) longest = match[0].length;
  }
  const fence = "`".repeat(longest + 1);
  const body = typstSource.endsWith("\n") ? typstSource : `${typstSource}\n`;
  return `\n${fence}{=typst}\n${body}${fence}\n`;
}

/** Finds the token index announced by the nearest preceding sentinel sibling. */
function tokenIndexOf(node) {
  for (let prev = node.previousSibling; prev; prev = prev.previousSibling) {
    if (prev.nodeType === 8) {
      const match = TOKEN_SENTINEL.exec(prev.data);
      if (match) return Number(match[1]);
    }
  }
  return null;
}

/** Finds a closing `<!-- /as -->` comment right after the last consumed node, if present. */
function closingMarkerAfter(node) {
  for (let next = node.nextSibling; next; next = next.nextSibling) {
    if (next.nodeType === 3 && !next.textContent.trim()) continue;
    if (next.nodeType === 8) {
      if (TOKEN_SENTINEL.test(next.data)) continue;
      if (next.data.trim() === "/as") return next;
    }
    return null;
  }
  return null;
}

/** Checks that a top-level Markdown token contains only the marker comment itself. */
function isStandaloneCommentToken(token) {
  if (!token || token.type !== "html") return false;
  const trimmed = token.raw.trim();
  if (!SINGLE_COMMENT.test(trimmed)) return false;
  return (trimmed.match(/<!--/g) || []).length === 1;
}

/**
 * Replaces every expandable `<!-- as: ... -->` block in `markdown` with a `{=typst}` raw block.
 * Components without `.typst(props)`, fenced code examples, nested markers, and malformed
 * markers are left as plain Markdown so Pandoc converts them normally.
 * @param {string} markdown source Markdown
 * @param {{
 *   components: Map<string, object>,
 *   parseMarkdown: { lexer: (src: string) => Array<object>, parser: (tokens: Array<object>) => string },
 *   parseHtml: (html: string) => object,
 *   load?: (src: string) => unknown,
 *   onWarning?: (message: string) => void,
 * }} options
 * @returns {string}
 */
export function expandComponentsToTypst(
  markdown,
  { components, parseMarkdown, parseHtml, load, onWarning } = {},
) {
  if (!components || components.size === 0) return markdown;
  if (!parseMarkdown?.lexer || !parseMarkdown?.parser) {
    throw new Error("expandComponentsToTypst necesita parseMarkdown ({ lexer, parser })");
  }
  if (typeof parseHtml !== "function") {
    throw new Error("expandComponentsToTypst necesita parseHtml(html)");
  }

  const normalized = markdown.replace(/\r\n/g, "\n");
  const tokens = parseMarkdown.lexer(normalized);
  const links = tokens.links ?? {};

  const htmlParts = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === "space" || token.type === "def") continue;
    const slice = [token];
    slice.links = links;
    htmlParts.push(`<!-- __docs_export_tok:${i}__ -->`);
    htmlParts.push(parseMarkdown.parser(slice));
  }

  const root = parseHtml(htmlParts.join(""));
  const replacements = [];

  for (const mark of findMarks(root)) {
    const startToken = tokenIndexOf(mark);
    if (startToken === null || !isStandaloneCommentToken(tokens[startToken])) {
      onWarning?.(`marca anidada o mezclada con HTML no se expande a Typst: <!--${mark.data}-->`);
      continue;
    }

    let prepared;
    try {
      prepared = prepare(mark, components, { load });
    } catch (error) {
      if (error instanceof ShapeError) {
        onWarning?.(`marca ignorada al exportar (se deja el Markdown plano): ${error.message}`);
        continue;
      }
      throw error;
    }

    const { component, nodes, props } = prepared;
    if (typeof component.typst !== "function") continue;

    let lastNode = nodes.length > 0 ? nodes[nodes.length - 1] : mark;
    const closing = closingMarkerAfter(lastNode);
    if (closing && tokenIndexOf(closing) !== null) {
      lastNode = closing;
    }

    const endToken = tokenIndexOf(lastNode);
    if (endToken === null || endToken < startToken || lastNode.parentNode !== mark.parentNode) {
      onWarning?.(`no se pudo ubicar el rango de tokens para ${component.name}; se deja el Markdown plano`);
      continue;
    }

    const typstSnippet = component.typst(props);
    if (typeof typstSnippet !== "string") {
      throw new Error(`componente "${component.name}".typst() tiene que devolver un string`);
    }

    replacements.push({ start: startToken, end: endToken, replacement: wrapRawTypst(typstSnippet) });
  }

  if (replacements.length === 0) return markdown;

  const output = [];
  let cursor = 0;
  for (const { start, end, replacement } of replacements) {
    if (start < cursor) continue;
    for (let i = cursor; i < start; i++) output.push(tokens[i].raw);
    output.push(replacement);
    cursor = end + 1;
  }
  for (let i = cursor; i < tokens.length; i++) output.push(tokens[i].raw);

  return output.join("");
}
