// The menu of a folder of pages, as Docsify's _sidebar.md. serve.mjs uses it for a folder that has
// no sidebar, and armar.mjs for the catalog.

/**
 * A Markdown list of pages, grouped by their first folder. The sidebar shows on every page, so
 * the links start at the root of the site, not at the open page.
 * @param {{ path: string, link: string }[]} pages `path` is what the menu says
 *   ("skills/brainstorm/SKILL.md"), `link` where it goes ("/_catalogo/skills/brainstorm/SKILL.md")
 */
export function sidebarFor(pages) {
  const groups = new Map();
  const sorted = [...pages].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  for (const page of sorted) {
    const parts = page.path.split("/");
    const group = parts.length > 1 ? parts[0] : "";
    const label = parts.length > 1 ? parts.slice(1).join("/") : parts[0];
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(`  * [${label}](${page.link})`);
  }
  const blocks = [];
  for (const [group, items] of groups) {
    if (group) blocks.push(`* ${group}\n${items.join("\n")}`);
    else blocks.push(items.map((item) => item.trim()).join("\n"));
  }
  return blocks.join("\n");
}
