// The terms of a PR summary (docs/prs/<n>.md), as summarize-pr shows them: the page explains each
// term once, in a `<dfn class="term" data-tip="…">` at its first use, and every other use of the
// term on the page (also its plural, in any case) gets the same dotted underline and explanation.
// Here the explanation is a UI SDK hover card, on hover, keyboard focus or (on a phone) a tap. A term that is also
// in the repo's glossary (`data-glossary="<id>"`) links to its entry there (glossary-terms.js gives
// each entry that id); any other term links to its first use. Adapted from summarize-pr's
// template.html (see NOTICE). The agent reads the definitions with the `read` tool
// (plugins/page-text.js), so only the first use of each term shows in its snapshot.
import { termSlug } from "./glossary-terms.js";

/** Where the site's glossary lives (docs/incluir.txt copies GLOSSARY.md into _catalogo/). */
const GLOSSARY = "#/_catalogo/GLOSSARY?id=";
/** Text that never gets a term: headings, links, code, the components' own controls. */
const SKIP = "h1, h2, h3, h4, a, code, pre, dfn, .pr-term, script, button, figure, .pr-header, .pr-tests, .pr-chart, ui-hover-card";

/**
 * Turns every term of a drawn page into a hover card. Returns how many terms it explained.
 * @param {Element} root the drawn page
 * @param {string} route the page's route, for the link to a term's first use ("/prs/59")
 */
export function markPrTerms(root, route) {
  const doc = root.ownerDocument;
  const definitions = new Map();
  for (const dfn of root.querySelectorAll("dfn.term[data-tip]")) {
    if (dfn.closest("ui-hover-card")) continue;
    const name = dfn.textContent.trim().replace(/\s+/g, " ");
    const id = `term-${termSlug(name)}`;
    dfn.id = id;
    const href = dfn.dataset.glossary ? GLOSSARY + encodeURIComponent(dfn.dataset.glossary) : `#${route}?id=${id}`;
    definitions.set(name.toLowerCase(), { name, tip: dfn.dataset.tip, href });
    dfn.replaceWith(card(doc, { name, tip: dfn.dataset.tip, href, inner: dfn.cloneNode(true), first: true }));
  }
  if (!definitions.size) return 0;
  // Longer terms first, so a term that contains another one wins.
  const names = [...definitions.keys()].sort((a, b) => b.length - a.length);
  const escape = (n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}_])(${names.map(escape).join("|")})(?:e?s)?(?![\\p{L}\\p{N}_])`, "giu");
  const walker = doc.createTreeWalker(root, 4);
  const texts = [];
  while (walker.nextNode()) {
    if (!walker.currentNode.parentElement.closest(SKIP)) texts.push(walker.currentNode);
  }
  for (const node of texts) {
    const matches = [...node.data.matchAll(pattern)];
    if (!matches.length) continue;
    const parts = [];
    let end = 0;
    for (const m of matches) {
      const term = definitions.get(m[1].toLowerCase().replace(/\s+/g, " "));
      const use = doc.createElement("span");
      use.className = "term";
      use.textContent = m[0];
      parts.push(node.data.slice(end, m.index), card(doc, { ...term, inner: use, first: false }));
      end = m.index + m[0].length;
    }
    parts.push(node.data.slice(end));
    node.replaceWith(...parts);
  }
  return definitions.size;
}

/** One term as a hover card: the link that wraps the term, and the explanation in the card. */
function card(doc, { name, tip, href, inner, first }) {
  const root = doc.createElement("ui-hover-card");
  root.className = "pr-term";
  // The agent sees each term once, at its first use.
  if (!first) root.setAttribute("data-agent-hidden", "");
  const trigger = doc.createElement("ui-hover-card-trigger");
  const link = doc.createElement("a");
  link.className = "pr-term-link";
  link.href = href;
  if (!first) link.tabIndex = -1;
  link.append(inner);
  trigger.append(link);
  const content = doc.createElement("ui-hover-card-content");
  content.hidden = true;
  const label = doc.createElement("div");
  label.className = "pr-term-name";
  label.textContent = name;
  const text = doc.createElement("div");
  text.className = "pr-term-tip";
  // Text between backticks is inline code, as in Markdown.
  text.append(...tip.split("`").map((part, i) => {
    if (i % 2 === 0) return part;
    const code = doc.createElement("code");
    code.textContent = part;
    return code;
  }));
  content.append(label, text);
  root.append(trigger, content);
  return root;
}

/**
 * A phone has no hover, and UI SDK's hover card opens only on hover and focus. There a first tap
 * on a term opens its card (with the card's `open` property) instead of following the link, a
 * second tap follows it, and a tap elsewhere closes the card. A mouse click still follows the link.
 * @param {Document} doc
 */
export function tapToOpen(doc) {
  let touch = false;
  doc.addEventListener("pointerdown", (event) => {
    touch = event.pointerType === "touch";
    if (!touch) return;
    const here = event.target.closest?.("ui-hover-card.pr-term");
    for (const card of doc.querySelectorAll("ui-hover-card.pr-term")) {
      if (card !== here && card.open) card.open = false;
    }
  }, true);
  doc.addEventListener("click", (event) => {
    const card = touch && event.target.closest?.("ui-hover-card.pr-term");
    if (!card || card.open) return;
    event.preventDefault();
    card.open = true;
  }, true);
}

export function prTerms() {
  return (hook, vm) => {
    hook.mounted(() => tapToOpen(document));
    hook.doneEach(() => {
      const main = document.querySelector("#main");
      if (main && main.querySelector("dfn.term[data-tip]")) markPrTerms(main, vm.route.path);
    });
  };
}
