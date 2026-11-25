// A diff of a PR summary: the shortened old and new code of one place, with the review threads on
// its lines. It shows a plain unified view at once, and the diff viewer of summarize-pr
// (@pierre/diffs) when it loads, split or unified as the header's control says. The code between
// `//{` and `//}` hides behind a UI SDK collapsible, so an agent can open it too.
//
//   <!-- as: diff path="site.js" line="93" lang="javascript" href="https://github.com/…" -->
//   ```javascript
//   (old code)
//   ```
//   ```javascript
//   (new code)
//   ```
//
//   - new:6 · [@login](https://github.com/…#discussion_r1)
//     ```markdown
//     (the comment)
//     ```
//
// `only="new"` (or "old") says the diff has one side: a new or a deleted file.
import { html } from "htm/preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { sequence, ShapeError } from "../../as/shapes.js";
import { codeBlock } from "./read.js";
import { EXPANDER, PAGE_COMMENT_TITLE, readSide, rowsOf } from "./code-lines.js";
import { diffStyle } from "./diff-style.js";
import { commentHtml } from "./comments.js";

const THREAD = /^(old|new):(\d+) · @(\S+)$/;
const EXPANDER_TITLE = "Show the code around the changes in this file";

export const diff = {
  name: "diff",
  takes: sequence("pre", "pre?", "ul?"),
  attrs: ["path", "line", "lang", "name", "only", "href"],
  read({ nodes, attrs }) {
    for (const needed of ["path", "line", "lang", "href"]) {
      if (!attrs[needed]) throw new ShapeError(`diff: falta ${needed}="…" en la marca`);
    }
    const blocks = nodes.filter((n) => n.localName === "pre").map((pre) => codeBlock(pre, "diff").code);
    const list = nodes.find((n) => n.localName === "ul");
    if (attrs.only && blocks.length !== 1) throw new ShapeError(`diff: only="${attrs.only}" lleva un solo bloque de código`);
    if (!attrs.only && blocks.length !== 2) throw new ShapeError("diff: lleva dos bloques de código (el viejo y el nuevo) o only=\"new\"/\"old\"");
    const [old, neu] = attrs.only === "new" ? [null, blocks[0]] : attrs.only === "old" ? [blocks[0], null] : blocks;
    return {
      path: attrs.path,
      line: Number(attrs.line),
      lang: attrs.lang,
      name: attrs.name ?? null,
      href: attrs.href,
      old,
      new: neu,
      threads: list ? readThreads(list) : [],
    };
  },
  view: Diff,
};

/** The comments under the code, joined into threads: one per line that has comments. */
function readThreads(list) {
  const threads = [];
  for (const [i, li] of [...list.children].entries()) {
    const link = li.querySelector(":scope > a, :scope > p > a");
    const pre = li.querySelector(":scope > pre");
    const said = THREAD.exec(`${li.firstChild?.textContent ?? ""}${link?.textContent ?? ""}`.replace(/\s+/g, " ").trim());
    if (!said || !pre) throw new ShapeError(`diff: el comentario ${i + 1} va como "- new:6 · [@autor](link)" y su bloque markdown`);
    const comment = { author: said[3], href: link.getAttribute("href"), markdown: codeBlock(pre, "diff").code };
    const last = threads.at(-1);
    if (last && last.side === said[1] && last.line === Number(said[2])) last.comments.push(comment);
    else threads.push({ side: said[1], line: Number(said[2]), comments: [comment] });
  }
  return threads;
}

function Diff({ path, lang, name, href, old, new: neu, threads }) {
  const shown = name ?? path;
  const repo = href.split("/pull/")[0];
  const hidden = toHidden(old, neu);
  const code = (expanded) => html`<${CodeView} lang=${lang} oldCode=${old} newCode=${neu} threads=${threads}
    expanded=${expanded} repo=${repo} name=${shown} />`;
  return html`<figure class="pr-diff" data-path=${path} data-sides=${old !== null && neu !== null ? 2 : 1}>
    <figcaption class="pr-diff-head">
      <span class="pr-diff-name">${shown}</span>
      <a class="pr-diff-link" href=${href} target="_blank" rel="noopener" title="Open on GitHub" aria-label=${`Open ${shown} on GitHub`}>↗</a>
    </figcaption>
    ${hidden ? html`<ui-collapsible class="pr-hidden">
      <ui-collapsible-trigger>
        <button type="button" aria-expanded="false" title=${EXPANDER_TITLE}>${`Hidden code of ${shown} (${hidden} lines)`}</button>
      </ui-collapsible-trigger>
      <ui-collapsible-panel hidden>${code(true)}</ui-collapsible-panel>
    </ui-collapsible>` : null}
    <div class="pr-code-shown">${code(false)}</div>
  </figure>`;
}

