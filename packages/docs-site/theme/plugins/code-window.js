// Puts each code block of the page in the landing's window: a bar on top with the language and a
// copy button. The bar never changes, so it is plain DOM; the button keeps a little state ("Copied")
// so it is a Preact component, one per block, taken down before the next page is drawn.
import { render } from "preact";
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
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
        const title = lang in labels ? labels[lang] : lang;
        const name = document.createElement("span");
        name.textContent = title;
        const slot = document.createElement("span");
        bar.append(name, slot);
        const frame = document.createElement("figure");
        frame.className = "window";
        pre.replaceWith(frame);
        frame.append(bar, pre);
        const copyLabel = title ? `Copy ${title}` : lang ? `Copy ${lang}` : "Copy code";
        render(html`<${CopyButton} pre=${pre} label=${copyLabel} />`, slot);
        mounted.push(slot);
      }
    });
  };
}

function CopyButton({ pre, label }) {
  const host = useRef(null);
  const [said, say] = useState("Copy");
  useLayoutEffect(() => {
    if (host.current) host.current.text = pre.textContent;
  }, [pre]);
  useEffect(() => {
    if (said === "Copy") return;
    const back = setTimeout(() => say("Copy"), 1600);
    return () => clearTimeout(back);
  }, [said]);
  // Si el sitio usa el tema sin plugins/ui-sdk.js, el clic sigue copiando igual.
  const copy = () => {
    if (typeof customElements !== "undefined" && customElements.get("as-copy-button")) return;
    navigator.clipboard.writeText(pre.textContent).then(
      () => say("Copied"),
      () => say("Copy failed"),
    );
  };
  const copied = said === "Copied" || undefined;
  return html`
    <as-copy-button ref=${host}>
      <button type="button" class="copy-button" aria-label=${label} onClick=${copy} aria-live="polite" data-copied=${copied}>
        ${said}
      </button>
    </as-copy-button>
  `;
}
