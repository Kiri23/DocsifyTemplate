// The links to the previous and the next page at the end of each page, in the order of
// _sidebar.md, like react.dev. A Preact component that reads the store: it redraws by itself when
// the page changes.
import { render } from "preact";
import { html } from "htm/preact";
import { pages, readPage, route } from "../store.js";

/**
 * @param {object} [options]
 * @param {string} [options.previous] the word over the link back
 * @param {string} [options.next] the word over the link forward
 */
export function prevNext({ previous = "Previous", next = "Next" } = {}) {
  return (hook, vm) => {
    hook.mounted(() => {
      // After the article, not inside it: Docsify replaces the article on every page, and this
      // box stays.
      const box = document.createElement("nav");
      box.className = "prev-next";
      box.setAttribute("aria-label", `${previous} and ${next.toLowerCase()} page`);
      document.querySelector("main > .content").append(box);
      render(html`<${PrevNext} previous=${previous} next=${next} />`, box);
    });
    hook.doneEach(() => {
      readPage(vm);
    });
  };
}

function PrevNext({ previous, next }) {
  const list = pages.value;
  const i = list.findIndex((page) => page.path === route.value);
  if (i === -1) return null;
  return html`${link("prev", list[i - 1], previous)}${link("next", list[i + 1], next)}`;
}

/** One of the two links, or nothing at the first and the last page. */
function link(rel, page, word) {
  if (!page) return null;
  return html`
    <a class=${rel} href=${page.href}
      rel=${rel}><small>${word}</small><span>${page.title}</span></a>
  `;
}
