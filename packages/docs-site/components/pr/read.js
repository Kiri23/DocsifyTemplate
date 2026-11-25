// What the components of a PR summary read the same way from their Markdown: the code of a code
// block, the paragraphs of a quote, the HTML of a paragraph. Each component's `read` calls these.
import { ShapeError } from "../../as/shapes.js";

/** The code of a code block and its language, as the converter wrote them. */
export function codeBlock(pre, what) {
  const code = pre?.querySelector(":scope > code");
  if (!code) throw new ShapeError(`${what}: esperaba un bloque de código`);
  const lang = /(?:^|\s)language-(\S+)/.exec(code.getAttribute("class") ?? "")?.[1] ?? "text";
  return { lang, code: code.textContent.replace(/\n$/, "") };
}

/** The paragraphs of a quote, as HTML. */
export function quoted(blockquote, what) {
  const paragraphs = [...blockquote.children];
  if (!paragraphs.length || paragraphs.some((p) => p.localName !== "p")) {
    throw new ShapeError(`${what}: la cita lleva solo párrafos`);
  }
  return paragraphs.map((p) => p.innerHTML.trim());
}

/** The HTML of a list item's text, without its nested lists. */
export function itemHtml(li) {
  const copy = li.cloneNode(true);
  for (const list of copy.querySelectorAll(":scope > ul, :scope > ol, :scope > pre")) list.remove();
  const p = copy.querySelector(":scope > p");
  return (p ? p.innerHTML : copy.innerHTML).trim();
}

/** The nested list of a list item. */
export function sublist(li) {
  return li.querySelector(":scope > ul");
}
