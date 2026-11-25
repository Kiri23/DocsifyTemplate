// A how-to's steps one at a time (from prompt-bench's tutorial-stepper v1 and v3): numbered dots
// that keep the order in view, one panel per step, and buttons to go back and forward. The
// Markdown is the page as it already is, one `##` per step; nothing in the text changes.
//
//   <!-- as: stepper -->
//   ## Add the term
//   …
//   ## Anchor it to the code
//   …
//   <!-- /as -->            (optional: without it, the steps run to the end of the page)
//
// The panels hold the page's own elements, moved, not copies: the code blocks still get their
// copy button, and a link to a step's heading (from "On this page" or the search) opens that step.
//
// An AI agent uses it too, with the page's tools (plugins/ui-sdk.js): its snapshot lists the stepper
// and its step, and act moves it (setValue, next, previous). See plugins/stepper.js: it is the
// example of a component of our own built as a UI SDK primitive.
import { useLayoutEffect, useRef } from "preact/hooks";
import { html } from "htm/preact";
import { section, ShapeError } from "../as/shapes.js";

export const stepper = {
  name: "stepper",
  takes: section("h2"),
  attrs: [],
  read({ nodes }) {
    const steps = [];
    for (const node of nodes) {
      if (node.localName === "h2") steps.push({ id: node.id, title: node.textContent.trim(), nodes: [] });
      steps.at(-1).nodes.push(node);
    }
    if (steps.length < 2) throw new ShapeError("un stepper necesita al menos dos ## (pasos)");
    return { steps };
  },
  view: Stepper,
};

// The stepper's behavior (which step is open, the keys, what an agent can do) is a UI SDK primitive
// in plugins/stepper.js; this view only draws its elements, and moves the page's nodes into the
// panels. Before plugins/stepper.js loads (and in Node) the first view already shows one step.
function Stepper({ steps }) {
  const start = Math.max(0, steps.findIndex((s) => s.id === linkedId())) + 1;
  const panels = useRef([]);

  // Synchronous, inside Docsify's doneEach: the plugins after this one (onThisPage, codeWindow)
  // find the headings and the code blocks in the panels.
  useLayoutEffect(() => {
    steps.forEach((step, i) => panels.current[i].append(...step.nodes));
  }, []);

  return html`
    <as-stepper class="as-st" count=${steps.length} default-value=${start} aria-label="Pasos">
      <as-stepper-list class="as-st-tabs" aria-label="Pasos" style=${`--as-st-count: ${steps.length}`}>
        ${steps.map((s, i) => html`
          <as-stepper-tab key=${i} value=${i + 1}>
            <button type="button" role="tab" aria-selected=${String(i + 1 === start)}>
              <span class="as-st-dot" aria-hidden="true">${i + 1}</span>
              <span class="as-st-title">${s.title}</span>
            </button>
          </as-stepper-tab>
        `)}
      </as-stepper-list>
      ${steps.map((s, i) => html`
        <as-stepper-panel key=${i} value=${i + 1} class="as-st-panel" role="tabpanel"
          hidden=${i + 1 !== start} ref=${(el) => (panels.current[i] = el)}></as-stepper-panel>
      `)}
      <div class="as-st-nav">
        <as-stepper-previous><button type="button">← Paso anterior</button></as-stepper-previous>
        <as-stepper-status>Paso ${start} de ${steps.length}</as-stepper-status>
        <as-stepper-next><button type="button">Paso siguiente →</button></as-stepper-next>
      </div>
    </as-stepper>
  `;
}

/** The heading a Docsify link points at: the `id` in "#/how-to/page?id=step-two". */
function linkedId() {
  return new URLSearchParams(globalThis.location?.hash.split("?")[1] ?? "").get("id");
}
