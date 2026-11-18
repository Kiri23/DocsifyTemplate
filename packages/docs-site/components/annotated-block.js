// A code block with numbered notes on its parts (from prompt-bench's leaderboard v1). The Markdown
// is a code block and, under it, a numbered list whose items start with a piece of the block in
// backticks: that piece gets a number in the block, and pointing at one lights up the other.
//
//   <!-- as: annotated-block -->
//   ```
//   labels      100±0     +100%
//   ```
//   1. `100±0`: the mean ± the spread of the runs
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { html } from "htm/preact";
import { sequence, ShapeError } from "../as/shapes.js";

export const annotatedBlock = {
  name: "annotated-block",
  takes: sequence("pre", "ol"),
  attrs: [],
  read([pre, ol]) {
    const text = pre.textContent;
    const items = [...ol.children].filter((li) => li.localName === "li");
    if (!items.length) throw new ShapeError("la lista numerada está vacía");
    let from = 0;
    const notes = items.map((li, i) => {
      const box = li.firstElementChild?.localName === "p" ? li.firstElementChild : li;
      const code = box.firstElementChild;
      const before = code ? textBefore(box, code) : box.textContent;
      if (!code || code.localName !== "code" || before.trim()) {
        throw new ShapeError(`el punto ${i + 1} de la lista no empieza con un \`trozo\` del bloque`);
      }
      const mark = code.textContent;
      // Each piece is looked for after the one before it, so the list reads in the block's order
      // and two notes can name the same text in different places.
      let at = text.indexOf(mark, from);
      if (at === -1) at = text.indexOf(mark);
      if (at === -1) throw new ShapeError(`\`${mark}\` (punto ${i + 1}) no está en el bloque de código`);
      from = at + mark.length;
      const note = li.cloneNode(true);
      const noteBox = note.firstElementChild?.localName === "p" ? note.firstElementChild : note;
      noteBox.firstElementChild.remove();
      const first = noteBox.firstChild;
      if (first?.nodeType === 3) first.data = first.data.replace(/^\s*[:—–-]\s*/, "");
      return { n: i + 1, mark, at, note: noteBox.innerHTML };
    });
    return { pre, notes };
  },
  view: AnnotatedBlock,
};

let blocks = 0;

function AnnotatedBlock({ pre, notes }) {
  const slot = useRef(null);
  const hits = useRef([]);
  const [lit, setLit] = useState(0);
  const [id] = useState(() => `as-ab-${++blocks}`);

  // Synchronous, inside Docsify's doneEach: the plugins after this one (codeWindow) find the block.
  useLayoutEffect(() => {
    slot.current.append(pre);
    hits.current = notes.map(({ n, mark, at }) => {
      const hit = document.createElement("span");
      hit.className = "as-hit";
      hit.dataset.n = String(n);
      hit.tabIndex = 0;
      hit.setAttribute("aria-describedby", `${id}-${n}`);
      wrapText(pre, at, at + mark.length, hit);
      hit.addEventListener("mouseenter", () => setLit(n));
      hit.addEventListener("mouseleave", () => setLit(0));
      hit.addEventListener("focus", () => setLit(n));
      hit.addEventListener("blur", () => setLit(0));
      hit.addEventListener("click", () => setLit((now) => (now === n ? 0 : n)));
      return hit;
    });
  }, []);

  useEffect(() => {
    for (const hit of hits.current) hit.classList.toggle("on", Number(hit.dataset.n) === lit);
  }, [lit]);

  return html`
    <div class="as-ab-layout">
      <div class="as-ab-code" ref=${slot}></div>
      <ol class="as-ab-notes">
        ${notes.map(({ n, note }) => html`
          <li key=${n} id=${`${id}-${n}`} class=${lit === n ? "on" : undefined}
            onMouseEnter=${() => setLit(n)} onMouseLeave=${() => setLit(0)}>
            <span class="as-ab-num" aria-hidden="true">${n}</span>
            <span dangerouslySetInnerHTML=${{ __html: note }}></span>
          </li>
        `)}
      </ol>
    </div>
  `;
}

/** The text of a box that comes before one of its children. */
function textBefore(box, child) {
  let text = "";
  for (const n of box.childNodes) {
    if (n === child) break;
    text += n.textContent;
  }
  return text;
}

/** Wraps the characters from `start` to `end` of an element's text in `wrapper`, even when the
 *  highlighter split them across several spans. */
function wrapText(root, start, end, wrapper) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let pos = 0;
  let started = false;
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const len = node.data.length;
    if (!started && start < pos + len) {
      range.setStart(node, start - pos);
      started = true;
    }
    if (started && end <= pos + len) {
      range.setEnd(node, end - pos);
      break;
    }
    pos += len;
  }
  wrapper.append(range.extractContents());
  range.insertNode(wrapper);
}
