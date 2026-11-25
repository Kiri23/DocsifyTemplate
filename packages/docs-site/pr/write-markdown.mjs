// The Markdown of a PR summary: what read-summary.mjs read from a summarize-pr page, as a page
// of the site with one `<!-- as: … -->` marker per block. Prose is plain Markdown; code, charts
// and comments go in code blocks as they are, so they arrive byte by byte. On GitHub it reads
// as a document; on the site the components of components/pr/ draw each block.
//
// bin/pr.mjs calls this after readSummary; the tests compare its output with docs/prs/<n>.md.
import { createHash } from "node:crypto";
import { inlineMarkdown } from "./inline.mjs";
import { diffLines, splitHiddenBlocks } from "./summarize-pr/shown-lines.mjs";

const SKILL = "https://github.com/MeLlamoPablo/skills/tree/72199a8/skills/summarize-pr";

/**
 * @param {ReturnType<import("./read-summary.mjs").readSummary>} page the summary as data
 * @param {{ original: string }} where the page's file name, for the "see the original" link
 * @returns {string} the Markdown
 */
export function toMarkdown(page, { original }) {
  const links = linksOf(page);
  const shown = shownLines(page);
  const out = [
    `<!-- Hecho con \`npm run docs:pr -- ${original}\` desde la página de summarize-pr. Para cambiarlo, cambiá ${original} y regeneralo. -->`,
    `# ${escapeTitle(page.title)}`,
    marker("pr-header", {
      repo: page.repo,
      pr: page.pr,
      head: page.head,
      additions: page.additions,
      deletions: page.deletions,
      "shown-additions": shown.additions,
      "shown-deletions": shown.deletions,
      preview: page.preview,
    }) + `\n[Ver el original](${original}) · hecho con [summarize-pr](${SKILL})`,
  ];
  if (page.chips.length) out.push(page.chips.map((chip) => `- ${inlineMarkdown(chip)}`).join("\n"));
  out.push(...page.header.map((block) => blockMarkdown(block, links)));
  for (const section of page.sections) {
    out.push(`## ${escapeTitle(section.title)}`);
    out.push(...section.blocks.map((block) => blockMarkdown(block, links)));
  }
  return out.join("\n\n") + "\n";
}

function blockMarkdown(block, links) {
  switch (block.kind) {
    case "story":
      return marker("story") + "\n" + quote(block.ledes);
    case "note":
      return inlineMarkdown(block.html);
    case "callout":
      return marker("callout", { label: block.label }) + "\n" + quote(block.paragraphs);
    case "discarded":
      return marker("discarded") + "\n" + quote(block.paragraphs);
    case "assumption":
      return marker("assumption") + "\n" + quote(block.paragraphs);
    case "decision":
      return marker("decision", { origin: block.origin, slack: block.slack }) + "\n" +
        `**${inlineMarkdown(block.title)}**\n\n` +
        [
          field("Why", [block.why]),
          field("Trade-off", [block.cost]),
          ...block.discarded.map((paragraphs) => field("Discarded idea", paragraphs)),
        ].join("\n");
    case "diff":
      return diffMarkdown(block, links);
    case "example":
      return marker("example") + "\n" + fence(block.lang, block.code);
    case "chart":
      return marker("chart") + "\n" + chartMarkdown(block, links);
    case "chart-pair":
      return marker("chart-pair") + "\n" + [block.before, block.now]
        .map((half) => `${inlineMarkdown(half.label)}\n\n${chartMarkdown(half, links)}`).join("\n\n");
    case "tests":
      return marker("tests") + "\n" + block.files.map((file) => testFile(file, links)).join("\n");
    case "freeform":
      // An HTML block ends at a blank line, so the block keeps none.
      return `<div class="pr-freeform">\n${block.html.replace(/\n\s*\n/g, "\n")}\n</div>`;
    default:
      throw new Error(`no sé escribir un bloque ${block.kind}`);
  }
}

function diffMarkdown(block, links) {
  const only = block.old === null ? "new" : block.new === null ? "old" : null;
  const head = marker("diff", {
    path: block.path,
    line: block.line,
    lang: block.lang,
    name: block.name,
    only,
    href: links.diff(block),
  });
  const code = [block.old, block.new].filter((side) => side !== null).map((side) => fence(block.lang, side));
  const threads = block.threads.flatMap((thread) => thread.comments.map((c) =>
    `- ${thread.side}:${thread.line} · [@${c.author}](${c.href})\n` + indent(fence("markdown", c.markdown), "  ")));
  return [head + "\n" + code.join("\n\n"), ...(threads.length ? [threads.join("\n")] : [])].join("\n\n");
}

