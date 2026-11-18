// "On this page": the headings of the open page in a column on the right, with the one the reader
// is at marked, like react.dev. The theme shows it on wide screens only. It is a Preact component
// that reads the store, so it redraws by itself when the page or the heading changes.
import { render } from "preact";
import { useEffect } from "preact/hooks";
import { html } from "htm/preact";
import { activeHeading, headings, readPage } from "../store.js";

/**
 * @param {object} [options]
 * @param {string} [options.title] the title over the list
 */
export function onThisPage({ title = "On this page" } = {}) {
  return (hook, vm) => {
    hook.mounted(() => {
      // Next to the article, not inside it: Docsify replaces the article on every page, and this
      // box stays.
      const box = document.createElement("aside");
      box.className = "on-this-page";
      document.querySelector("main").append(box);
      render(html`<${OnThisPage} title=${title} />`, box);
    });
    hook.doneEach(() => {
      readPage(vm);
    });
  };
}

function OnThisPage({ title }) {
  const list = headings.value;
  useEffect(() => followScroll(list), [list]);
  if (list.length === 0) return null;
  return html`
    <nav aria-labelledby="on-this-page-title">
      <h2 id="on-this-page-title">${title}</h2>
      <ul>
        ${list.map((h) =>
          html`
            <li key=${h.id} class=${`depth-${h.depth}`}>
              <a href=${h.href} aria-current=${h.id === activeHeading.value
                ? "location"
                : undefined}>
                ${h.text}
              </a>
            </li>
          `
        )}
      </ul>
    </nav>
  `;
}

/** Keeps the active heading on the last one that went past the top of the window while the reader
 *  scrolls. Returns the function that stops it, which Preact calls when the page changes. */
function followScroll(list) {
  let frame = 0;
  const update = () => {
    frame = 0;
    const line = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) + 16;
    const atBottom = innerHeight + scrollY >= document.documentElement.scrollHeight - 2;
    let current = list[0]?.id ?? "";
    for (const { id } of list) {
      const el = document.getElementById(id);
      if (el && (atBottom || el.getBoundingClientRect().top <= line)) current = id;
    }
    activeHeading.value = current;
  };
  const onScroll = () => {
    frame ||= requestAnimationFrame(update);
  };
  addEventListener("scroll", onScroll, { passive: true });
  update();
  return () => {
    removeEventListener("scroll", onScroll);
    cancelAnimationFrame(frame);
  };
}
