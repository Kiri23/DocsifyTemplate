// Pick one value of an option and see which pieces get through (from prompt-bench's
// harness-vs-endpoint v4, the isolation filter). The Markdown is a comparison table: one column
// per value, one row per piece, and each cell starts with "sí" or "no". "no: something" means the
// piece stays out and that something gets through in its place.
//
//   <!-- as: option-picker label="isolation" default="clean" -->
//   | Lo que ve la corrida | `clean` | `hermetic`        | `none` |
//   | -------------------- | ------- | ----------------- | ------ |
//   | tu login             | sí      | no: uno propio    | sí     |
import { useLayoutEffect, useRef, useState } from "preact/hooks";
import { html } from "htm/preact";
import { sequence, ShapeError } from "../as/shapes.js";

/** A cell: yes or no, and after "no:" what gets through instead. */
const CELL = /^(sí|si|yes|✓|✅|no|✗|❌)\s*(?::\s*(.*))?$/is;
const YES = /^(sí|si|yes|✓|✅)$/i;

export const optionPicker = {
  name: "option-picker",
  takes: sequence("table"),
  attrs: ["label", "default", "in", "out"],
  read({ nodes: [table], attrs }) {
    const head = [...table.querySelectorAll("thead th")];
    if (head.length < 3) {
      throw new ShapeError("la tabla necesita una columna de piezas y al menos dos valores");
    }
    const options = head.slice(1).map((th) => th.textContent.trim());
    const pick = attrs.default ?? options[0];
    if (!options.includes(pick)) {
      throw new ShapeError(`default="${pick}" no es una columna de la tabla (${options.join(", ")})`);
    }
    const rows = [...table.querySelectorAll("tbody tr")].map((tr, r) => {
      const cells = [...tr.children];
      if (cells.length !== head.length) {
        throw new ShapeError(`la fila ${r + 1} tiene ${cells.length} celdas y el encabezado ${head.length}`);
      }
      const fates = Object.fromEntries(cells.slice(1).map((td, c) => {
        const text = td.textContent.trim();
        const m = CELL.exec(text);
        if (!m) {
          throw new ShapeError(`fila ${r + 1}, columna ${options[c]}: "${text}" no empieza con sí o no`);
        }
        const passes = YES.test(m[1]);
        return [options[c], { passes, instead: passes ? null : m[2]?.trim() || null }];
      }));
      return { piece: cells[0].innerHTML, fates };
    });
    if (!rows.length) throw new ShapeError("la tabla no tiene filas");
    return {
      label: attrs.label ?? head[0].textContent.trim(),
      options,
      pick,
      rows,
      inTitle: attrs.in ?? "Pasa",
      outTitle: attrs.out ?? "Se queda afuera",
    };
  },
  view: OptionPicker,
};

let pickers = 0;

function OptionPicker({ label, options, pick, rows, inTitle, outTitle }) {
  const [mode, setMode] = useState(pick);
  const [name] = useState(() => `as-op-${++pickers}`);
  const box = useRef(null);
  useFlip(box, mode);

  const through = rows.filter((r) => r.fates[mode].passes);
  const stopped = rows.filter((r) => !r.fates[mode].passes);
  const replaced = stopped.filter((r) => r.fates[mode].instead).length;
  const summary = `Con ${mode} pasan ${through.length} de ${rows.length}` +
    (replaced ? `; ${replaced} ${replaced === 1 ? "llega" : "llegan"} con un reemplazo.` : ".");
  const chip = (key, cls, inner) =>
    html`<li key=${key} data-flip=${key} class=${`as-op-chip ${cls}`}
      dangerouslySetInnerHTML=${{ __html: inner }}></li>`;

  return html`
    <div class="as-op" ref=${box}>
      <fieldset class="as-op-modes">
        <legend>${label}</legend>
        ${options.map((o) => html`
          <label key=${o}>
            <input type="radio" name=${name} value=${o} checked=${o === mode}
              onChange=${() => setMode(o)} />
            <span>${o}</span>
          </label>
        `)}
      </fieldset>
      <section class="as-op-zone">
        <h4>${outTitle}</h4>
        <ul>${stopped.map((r) => chip(`p${rows.indexOf(r)}`, "stopped", r.piece))}</ul>
      </section>
      <div class="as-op-filter" aria-hidden="true"><b>${label}: ${mode}</b></div>
      <section class="as-op-zone">
        <h4>${inTitle}</h4>
        <ul>
          ${through.map((r) => chip(`p${rows.indexOf(r)}`, "through", r.piece))}
          ${stopped.filter((r) => r.fates[mode].instead).map((r) =>
            chip(`i${rows.indexOf(r)}-${mode}`, "instead", escape(r.fates[mode].instead))
          )}
        </ul>
      </section>
      <p class="as-op-summary" aria-live="polite">${summary}</p>
    </div>
  `;
}

/** Moves each chip from where it was to where it is now after the value changes, so the eye can
 *  follow it from one zone to the other. Nothing moves when the reader asked for less motion. */
function useFlip(box, mode) {
  const last = useRef(new Map());
  useLayoutEffect(() => {
    const root = box.current;
    const origin = root.getBoundingClientRect();
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const now = new Map();
    for (const el of root.querySelectorAll("[data-flip]")) {
      const r = el.getBoundingClientRect();
      const at = { x: r.left - origin.left, y: r.top - origin.top };
      now.set(el.dataset.flip, at);
      const was = last.current.get(el.dataset.flip);
      if (still || last.current.size === 0) continue;
      if (!was) {
        el.animate([{ opacity: 0, transform: "translateY(-12px)" }, { opacity: 1, transform: "none" }],
          { duration: 400, delay: 250, easing: "ease-out", fill: "backwards" });
      } else if (was.x !== at.x || was.y !== at.y) {
        el.animate([{ transform: `translate(${was.x - at.x}px, ${was.y - at.y}px)` }, { transform: "none" }],
          { duration: 550, easing: "ease-in-out" });
      }
    }
    last.current = now;
  }, [mode]);
}

/** Text from a table cell, safe to put in as HTML. */
function escape(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
