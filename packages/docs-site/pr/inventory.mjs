// What a PR summary has, counted and listed the same way from the summarize-pr page and from its
// Markdown, so the two can be compared: how many blocks of each kind (the inventory), the data
// that must arrive byte by byte (the facts) and the page's text. On the Markdown side the
// components themselves read the blocks (the same `prepare` the site runs), so what passes here is
// what the site draws. test/pr.test.mjs and bin/pr.mjs --check call this.
import { marked } from "marked";
import { parseHTML } from "linkedom";
import { html } from "htm/preact";
import renderToString from "preact-render-to-string";
import { findMarks, prepare } from "../as/core.js";
import { testsOf } from "./write-markdown.mjs";

const plain = (text) => text.replace(/\s+/g, " ").trim();
const textOf = (fragment) => {
  const { document } = parseHTML(`<!DOCTYPE html><html><body><div>${fragment}</div></body></html>`);
  return plain(document.querySelector("div").textContent);
};
const tipsIn = (fragment) => [...fragment.matchAll(/<dfn\b[^>]*\bdata-tip="([^"]*)"/g)].map((m) => decode(m[1]));
const hrefsIn = (fragment) => [...fragment.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)].map((m) => decode(m[1]));
const decode = (text) => text.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&amp;/g, "&");

/** Every block of a summary, header first, with the prose it holds. */
function blocksOfSummary(page) {
  return [...page.header, ...page.sections.flatMap((s) => s.blocks)];
}

/** The prose of a block (the HTML of its lines), for terms and links. */
function proseOf(block) {
  switch (block.kind) {
    case "story": return block.ledes;
    case "note": return [block.html];
    case "callout": case "discarded": case "assumption": return block.paragraphs;
    case "decision": return [block.title, block.why, block.cost, ...block.discarded.flat()];
    case "chart-pair": return [block.before.label, block.now.label];
    case "tests": return block.files.flatMap(testsOf).map((t) => t.name);
    case "freeform": return [block.html];
    default: return [];
  }
}

/** The same blocks, read back by the components from the Markdown. */
function blocksOfMarkdown(markdown, components) {
  const { document } = parseHTML(`<!DOCTYPE html><html><body><main>${marked.parse(markdown)}</main></body></html>`);
  const main = document.querySelector("main");
  const taken = new Set();
  const marks = findMarks(main).map((mark) => {
    const { component, nodes, props } = prepare(mark, components);
    for (const node of nodes) taken.add(node);
    return { mark, name: component.name, component, nodes, props };
  });
  const notes = [...main.children].filter((el) => el.localName === "p" && !taken.has(el));
  return { document, main, marks, notes };
}

/** How many blocks of each kind a summary has. */
export function inventoryOfSummary(page) {
  const blocks = blocksOfSummary(page);
  const of = (kind) => blocks.filter((b) => b.kind === kind);
  const charts = [...of("chart"), ...of("chart-pair").flatMap((p) => [p.before, p.now])];
  const decisions = of("decision");
  const tests = of("tests").flatMap((b) => b.files);
  const groups = (items, kind) => items.reduce((n, i) => n + (i.group === kind ? 1 : 0) + (i.items ? groups(i.items, kind) : 0), 0);
  return {
    sections: page.sections.length,
    ledes: of("story").reduce((n, b) => n + b.ledes.length, 0),
    notes: of("note").length,
    callouts: of("callout").length,
    discarded: of("discarded").length + decisions.reduce((n, d) => n + d.discarded.length, 0),
    assumptions: of("assumption").length,
    decisions: decisions.length,
    implicit: decisions.filter((d) => d.origin === "implicit").length,
    diffs: of("diff").length,
    threads: of("diff").reduce((n, d) => n + d.threads.length, 0),
    comments: of("diff").reduce((n, d) => n + d.threads.reduce((m, t) => m + t.comments.length, 0), 0),
    examples: of("example").length,
    charts: charts.length,
    chartPairs: of("chart-pair").length,
    testFiles: tests.length,
    tests: tests.flatMap(testsOf).length,
    describes: tests.reduce((n, f) => n + (f.items ? groups(f.items, "describe") : 0), 0),
    cases: tests.reduce((n, f) => n + (f.items ? groups(f.items, "cases") : 0), 0),
    terms: blocks.flatMap(proseOf).reduce((n, p) => n + tipsIn(p).length, 0),
    chips: page.chips.length,
    freeform: of("freeform").length,
  };
}

