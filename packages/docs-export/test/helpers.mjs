// Shared fixtures for packages/docs-export tests so paths and parsers live in one place.
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import { parseHTML } from "linkedom";
import * as builtIn from "../../docs-site/components/mod.js";

export const TERMINAL_DOC = fileURLToPath(
  new URL("../../docs-site/docs/componentes/terminal.md", import.meta.url),
);

export const BUILT_IN_MAP = new Map(Object.values(builtIn).map((c) => [c.name, c]));

export const PARSERS = {
  parseMarkdown: {
    lexer: (src) => marked.lexer(src),
    parser: (tokens) => marked.parser(tokens),
  },
  parseHtml(html) {
    return parseHTML(`<!DOCTYPE html><html><body><main>${html}</main></body></html>`).document.querySelector("main");
  },
};

/** Checks balanced parentheses and double-quoted strings in a Typst snippet. */
export function assertBalancedTypst(source, label) {
  let inString = false;
  let escaped = false;
  let depth = 0;
  for (const ch of source) {
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "(") depth++;
    else if (ch === ")") depth--;
    assert.ok(depth >= 0, `${label}: unexpected closing parenthesis in Typst output`);
  }
  assert.equal(inString, false, `${label}: unterminated string literal in Typst output`);
  assert.equal(depth, 0, `${label}: unbalanced parentheses in Typst output`);
}
