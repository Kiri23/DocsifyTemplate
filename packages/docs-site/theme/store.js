// The state the plugins share: which page is open and what is on it. Plain signals at module level,
// so they outlive a change of page; each plugin reads the ones it needs.
import { batch, signal } from "@preact/signals";

/** The page on screen, like "/tutorial/getting-started" (see pathOf). */
export const route = signal("");

/** The headings of that page, in order: { id, text, depth, href }. */
export const headings = signal([]);

/** The id of the heading the reader is at. "On this page" keeps it up to date. */
export const activeHeading = signal("");

/** The pages of the sidebar, in its order: { href, path, title }. */
export const pages = signal([]);

/** Reads the page Docsify just drew into the signals. Every plugin that needs them calls it after a
 *  render: it does the same thing each time, so no plugin depends on another being there. */
export function readPage(vm) {
  const path = pathOf(vm.route.path);
  const found = [...document.querySelectorAll("#main :is(h2, h3)[id]")].map((h) => ({
    id: h.id,
    text: h.textContent.trim(),
    depth: Number(h.tagName[1]),
    href: vm.router.toURL(vm.route.path, { id: h.id }),
  }));
  const listed = [...document.querySelectorAll(".sidebar-nav a.page-link[href]")].map((a) => ({
    href: a.getAttribute("href"),
    path: pathOf(a.getAttribute("href")),
    title: a.textContent.trim(),
  }));
  batch(() => {
    if (route.value !== path) activeHeading.value = found[0]?.id ?? "";
    route.value = path;
    if (!sameList(headings.value, found)) headings.value = found;
    if (!sameList(pages.value, listed)) pages.value = listed;
  });
}

/** One name for one page: the sidebar links to "#/vocabulary/README" and Docsify's route for it is
 *  "/vocabulary/"; both become "/vocabulary/". */
export function pathOf(link) {
  return link.replace(/^#/, "").split("?")[0].replace(/README$/, "");
}

/** Whether two lists say the same thing: a new list equal to the old one is not stored, so nothing
 *  redraws for nothing. */
function sameList(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
