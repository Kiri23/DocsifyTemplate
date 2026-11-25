// Whether the diffs of a PR summary show side by side (split) or in one column (unified). The
// control in the header (pr-header.js) sets it and every diff (diff.js) follows it. On a narrow
// screen the diffs are unified and the control hides; the reader's choice stays for a wider one.
import { computed, signal } from "@preact/signals";

const KEY = "diffStyle";
const narrowQuery = typeof matchMedia === "function" ? matchMedia("(max-width: 860px)") : null;

function saved() {
  try {
    return localStorage.getItem(KEY) === "unified" ? "unified" : "split";
  } catch {
    return "split";
  }
}

/** What the reader chose. */
export const chosenStyle = signal(typeof localStorage === "undefined" ? "split" : saved());
/** Whether the window is as narrow as a phone. */
export const narrow = signal(narrowQuery?.matches ?? false);
narrowQuery?.addEventListener("change", (e) => (narrow.value = e.matches));
/** What the diffs show now. */
export const diffStyle = computed(() => (narrow.value ? "unified" : chosenStyle.value));

/** Keeps the reader's choice for the next visit. */
export function choose(style) {
  chosenStyle.value = style === "unified" ? "unified" : "split";
  try {
    localStorage.setItem(KEY, chosenStyle.value);
  } catch {
    // A browser without storage still follows the choice on this page.
  }
}
