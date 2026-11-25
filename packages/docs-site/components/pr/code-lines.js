// The code of one side of a diff as summarize-pr's page shows it: a `//!` line is a comment only
// on the page (shown as `//`), and the code between `//{` and `//}` hides behind one row until the
// reader opens it. Adapted from the module script of summarize-pr's template.html (see NOTICE);
// the hidden blocks and the line diff are the copies in pr/summarize-pr/shown-lines.mjs.
// diff.js and example.js call this.
import { diffLines, EXPANDER, splitHiddenBlocks } from "../../pr/summarize-pr/shown-lines.mjs";

export { EXPANDER };

/** What the page says over a line that is only a page comment. */
export const PAGE_COMMENT_TITLE = "Not in the code: this comment is only on this page.";

/**
 * One side of a diff, with its hidden blocks closed (`text`) and open (`expandedText`).
 * @param {string | null} code the side as the Markdown has it, or null when the diff has no such side
 */
export function readSide(code) {
  const pageComments = new Set();
  const text = (code ?? "").replace(/\s+$/, "").replace(/^(\s*)\/\/!(.*)$/gm, (_, indent, comment) => {
    pageComments.add(`//${comment}`.trim());
    return `${indent}//${comment}`;
  });
  // An empty side is no file, not a file with one empty line.
  if (text === "") return { text: "", expandedText: "", expandedLineOf: [], pageComments };
  const { collapsed, expanded, expandedLineOf } = splitHiddenBlocks(text.split("\n"));
  return { text: collapsed.join("\n") + "\n", expandedText: expanded.join("\n") + "\n", expandedLineOf, pageComments };
}

export function toLines(text) {
  return text === "" ? [] : text.replace(/\n$/, "").split("\n");
}

/** The rows of the plain unified view: each line with whether it was added, removed or kept. */
export function rowsOf(oldSide, newSide, expanded) {
  const key = expanded ? "expandedText" : "text";
  return diffLines(toLines(oldSide[key]), toLines(newSide[key]));
}

/** How many lines the hidden blocks of a side hide. */
export function hiddenCount(side) {
  return toLines(side.expandedText).length - toLines(side.text).length + toLines(side.text).filter((l) => EXPANDER.test(l.trim())).length;
}
