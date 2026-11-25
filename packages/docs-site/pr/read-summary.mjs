// Reads a page that the summarize-pr skill made (its template.html with the slots filled) as data:
// the header, each section and each block in it, in page order. Only what is inside <main> counts;
// the template's CSS and script are not data. A block that is not in the template's catalog and
// is not a freeform block throws: the converter never guesses.
//
// bin/pr.mjs calls this, then write-markdown.mjs turns the result into the page's Markdown.
import { parseHTML } from "linkedom";

/** What the converter could not read, with where it is. */
export class SummaryError extends Error {}

/** The classes the template gives its blocks. A freeform block can't use them. */
const RESERVED = new Set([
  "story", "lede", "note", "callout", "callout-label", "discarded", "discarded-label", "decision",
  "assumption", "stats", "chip", "diff", "example", "chart", "chart-pair", "tests", "thread", "comment",
]);

/**
 * The page as data.
 * @param {string} html a summarize-pr page
 * @returns {{ title: string, repo: string, pr: number, head: string, additions: number,
 *   deletions: number, chips: string[], preview: string | null, header: object[],
 *   sections: { id: string, title: string, blocks: object[] }[] }}
 */
export function readSummary(html) {
  const { document } = parseHTML(html);
  const main = document.querySelector("main");
  if (!main) throw new SummaryError("la página no tiene <main>: ¿es de summarize-pr?");
  const header = main.querySelector(":scope > header");
  if (!header) throw new SummaryError("<main> no tiene <header>");
  const title = header.querySelector(":scope > h1");
  if (!title) throw new SummaryError("el <header> no tiene <h1>");
  const stats = header.querySelector(":scope > .stats");
  const preview = document.querySelector(".sidebar .preview-link")?.getAttribute("href") ?? null;

  const page = {
    title: title.textContent.trim(),
    repo: main.getAttribute("data-repo-url"),
    pr: Number(main.getAttribute("data-pr")),
    head: main.getAttribute("data-head-sha"),
    additions: Number(stats?.getAttribute("data-pr-additions") ?? 0),
    deletions: Number(stats?.getAttribute("data-pr-deletions") ?? 0),
    chips: [...(stats?.querySelectorAll(".chip") ?? [])].map((c) => c.innerHTML.trim()),
    preview: preview && !preview.includes("{{") ? preview : null,
    header: [],
    sections: [],
  };
  if (!/^https:\/\/github\.com\/[^/]+\/[^/]+$/.test(page.repo ?? "")) {
    throw new SummaryError(`<main data-repo-url="${page.repo}"> no es https://github.com/<dueño>/<repo>`);
  }

  page.header = blocksOf([...header.children].filter((el) => el !== title && el !== stats), "header");
  for (const section of main.querySelectorAll(":scope > section")) {
    const h2 = section.querySelector(":scope > h2");
    if (!h2) throw new SummaryError(`la sección #${section.id} no tiene <h2>`);
    page.sections.push({
      id: section.id,
      title: h2.textContent.trim(),
      blocks: blocksOf([...section.children].filter((el) => el !== h2), `#${section.id}`),
    });
  }
  const loose = [...main.children].filter((el) => el !== header && el.localName !== "section");
  if (loose.length) throw new SummaryError(`<main> tiene ${describe(loose[0])} fuera del header y de las secciones`);
  return page;
}

/** The blocks of the header or of one section, in order. */
function blocksOf(elements, where) {
  const blocks = [];
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const at = `${where}, bloque ${i + 1}`;
    if (el.localName === "style") {
      // The CSS of a freeform block goes right before it.
      const next = elements[i + 1];
      if (!next || isCatalog(next)) throw new SummaryError(`${at}: un <style> va justo antes de su bloque libre`);
      blocks.push({ kind: "freeform", html: `${el.outerHTML}\n${next.outerHTML}` });
      i++;
    } else {
      blocks.push(readBlock(el, at));
    }
  }
  return blocks;
}

/** Whether an element is one of the template's blocks (or tries to be one). */
function isCatalog(el) {
  return ["p", "pre", "details", "aside", "figure", "script"].includes(el.localName) ||
    /^h[1-6]$/.test(el.localName) || [...el.classList].some((c) => RESERVED.has(c));
}