/** How many lines the diff hides, or 0. */
function toHidden(old, neu) {
  const side = readSide(neu ?? old);
  const rows = side.text.split("\n").filter((l) => EXPANDER.test(l.trim()));
  return rows.reduce((sum, row) => sum + Number(/(\d+)/.exec(row)[1]), 0);
}

/** The space before each line of code. The theme widens it with `--pr-code-inset` on a phone, where
 * the code window goes edge to edge and its code has to line up with the text of the page. */
const INSET = "[data-line] { padding-inline-start: calc(1ch + var(--pr-code-inset, 0px)); }";

let viewer = null;

/** @pierre/diffs, loaded once for the whole page. */
function loadViewer() {
  viewer ??= import("@pierre/diffs");
  return viewer;
}

/**
 * The code of a diff or an example: the plain view, then the diff viewer over it when it loads.
 * Without old code and without threads it is a code example (no header, one file).
 */
export function CodeView({ lang, oldCode = null, newCode, threads = [], expanded = false, repo = "", name = "example" }) {
  const box = useRef(null);
  const instance = useRef(null);
  const [upgraded, setUpgraded] = useState(false);
  const oldSide = readSide(oldCode);
  const newSide = readSide(newCode);
  const style = diffStyle.value;
  const isExample = oldCode === null && !threads.length && name === "example";

  useEffect(() => {
    let gone = false;
    loadViewer().then(({ File, FileDiff }) => {
      if (gone || !box.current) return;
      const theme = { dark: "pierre-dark", light: "pierre-light" };
      const comments = new Set([...oldSide.pageComments, ...newSide.pageComments]);
      if (isExample) {
        instance.current = new File({ theme, themeType: "dark", overflow: "wrap", disableFileHeader: true, disableLineNumbers: true, unsafeCSS: INSET });
        instance.current.render({ file: { name, lang, contents: newSide.text }, containerWrapper: box.current });
      } else {
        instance.current = new FileDiff({
          theme,
          themeType: "dark",
          diffStyle: diffStyle.peek(),
          overflow: "wrap",
          expandUnchanged: true,
          hunkSeparators: "simple",
          // The code here is shortened, so the real line numbers would mislead.
          disableLineNumbers: true,
          disableFileHeader: true,
          // As GitHub's "Hide whitespace": a line that only changes its indentation is unchanged.
          parseDiffOptions: { ignoreWhitespace: true },
          renderAnnotation: (annotation) => threadElement(annotation.metadata, repo),
          unsafeCSS: `${INSET}
            [data-page-comment] { cursor: help; }
            [data-page-comment] span { color: color-mix(in srgb, var(--amber) 55%, var(--text-dim)) !important; }
            [data-expander] { cursor: pointer; }
            [data-expander] span { color: var(--amber) !important; }`,
          onPostRender: (node) => markLines(node.shadowRoot, { comments, expanded, figure: box.current }),
        });
        instance.current.render({
          oldFile: { name, lang, contents: expanded ? oldSide.expandedText : oldSide.text },
          newFile: { name, lang, contents: expanded ? newSide.expandedText : newSide.text },
          lineAnnotations: threads.map((thread) => ({
            side: thread.side === "old" ? "deletions" : "additions",
            lineNumber: expanded ? (thread.side === "old" ? oldSide : newSide).expandedLineOf[thread.line - 1] : thread.line,
            metadata: thread,
          })),
          containerWrapper: box.current,
        });
      }
      if (box.current.childElementCount > 0) setUpgraded(true);
    }).catch((error) => console.warn("pr: el visor de diffs no cargó; la página muestra el diff simple.", error));
    return () => {
      gone = true;
      instance.current?.cleanUp?.();
    };
  }, []);

  useEffect(() => {
    const current = instance.current;
    if (!current || isExample || current.options.diffStyle === style) return;
    current.setOptions({ ...current.options, diffStyle: style });
    current.rerender();
  }, [style]);

  return html`<div class=${`pr-code${upgraded ? " upgraded" : ""}`} data-style=${isExample ? null : style}>
    <div class="pr-fallback" onClick=${openHidden} onKeyDown=${openHidden}>
      <pre>${isExample
        ? newSide.text
        : fallbackRows({ oldSide, newSide, threads, expanded, repo })}</pre>
    </div>
    <div class="pr-pierre" ref=${box}></div>
  </div>`;
}

