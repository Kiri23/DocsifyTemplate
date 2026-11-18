// Puts each code block of the page in the landing's window: a bar on top with the language and a
// copy button. The bar never changes, so it is plain DOM; the button keeps a little state ("Copied")
// so it is a Preact component, one per block, taken down before the next page is drawn.
import { render } from "preact";
import { useEffect, useState } from "preact/hooks";
import { html } from "htm/preact";

/**
 * @param {object} [options]
 * @param {Record<string, string>} [options.labels] the name to show for a language; a language
 *   left out shows as it is written after the ``` of the block, and an empty name shows nothing
 */
export function codeWindow({ labels = { markup: "" } } = {}) {
  return (hook) => {
    const mounted = [];
    const takeDown = () => {
      for (const slot of mounted.splice(0)) render(null, slot);
    };

    hook.beforeEach(() => {
      takeDown();
    });

    hook.doneEach(() => {
      takeDown();
      for (const pre of document.querySelectorAll("#main pre[data-lang]")) {
        if (pre.parentElement.classList.contains("window")) continue;
        const lang = pre.dataset.lang;
        const bar = document.createElement("figcaption");
        bar.className = "window-bar";
        const name = document.createElement("span");
        name.textContent = lang in labels ? labels[lang] : lang;
        const slot = document.createElement("span");
        bar.append(name, slot);
        const frame = document.createElement("figure");
        frame.className = "window";
        pre.replaceWith(frame);
        frame.append(bar, pre);
        render(html`<${CopyButton} pre=${pre} />`, slot);
        mounted.push(slot);
      }
    });
  };
}

function CopyButton({ pre }) {
  const [said, say] = useState("Copy");
  useEffect(() => {
    if (said === "Copy") return;
    const back = setTimeout(() => say("Copy"), 1600);
    return () => clearTimeout(back);
  }, [said]);
  const copy = () =>
    navigator.clipboard.writeText(pre.textContent).then(
      () => say("Copied"),
      () => say("Copy failed"),
    );
  const copied = said === "Copied" || undefined;
  return html`
    <button class="copy-button" onClick=${copy} aria-live="polite" data-copied=${copied}>
      ${said}
    </button>
  `;
}
