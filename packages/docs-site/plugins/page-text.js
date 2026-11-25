// The prose of the page for an AI agent. UI SDK's snapshot lists the components and their state
// (a decision is open or closed) but not what they say: the text inside a closed decision, a note
// or a term's definition never reaches it. This tool gives the agent the page as its Markdown, the
// data the site draws from, split by section, with the terms and their definitions. The agent then
// reads why a decision was made without opening it and without reading the DOM.
//
// plugins/ui-sdk.js registers it next to UI SDK's three tools; the Docsify plugin below keeps the
// Markdown of the page being shown.

/** A text as the tool compares it: lowercase and without accents. */
const fold = (text) => text.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/**
 * The sections of a Markdown page: the part before the first `##` and each `##` with what follows.
 * @param {string} markdown
 */
export function sectionsOf(markdown) {
  const sections = [];
  let current = { title: "", lines: [] };
  let fence = null;
  for (const line of markdown.split("\n")) {
    const opens = /^\s*(`{3,}|~{3,})/.exec(line)?.[1];
    if (opens && (!fence || opens.startsWith(fence))) fence = fence ? null : opens;
    const heading = !fence && /^##\s+(.*)$/.exec(line);
    if (heading) {
      sections.push(current);
      current = { title: heading[1].trim(), lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  sections.push(current);
  return sections.map((s) => ({ title: s.title, markdown: s.lines.join("\n").trim() })).filter((s) => s.title || s.markdown);
}

/** The terms a page explains, each with its definition (the tooltip of its `<dfn>`). */
export function termsOf(markdown) {
  const decode = (t) => t.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  return [...markdown.matchAll(/<dfn\b([^>]*)>([\s\S]*?)<\/dfn>/g)].map((m) => ({
    term: m[2].replace(/<[^>]*>/g, "").trim(),
    definition: decode(/data-tip="([^"]*)"/.exec(m[1])?.[1] ?? ""),
  }));
}

/**
 * What the tool answers for the page shown now.
 * @param {{ markdown: string, file: string }} page
 * @param {{ section?: string }} input a section's title (or part of it); without it, the outline
 */
export function answer(page, { section } = {}) {
  const sections = sectionsOf(page.markdown);
  const terms = termsOf(page.markdown);
  if (section === undefined || section === "") {
    return {
      page: page.file,
      sections: sections.map((s) => s.title || "(top)"),
      terms,
      text: sections[0]?.title ? "" : sections[0]?.markdown ?? "",
      note: "Pass `section` with one of `sections` to read it whole. Decisions read **Why:** and **Trade-off:** even when closed.",
    };
  }
  const wanted = fold(section);
  const found = sections.find((s) => fold(s.title || "(top)") === wanted) ?? sections.find((s) => fold(s.title).includes(wanted));
  if (!found) return { error: `No section "${section}". Sections: ${sections.map((s) => s.title || "(top)").join(", ")}.` };
  return { page: page.file, section: found.title || "(top)", text: found.markdown, terms: termsOf(found.markdown) };
}

/** The tool, and how to run it, over the page that the Docsify plugin keeps. */
export function readTool() {
  const shown = { markdown: "", file: "" };
  return {
    shown,
    tool: {
      name: "read",
      description: "Reads the text of the page, which snapshot leaves out: notes, the why and trade-off of each decision (also closed ones), test names and the definition of each term. Without input it returns the section titles, the terms and the top of the page; with `section` it returns that section as Markdown.",
      inputSchema: { type: "object", properties: { section: { type: "string" } } },
    },
    run: (input = {}) => answer(shown, input),
  };
}

/** The Docsify plugin that keeps the Markdown of the page being shown for the tool. */
export function pageText(read) {
  return (hook, vm) => {
    hook.beforeEach((markdown) => {
      read.shown.markdown = markdown;
      read.shown.file = vm.route.file;
      return markdown;
    });
  };
}