/** How many blocks of each kind the Markdown draws. */
export function inventoryOfMarkdown(markdown, components) {
  const { main, marks, notes } = blocksOfMarkdown(markdown, components);
  const props = (name) => marks.filter((m) => m.name === name).map((m) => m.props);
  const decisions = props("decision");
  const files = props("tests").flatMap((p) => p.files);
  const groups = (items, kind) => items.reduce((n, i) => n + (i.group === kind ? 1 : 0) + (i.items ? groups(i.items, kind) : 0), 0);
  return {
    sections: main.querySelectorAll(":scope > h2").length,
    ledes: props("story").reduce((n, p) => n + p.ledes.length, 0),
    notes: notes.length,
    callouts: props("callout").length,
    discarded: props("discarded").length + decisions.reduce((n, d) => n + d.discarded.length, 0),
    assumptions: props("assumption").length,
    decisions: decisions.length,
    implicit: decisions.filter((d) => d.implicit).length,
    diffs: props("diff").length,
    threads: props("diff").reduce((n, d) => n + d.threads.length, 0),
    comments: props("diff").reduce((n, d) => n + d.threads.reduce((m, t) => m + t.comments.length, 0), 0),
    examples: props("example").length,
    charts: props("chart").length + props("chart-pair").length * 2,
    chartPairs: props("chart-pair").length,
    testFiles: files.length,
    tests: files.flatMap(testsOf).length,
    describes: files.reduce((n, f) => n + (f.items ? groups(f.items, "describe") : 0), 0),
    cases: files.reduce((n, f) => n + (f.items ? groups(f.items, "cases") : 0), 0),
    terms: main.querySelectorAll("dfn.term").length,
    chips: props("pr-header").reduce((n, p) => n + p.chips.length, 0),
    freeform: main.querySelectorAll(":scope > div.pr-freeform").length,
  };
}

/** The data of a summary that must arrive as it is: code, charts, tooltips, links, comments, tests. */
export function factsOfSummary(page) {
  const blocks = blocksOfSummary(page);
  const of = (kind) => blocks.filter((b) => b.kind === kind);
  const chart = (c) => ({ dot: c.dot, links: c.links });
  return {
    diffs: of("diff").map((d) => ({ path: d.path, line: d.line, lang: d.lang, name: d.name, old: d.old, new: d.new })),
    comments: of("diff").flatMap((d) => d.threads.map((t) => ({ side: t.side, line: t.line, comments: t.comments }))),
    examples: of("example").map((e) => ({ lang: e.lang, code: e.code })),
    charts: [...of("chart").map(chart), ...of("chart-pair").flatMap((p) => [chart(p.before), chart(p.now)])],
    tips: blocks.flatMap(proseOf).flatMap(tipsIn),
    hrefs: blocks.flatMap((b) => (b.kind === "tests" ? [] : proseOf(b))).flatMap(hrefsIn),
    slack: of("decision").map((d) => d.slack),
    tests: of("tests").flatMap((b) => b.files.flatMap((f) => testsOf(f).map((t) => ({
      path: f.path, line: t.line, change: t.change, renamedFrom: t.renamedFrom, name: textOf(t.name),
    })))),
    freeform: of("freeform").map((b) => b.html.replace(/\n\s*\n/g, "\n")),
  };
}

/** The same data, as the components read it from the Markdown. */
export function factsOfMarkdown(markdown, components) {
  const { main, marks } = blocksOfMarkdown(markdown, components);
  const props = (name) => marks.filter((m) => m.name === name).map((m) => m.props);
  // Links of prose: everything but the links the converter made (header, charts, tests, threads).
  const made = new Set(marks.filter((m) => ["pr-header", "chart", "chart-pair", "tests", "diff"].includes(m.name)).flatMap((m) => m.nodes));
  const prose = [...main.querySelectorAll("a[href]")].filter((a) => ![...made].some((n) => n.contains(a)) && !a.closest(".pr-freeform"));
  const chart = (c) => ({ dot: c.dot, links: c.links });
  return {
    diffs: props("diff").map((d) => ({ path: d.path, line: d.line, lang: d.lang, name: d.name, old: d.old, new: d.new })),
    comments: props("diff").flatMap((d) => d.threads.map((t) => ({ side: t.side, line: t.line, comments: t.comments }))),
    examples: props("example").map((e) => ({ lang: e.lang, code: e.code })),
    charts: [...props("chart").map(chart), ...props("chart-pair").flatMap((p) => [chart(p.before), chart(p.now)])],
    tips: [...main.querySelectorAll("dfn.term")].map((d) => d.getAttribute("data-tip")),
    hrefs: prose.map((a) => a.getAttribute("href")),
    slack: props("decision").map((d) => d.slack),
    tests: props("tests").flatMap((p) => p.files.flatMap((f) => testsOf(f).map((t) => ({
      path: f.path, line: t.line, change: t.change, renamedFrom: t.renamedFrom, name: textOf(t.name),
    })))),
    freeform: [...main.querySelectorAll(":scope > div.pr-freeform")].map((d) => d.innerHTML.replace(/^\n|\n$/g, "")),
  };
}

/** Each line of text that a reader sees in the summary's <main>, with its spaces collapsed. */
export function textOfSummary(html) {
  const { document } = parseHTML(html);
  const main = document.querySelector("main");
  for (const script of main.querySelectorAll("script, style, svg")) script.remove();
  const texts = [];
  for (const el of main.querySelectorAll("h1, h2, p, li, td, th, .decision-title, .decision-origin, .describe-name, .decision-label, .callout-label, .discarded-label")) {
    const copy = el.cloneNode(true);
    for (const inner of copy.querySelectorAll("ul, ol, p")) inner.remove();
    const text = plain(copy.textContent);
    if (text) texts.push(text);
  }
  return texts;
}

/** The text of the page as the site draws it: the Markdown with each marker's view in place. */
export function drawnText(markdown, components) {
  const { document, main, marks } = blocksOfMarkdown(markdown, components);
  for (const { mark, component, nodes, props } of marks) {
    const host = document.createElement("div");
    host.innerHTML = renderToString(html`<${component.view} ...${props} />`);
    mark.after(host);
    for (const node of nodes) node.remove();
  }
  return plain(main.textContent);
}
