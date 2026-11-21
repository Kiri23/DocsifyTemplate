// A component this site brings itself, not one that comes with docs-site: the week's retro drawn
// from a JSON file, as the whole page. docs/index.html names this module in
// window.$docsify.components, and each week is a page whose marker names its file:
//
//   <!-- as: retro-semanal src="semana-47.json" -->
//
// It imports only what site.js's import map gives a repo's module: Preact, htm and docs-site.
import { html } from "htm/preact";
import { page, ShapeError } from "docs-site/as/mod.js";

export const retroSemanal = {
  name: "retro-semanal",
  takes: page().json("src"),
  attrs: [],
  read({ data }) {
    if (typeof data?.semana !== "string") throw new ShapeError('retro-semanal necesita "semana"');
    if (!Array.isArray(data.metas) || data.metas.some((m) => !(m.de > 0) || !(m.hecho >= 0))) {
      throw new ShapeError('retro-semanal necesita "metas": [{ "meta", "hecho", "de" }] con de > 0');
    }
    return {
      semana: data.semana,
      rango: [data.desde, data.hasta].filter(Boolean).join(" → "),
      metas: data.metas,
      aprendido: data.aprendido ?? [],
      siguiente: data.siguiente ?? [],
    };
  },
  view: RetroSemanal,
};

// The look lives beside this file and names the theme's tokens.
const LOOK = new URL("retro-semanal.css", import.meta.url).href;

function RetroSemanal({ semana, rango, metas, aprendido, siguiente }) {
  const hecho = metas.reduce((n, m) => n + Math.min(m.hecho, m.de), 0);
  const total = metas.reduce((n, m) => n + m.de, 0);
  return html`
    <link rel="stylesheet" href=${LOOK} />
    <section class="rs" aria-label=${`Retro de la semana ${semana}`}>
      <header class="rs-head">
        <div>
          <p class="rs-week">${semana}</p>
          ${rango && html`<p class="rs-range">${rango}</p>`}
        </div>
        <p class="rs-score"><strong>${Math.round((100 * hecho) / total)}%</strong> ${hecho} de ${total}</p>
      </header>
      <ul class="rs-goals">
        ${metas.map((m) => html`
          <li key=${m.meta}>
            <span class="rs-goal">${m.meta}</span>
            <span class="rs-count">${m.hecho}/${m.de}</span>
            <span class="rs-bar" style=${`--rs-done: ${Math.min(1, m.hecho / m.de)}`}></span>
          </li>
        `)}
      </ul>
      ${aprendido.length > 0 && html`
        <h2 class="rs-title">Lo que aprendí</h2>
        <ul class="rs-list">${aprendido.map((a) => html`<li key=${a}>${a}</li>`)}</ul>
      `}
      ${siguiente.length > 0 && html`
        <h2 class="rs-title">La semana que viene</h2>
        <ol class="rs-list">${siguiente.map((s) => html`<li key=${s}>${s}</li>`)}</ol>
      `}
    </section>
  `;
}
