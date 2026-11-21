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
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
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

let steppers = 0;

function Stepper({ steps }) {
  const [current, setCurrent] = useState(() => Math.max(0, steps.findIndex((s) => s.id === linkedId())));
  const [uid] = useState(() => `as-st-${++steppers}`);
  const panels = useRef([]);
  const tabs = useRef([]);

  // Synchronous, inside Docsify's doneEach: the plugins after this one (onThisPage, codeWindow)
  // find the headings and the code blocks in the panels.
  useLayoutEffect(() => {
    steps.forEach((step, i) => panels.current[i].append(...step.nodes));
  }, []);

  // A link to one of the headings opens its step.
  useEffect(() => {
    const follow = () => {
      const i = steps.findIndex((s) => s.id === linkedId());
      if (i === -1) return;
      setCurrent(i);
      requestAnimationFrame(() => document.getElementById(steps[i].id)?.scrollIntoView());
    };
    addEventListener("hashchange", follow);
    return () => removeEventListener("hashchange", follow);
  }, []);

  const go = (i, focus) => {
    setCurrent(i);
    if (focus) tabs.current[i].focus();
  };
  const onKey = (event, i) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (step) go((i + step + steps.length) % steps.length, true);
    if (event.key === "Home") go(0, true);
    if (event.key === "End") go(steps.length - 1, true);
  };

  return html`
    <div class="as-st">
      <div class="as-st-tabs" role="tablist" aria-label="Pasos"
        style=${`--as-st-count: ${steps.length}`}>
        ${steps.map((s, i) => html`
          <button key=${i} type="button" role="tab" id=${`${uid}-tab-${i}`}
            ref=${(el) => (tabs.current[i] = el)}
            aria-selected=${String(i === current)} aria-controls=${`${uid}-panel-${i}`}
            tabindex=${i === current ? 0 : -1}
            class=${i < current ? "done" : i === current ? "current" : undefined}
            onClick=${() => go(i)} onKeyDown=${(e) => onKey(e, i)}>
            <span class="as-st-dot" aria-hidden="true">${i + 1}</span>
            <span class="as-st-title">${s.title}</span>
          </button>
        `)}
      </div>
      ${steps.map((s, i) => html`
        <div key=${i} role="tabpanel" id=${`${uid}-panel-${i}`} class="as-st-panel"
          aria-labelledby=${`${uid}-tab-${i}`} hidden=${i !== current}
          ref=${(el) => (panels.current[i] = el)}></div>
      `)}
      <div class="as-st-nav">
        <button type="button" disabled=${current === 0} onClick=${() => go(current - 1)}>
          ← Paso anterior
        </button>
        <span>Paso ${current + 1} de ${steps.length}</span>
        <button type="button" disabled=${current === steps.length - 1} onClick=${() => go(current + 1)}>
          Paso siguiente →
        </button>
      </div>
    </div>
  `;
}

/** The heading a Docsify link points at: the `id` in "#/how-to/page?id=step-two". */
function linkedId() {
  return new URLSearchParams(location.hash.split("?")[1] ?? "").get("id");
}