function chartMarkdown(chart, links) {
  const boxes = Object.entries(chart.links).map(([id, path]) => `- \`${id}\`: [${path}](${links.blob(path)})`);
  return fence("dot", chart.dot) + (boxes.length ? "\n\n" + boxes.join("\n") : "");
}

function testFile(file, links) {
  const head = `- \`${file.path}\``;
  if (file.table) return head + "\n\n" + indent(file.table.replace(/\n\s*\n/g, "\n"), "  ") + "\n";
  return head + "\n" + indent(testItems(file.items, file.path, links), "  ");
}

function testItems(items, path, links) {
  return items.map((item) => {
    if (item.group === "describe") return `- **${inlineMarkdown(item.name)}**\n` + indent(testItems(item.items, path, links), "  ");
    if (item.group === "cases") return "- _Cases of one test_\n" + indent(testItems(item.items, path, links), "  ");
    const renamed = item.renamedFrom ? ` (renamed from ${item.renamedFrom})` : "";
    return `- ${item.change} L${item.line}: [${inlineMarkdown(item.name)}](${links.test(path, item)})${renamed}`;
  }).join("\n");
}

/** The GitHub links the template makes from <main>'s data, made here so the Markdown has them. */
function linksOf(page) {
  const files = `${page.repo}/pull/${page.pr}/files`;
  const anchor = (path) => createHash("sha256").update(path).digest("hex");
  return {
    // A diff with only old code shows deleted code, so its line is on the merge base side.
    diff: (diff) => `${files}#diff-${anchor(diff.path)}${diff.new === null ? "L" : "R"}${diff.line}`,
    test: (path, test) => `${files}#diff-${anchor(path)}${test.change === "removed" ? "L" : "R"}${test.line}`,
    blob: (path) => `${page.repo}/blob/${page.head}/${path}`,
  };
}

/** The added and removed lines the page shows, counted as summarize-pr's header counts them. */
export function shownLines(page) {
  let additions = 0;
  let deletions = 0;
  const lines = (code) => code === null || code === "" ? [] : splitHiddenBlocks(code.split("\n")).collapsed;
  const blocks = [...page.header, ...page.sections.flatMap((s) => s.blocks)];
  for (const diff of blocks.filter((b) => b.kind === "diff")) {
    for (const row of diffLines(lines(diff.old), lines(diff.new))) {
      if (row.text.trim() === "") continue;
      if (row.kind === "add") additions++;
      if (row.kind === "del") deletions++;
    }
  }
  for (const test of blocks.filter((b) => b.kind === "tests").flatMap((b) => b.files.flatMap(testsOf))) {
    if (test.change === "removed") deletions++;
    else additions++;
  }
  return { additions, deletions };
}

/** Every test of a file of the test list, out of its groups. */
export function testsOf(file) {
  if (file.tests) return file.tests;
  const flat = (items) => items.flatMap((item) => item.items ? flat(item.items) : [item]);
  return flat(file.items);
}

function marker(name, attrs = {}) {
  const said = Object.entries(attrs)
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([key, value]) => {
      const text = String(value);
      if (text.includes('"') || text.includes("--")) throw new Error(`${name}: ${key}="${text}" no cabe en una marca`);
      return ` ${key}="${text}"`;
    }).join("");
  return `<!-- as: ${name}${said} -->`;
}

/** Paragraphs as a Markdown quote. */
function quote(paragraphs) {
  return paragraphs.map((p) => `> ${inlineMarkdown(p)}`).join("\n>\n");
}

/** One field of a decision: "- **Why:** …", with more paragraphs under it if it has them. */
function field(label, paragraphs) {
  const [first, ...rest] = paragraphs.map(inlineMarkdown);
  return `- **${label}:** ${first}` + rest.map((p) => `\n\n  ${p}`).join("");
}

/** A code block with a fence longer than any run of backticks in the code. */
function fence(lang, code) {
  const runs = code.match(/^`{3,}/gm) ?? [];
  const ticks = "`".repeat(Math.max(3, ...runs.map((r) => r.length + 1)));
  return `${ticks}${lang}\n${code}\n${ticks}`;
}

function indent(text, by) {
  return text.split("\n").map((line) => (line ? by + line : line)).join("\n");
}

/** A title as a heading's text: what Markdown would read as syntax, escaped. */
function escapeTitle(text) {
  return text.replace(/([\\`*_[\]<>#])/g, "\\$1");
}
