// Shared helper for components that render a Typst view alongside their web view.
// Used by docs-site components (such as terminal.js) and by docs-export/motor/mermaid.js.

/** Escapes text so it stays a literal string inside a Typst document. */
export function escapeTypstString(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");
}