function readBlock(el, at) {
  const is = (selector) => el.matches(selector);
  if (is("div.story")) {
    const ledes = [...el.children];
    if (!ledes.length || ledes.some((p) => !p.matches("p.lede"))) throw new SummaryError(`${at}: .story lleva solo <p class="lede">`);
    return { kind: "story", ledes: ledes.map((p) => p.innerHTML) };
  }
  if (is("p.note")) return { kind: "note", html: el.innerHTML };
  if (is("aside.callout")) {
    const label = el.querySelector(":scope > .callout-label");
    return { kind: "callout", label: label?.textContent.trim() ?? "Note", paragraphs: paragraphsOf(el, label, at) };
  }
  if (is("aside.discarded")) return { kind: "discarded", paragraphs: paragraphsOf(el, el.querySelector(":scope > .discarded-label"), at) };
  if (is("div.assumption")) return { kind: "assumption", paragraphs: paragraphsOf(el, el.querySelector(":scope > .decision-label"), at) };
  if (is("details.decision")) return readDecision(el, at);
  if (is("figure.diff")) return readDiff(el, at);
  if (is("figure.example")) {
    const script = el.querySelector(":scope > script");
    if (!script || !el.getAttribute("data-lang")) throw new SummaryError(`${at}: un ejemplo lleva data-lang y su <script>`);
    return { kind: "example", lang: el.getAttribute("data-lang"), code: codeOf(script) };
  }
  if (is("div.chart")) return { kind: "chart", ...readChart(el, at) };
  if (is("div.chart-pair")) {
    const halves = [...el.children];
    if (halves.length !== 2) throw new SummaryError(`${at}: .chart-pair lleva dos <div>`);
    const [before, now] = halves.map((half, n) => {
      const label = half.querySelector(":scope > p.lede");
      const chart = half.querySelector(":scope > .chart");
      if (!label || !chart) throw new SummaryError(`${at}: la mitad ${n + 1} de .chart-pair lleva <p class="lede"> y su .chart`);
      return { label: label.innerHTML, ...readChart(chart, at) };
    });
    return { kind: "chart-pair", before, now };
  }
  if (is("div.tests")) return readTests(el, at);
  if (isCatalog(el)) throw new SummaryError(`${at}: ${describe(el)} no es un bloque de la plantilla ni un bloque libre`);
  return { kind: "freeform", html: el.outerHTML };
}

/** The <p>s of an aside or box, after its label; anything else in it is an error. */
function paragraphsOf(el, label, at) {
  const rest = [...el.children].filter((c) => c !== label);
  if (!rest.length || rest.some((c) => c.localName !== "p")) throw new SummaryError(`${at}: ${describe(el)} lleva solo <p> después de su etiqueta`);
  return rest.map((p) => p.innerHTML);
}

function readDecision(el, at) {
  const title = el.querySelector(":scope > summary .decision-title");
  const body = el.querySelector(":scope > .decision-body");
  const why = body?.querySelector(":scope > .decision-why");
  const cost = body?.querySelector(":scope > .decision-cost");
  if (!title || !why || !cost) throw new SummaryError(`${at}: una decisión lleva título, .decision-why y .decision-cost`);
  if (el.hasAttribute("open")) throw new SummaryError(`${at}: una decisión empieza cerrada (sin open)`);
  const origin = el.querySelector(":scope > summary .decision-origin")?.textContent.trim() ?? null;
  const slack = el.querySelector(":scope > summary .decision-slack")?.getAttribute("href") ?? null;
  const discarded = [];
  for (const child of body.children) {
    if (child === why || child === cost) continue;
    if (!child.matches("aside.discarded")) throw new SummaryError(`${at}: en una decisión, después del trade-off solo van ideas descartadas`);
    discarded.push(paragraphsOf(child, child.querySelector(":scope > .discarded-label"), at));
  }
  const costText = [...cost.children].find((c) => !c.classList.contains("decision-label"));
  return {
    kind: "decision",
    title: title.innerHTML,
    origin: origin ? origin.toLowerCase() : null,
    slack,
    why: why.innerHTML,
    cost: costText?.innerHTML ?? "",
    discarded,
  };
}

