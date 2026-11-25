// A decision of a PR: a choice that shapes it and that a reviewer can want done differently. It
// starts closed, as in summarize-pr; opening it shows why, the trade-off and the ideas it dropped.
// The view is a UI SDK accordion, so an agent on the page sees it and can open it.
//
//   <!-- as: decision origin="implicit" slack="https://…" -->
//   **The namespace comes from the glossary's title**
//
//   - **Why:** each repo gets its own namespace.
//   - **Trade-off:** MyClaudeSkills keeps its old one.
//   - **Discarded idea:** a converter from the .ttl.
import { html } from "htm/preact";
import { sequence, ShapeError } from "../../as/shapes.js";
import { itemHtml } from "./read.js";

const FIELDS = ["Why", "Trade-off", "Discarded idea"];
let decisions = 0;

export const decision = {
  name: "decision",
  takes: sequence("p", "ul"),
  attrs: ["origin", "slack"],
  read({ nodes: [title, list], attrs }) {
    const strong = title.querySelector(":scope > strong");
    if (!strong || title.textContent.trim() !== strong.textContent.trim()) {
      throw new ShapeError("decision: el título va en negrita, solo, en el párrafo de la marca");
    }
    if (attrs.origin && attrs.origin !== "implicit") throw new ShapeError(`decision: origin="${attrs.origin}"; el único que hay es "implicit"`);
    const fields = { Why: [], "Trade-off": [], "Discarded idea": [] };
    for (const [i, li] of [...list.children].entries()) {
      const label = li.querySelector(":scope > strong, :scope > p:first-child > strong");
      const name = label?.textContent.replace(/:$/, "").trim();
      if (!FIELDS.includes(name)) throw new ShapeError(`decision: el punto ${i + 1} empieza con **Why:**, **Trade-off:** o **Discarded idea:**`);
      const copy = li.cloneNode(true);
      copy.querySelector(":scope > strong, :scope > p:first-child > strong").remove();
      const paragraphs = copy.querySelector(":scope > p")
        ? [...copy.querySelectorAll(":scope > p")].map((p) => p.innerHTML.trim())
        : [itemHtml(copy)];
      fields[name].push(paragraphs.map((p) => p.trim()));
    }
    if (fields.Why.length !== 1 || fields["Trade-off"].length !== 1) throw new ShapeError("decision: lleva un **Why:** y un **Trade-off:**");
    return {
      title: strong.innerHTML.trim(),
      label: strong.textContent.replace(/\s+/g, " ").trim(),
      implicit: attrs.origin === "implicit",
      slack: attrs.slack ?? null,
      why: fields.Why[0][0],
      cost: fields["Trade-off"][0][0],
      discarded: fields["Discarded idea"],
    };
  },
  view: Decision,
};

function Decision({ title, label, implicit, slack, why, cost, discarded }) {
  const id = `pr-decision-${++decisions}`;
  return html`<ui-accordion class="pr-decision" aria-label=${label}>
    <ui-accordion-item value="open">
      <ui-accordion-header>
        <h4 class="pr-decision-head">
          <ui-accordion-trigger>
            <button type="button" aria-expanded="false" aria-controls=${id}>
              <span class="pr-label">Decision</span>
              <span class="pr-decision-title" dangerouslySetInnerHTML=${{ __html: title }} />
              ${implicit && html`<span class="pr-decision-origin" title="Made while implementing, without being discussed.">Implicit</span>`}
              <span class="pr-decision-arrow" aria-hidden="true"></span>
            </button>
          </ui-accordion-trigger>
          ${slack && html`<a class="pr-decision-slack" href=${slack} target="_blank" rel="noopener" title="Slack discussion" aria-label="Slack discussion">Slack ↗</a>`}
        </h4>
      </ui-accordion-header>
      <ui-accordion-panel id=${id} hidden>
        <p class="pr-decision-why" dangerouslySetInnerHTML=${{ __html: why }} />
        <p class="pr-decision-cost"><span class="pr-label">Trade-off</span><span dangerouslySetInnerHTML=${{ __html: cost }} /></p>
        ${discarded.map((paragraphs) => html`<aside class="pr-discarded">
          <div class="pr-label">Discarded idea</div>
          ${paragraphs.map((p) => html`<p dangerouslySetInnerHTML=${{ __html: p }} />`)}
        </aside>`)}
      </ui-accordion-panel>
    </ui-accordion-item>
  </ui-accordion>`;
}
