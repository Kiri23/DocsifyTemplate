// A line of text of a summarize-pr page (a lede, a note, a decision's title) as Markdown that
// marked turns back into the same text: `<code>` as backticks, `<b>` as **, a link as [text](href).
// A term (`<dfn class="term">`) and what Markdown has no syntax for (`<kbd>`) stay as HTML, which
// marked keeps. write-markdown.mjs calls this for every line of prose.
import { parseHTML } from "linkedom";

/** Inline elements that Markdown writes with its own syntax. */
const WRAP = { b: "**", strong: "**", em: "_", i: "_" };

/**
 * @param {string} html the inside of a paragraph
 * @returns {string} the same text as Markdown, on one line
 */
export function inlineMarkdown(html) {
  const { document } = parseHTML(`<!DOCTYPE html><html><body><p>${html}</p></body></html>`);
  const text = nodes(document.querySelector("p").childNodes).replace(/\s+/g, " ").trim();
  // A paragraph that starts like a heading, a quote or a list would be read as one.
  return text.replace(/^([#>+-]|\d+\.)/, "\\$1");
}

function nodes(list) {
  return [...list].map(node).join("");
}

function node(n) {
  if (n.nodeType === 3) return escapeText(n.data);
  if (n.nodeType !== 1) return "";
  const tag = n.localName;
  if (tag === "code") return code(n.textContent);
  if (WRAP[tag]) {
    const inner = nodes(n.childNodes);
    // ** around text that starts or ends with a space isn't bold in Markdown.
    const [, before, middle, after] = /^(\s*)([\s\S]*?)(\s*)$/.exec(inner);
    return middle ? `${before}${WRAP[tag]}${middle}${WRAP[tag]}${after}` : inner;
  }
  if (tag === "a" && n.getAttribute("href") && [...n.attributes].every((a) => ["href", "target", "rel"].includes(a.name))) {
    return `[${nodes(n.childNodes)}](${n.getAttribute("href").replace(/[()\s]/g, encodeURIComponent)})`;
  }
  if (tag === "br") return "<br>";
  // A term, a key and anything else: as HTML, with what is inside it written the same way.
  const attrs = [...n.attributes].map((a) => ` ${a.name}="${a.value.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"`).join("");
  return `<${tag}${attrs}>${nodes(n.childNodes)}</${tag}>`;
}

/** Inline code: as many backticks around it as it needs. */
function code(text) {
  const runs = text.match(/`+/g) ?? [];
  const fence = "`".repeat(Math.max(0, ...runs.map((r) => r.length)) + 1);
  const pad = /^`|`$|^ .* $/.test(text) ? " " : "";
  return `${fence}${pad}${text}${pad}${fence}`;
}

/** Text that Markdown would read as syntax, escaped. */
function escapeText(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/([\\`*_[\]])/g, "\\$1");
}