function readDiff(el, at) {
  const path = el.getAttribute("data-path");
  const line = el.getAttribute("data-line");
  const lang = el.getAttribute("data-lang");
  if (!path || !line || !lang) throw new SummaryError(`${at}: un diff lleva data-path, data-line y data-lang`);
  const old = el.querySelector(":scope > script.old");
  const neu = el.querySelector(":scope > script.new");
  if (!old && !neu) throw new SummaryError(`${at}: el diff de ${path} no tiene código`);
  const threads = [...el.querySelectorAll(":scope > .thread")].map((thread) => ({
    side: thread.getAttribute("data-side"),
    line: Number(thread.getAttribute("data-line")),
    comments: [...thread.querySelectorAll(":scope > .comment")].map((c) => ({
      author: c.getAttribute("data-author"),
      href: c.getAttribute("data-href"),
      markdown: c.querySelector(':scope > script[type="text/markdown"]')?.textContent.trim() ?? "",
    })),
  }));
  const extra = [...el.children].filter((c) => c !== old && c !== neu && !c.classList.contains("thread"));
  if (extra.length) throw new SummaryError(`${at}: el diff de ${path} tiene ${describe(extra[0])} de más`);
  return {
    kind: "diff",
    path,
    line: Number(line),
    lang,
    name: el.getAttribute("data-name"),
    old: old ? codeOf(old) : null,
    new: neu ? codeOf(neu) : null,
    threads,
  };
}

function readChart(el, at) {
  const dot = el.querySelector(":scope > script.dot");
  if (!dot) throw new SummaryError(`${at}: un .chart lleva <script class="dot">`);
  let links = {};
  try {
    links = JSON.parse(el.getAttribute("data-links") ?? "{}");
  } catch (error) {
    throw new SummaryError(`${at}: data-links no es JSON (${error.message})`);
  }
  return { dot: codeOf(dot), links };
}

function readTests(el, at) {
  const files = [...el.children].map((file) => {
    const path = file.getAttribute("data-path");
    if (!path) throw new SummaryError(`${at}: cada archivo de .tests lleva data-path`);
    const list = file.querySelector(":scope > ul");
    const table = file.querySelector(":scope > table");
    if (table) return { path, table: table.outerHTML, tests: [...table.querySelectorAll("td[data-line]")].map(readTest) };
    if (!list) throw new SummaryError(`${at}: el archivo ${path} de .tests no tiene <ul> ni <table>`);
    return { path, items: readTestItems(list, at) };
  });
  return { kind: "tests", files };
}

/** The tests of a list: a test, a describe group (with its name) or the cases of one test. */
function readTestItems(list, at) {
  return [...list.children].map((li) => {
    if (li.classList.contains("describe")) {
      const name = li.querySelector(":scope > .describe-name");
      const inner = li.querySelector(":scope > ul");
      if (!name || !inner) throw new SummaryError(`${at}: un grupo describe lleva .describe-name y su <ul>`);
      return { group: "describe", name: name.innerHTML, items: readTestItems(inner, at) };
    }
    if (li.classList.contains("cases")) {
      const inner = li.querySelector(":scope > ul");
      if (!inner) throw new SummaryError(`${at}: un grupo de casos lleva su <ul>`);
      return { group: "cases", items: readTestItems(inner, at) };
    }
    if (!li.hasAttribute("data-line")) throw new SummaryError(`${at}: un test lleva data-line`);
    return readTest(li);
  });
}

function readTest(el) {
  return {
    line: Number(el.getAttribute("data-line")),
    change: el.getAttribute("data-change"),
    renamedFrom: el.getAttribute("data-renamed-from"),
    name: el.innerHTML.trim(),
  };
}

/** The code of a <script>, as the template reads it: without the first newline and the trailing space. */
export function codeOf(script) {
  return script.textContent.replace(/^\n/, "").replace(/\s+$/, "");
}

function describe(el) {
  return `<${el.localName}${el.className ? ` class="${el.className}"` : ""}>`;
}