/** The rows of the plain view, each thread under its line. */
function fallbackRows({ oldSide, newSide, threads, expanded, repo }) {
  const numbers = { old: 0, new: 0 };
  const comments = new Set([...oldSide.pageComments, ...newSide.pageComments]);
  const at = (thread) => expanded ? (thread.side === "old" ? oldSide : newSide).expandedLineOf[thread.line - 1] : thread.line;
  return rowsOf(oldSide, newSide, expanded).map((row) => {
    if (row.kind !== "add") numbers.old++;
    if (row.kind !== "del") numbers.new++;
    const text = row.text.trim();
    const isExpander = !expanded && row.kind === "same" && EXPANDER.test(text);
    const onLine = threads.filter((t) => (t.side === "old" ? row.kind !== "add" : row.kind !== "del") && numbers[t.side] === at(t));
    return html`<span class=${`row ${row.kind}${comments.has(text) ? " page-comment" : ""}${isExpander ? " expander" : ""}`}
        title=${comments.has(text) ? PAGE_COMMENT_TITLE : isExpander ? EXPANDER_TITLE : null}
        tabIndex=${isExpander ? 0 : null} role=${isExpander ? "button" : null}>${row.text === "" ? " " : row.text}</span>${
      onLine.map((thread) => html`<${Thread} thread=${thread} repo=${repo} />`)}`;
  });
}

/** A click or Enter on a `// ▸ n more lines` row opens the hidden code, as the collapsible does. */
function openHidden(event) {
  if (event.type === "keydown" && event.key !== "Enter" && event.key !== " ") return;
  const row = event.composedPath?.().find((n) => n.classList?.contains("expander") || n.dataset?.expander === "");
  if (!row) return;
  event.preventDefault();
  event.currentTarget.closest(".pr-diff")?.querySelector(".pr-hidden > ui-collapsible-trigger > button")?.click();
}

/** Marks the page comments and the hidden-code rows that the diff viewer drew in its shadow root. */
function markLines(root, { comments, expanded, figure }) {
  for (const line of root?.querySelectorAll("[data-line-type]") ?? []) {
    const text = line.textContent.trim();
    if (comments.has(text)) {
      line.dataset.pageComment = "";
      line.title = PAGE_COMMENT_TITLE;
    }
    if (!expanded && EXPANDER.test(text)) {
      line.dataset.expander = "";
      line.title = EXPANDER_TITLE;
      line.tabIndex = 0;
      line.setAttribute("role", "button");
    }
  }
  if (root && !root.prListeners) {
    root.prListeners = true;
    const fallback = figure.closest(".pr-code").querySelector(".pr-fallback");
    for (const type of ["click", "keydown"]) {
      root.addEventListener(type, (event) => openHidden({ ...event, type, key: event.key, composedPath: () => event.composedPath(), preventDefault: () => event.preventDefault(), currentTarget: fallback }));
    }
  }
}

function Thread({ thread, repo }) {
  return html`<div class="pr-thread" data-side=${thread.side} data-line=${thread.line}>
    ${thread.comments.map((c) => html`<div class="pr-comment">
      <a class="pr-comment-author" href=${c.href} target="_blank" rel="noopener">
        <img class="pr-comment-avatar" src=${`https://github.com/${c.author.replace(/\[bot\]$/, "")}.png?size=40`} alt="" data-bot=${c.author.endsWith("[bot]") ? "" : null} />
        ${c.author} ↗
      </a>
      <div class="pr-comment-body" dangerouslySetInnerHTML=${{ __html: commentHtml(c.markdown, repo) }} />
    </div>`)}
  </div>`;
}

/** The same thread as a plain element, for the diff viewer, which draws outside Preact. */
function threadElement(thread, repo) {
  const box = document.createElement("div");
  box.className = "pr-thread";
  for (const c of thread.comments) {
    const comment = document.createElement("div");
    comment.className = "pr-comment";
    const author = document.createElement("a");
    author.className = "pr-comment-author";
    Object.assign(author, { href: c.href, target: "_blank", rel: "noopener", textContent: `${c.author} ↗` });
    const body = document.createElement("div");
    body.className = "pr-comment-body";
    body.innerHTML = commentHtml(c.markdown, repo);
    comment.append(author, body);
    box.append(comment);
  }
  return box;
}
