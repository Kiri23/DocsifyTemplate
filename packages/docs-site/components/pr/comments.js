// A review comment of GitHub, drawn as GitHub does: its Markdown, `#123` linked to that PR or
// issue and `@login` to that person, and any HTML shown as text so a comment runs no script.
// diff.js calls this for each comment of a thread. It uses the Markdown parser Docsify already
// loaded; without it, the comment shows as plain paragraphs.

const escapeHtml = (text) => text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * @param {string} markdown the comment, as GitHub has it
 * @param {string} repo the repo's address, for `#123`
 * @returns {string} HTML
 */
export function commentHtml(markdown, repo) {
  const marked = globalThis.window?.marked;
  if (!marked?.parse) {
    return markdown.split(/\n\s*\n/).map((p) => `<p>${escapeHtml(p)}</p>`).join("");
  }
  const linked = markdown
    // Code (fenced or inline) keeps its # and @ as they are.
    .split(/(```[\s\S]*?```|`[^`\n]*`)/)
    .map((part, i) => (i % 2 ? part : part
      .replace(/<[^>]*>/g, (tag) => escapeHtml(tag))
      .replace(/(^|[^\w/#@[])#(\d+)\b/g, `$1[#$2](${repo}/issues/$2)`)
      .replace(/(^|[^\w/#@[])@([a-z\d](?:[a-z\d-]*[a-z\d])?)(?![\w-])/gi, "$1[@$2](https://github.com/$2)")))
    .join("");
  const out = marked.parse(linked, { breaks: true, gfm: true });
  return out.replace(/<a /g, '<a target="_blank" rel="noopener" ');
}
