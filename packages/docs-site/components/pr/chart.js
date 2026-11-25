// A flow chart of a PR summary, in Graphviz DOT, drawn with @viz-js/viz as summarize-pr draws it,
// and a before/after pair of them. Each box can link to its code at the PR's head commit. The DOT
// stays readable under the chart, in a UI SDK collapsible, for a reader or an agent that wants the
// source. Adapted from summarize-pr's template.html (see NOTICE).
//
//   <!-- as: chart -->
//   ```dot
//   digraph { A -> B [label="calls"] }
//   ```
//
//   - `A`: [src/a.js#L3](https://github.com/o/r/blob/<sha>/src/a.js#L3)
//
//   <!-- as: chart-pair -->
//   **Before**
//   (a dot block and its links)
//   **Now**
//   (a dot block and its links)
import { html } from "htm/preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { sequence, ShapeError } from "../../as/shapes.js";
import { codeBlock } from "./read.js";

const BOX = /^`([^`]+)`:\s*$/;

/** The DOT of a chart and where each box links to. */
function readChart(pre, list, what) {
  const { lang, code } = codeBlock(pre, what);
  if (lang !== "dot") throw new ShapeError(`${what}: el bloque de código va con lenguaje dot`);
  const links = {};
  const hrefs = {};
  for (const [i, li] of [...(list?.children ?? [])].entries()) {
    const id = li.querySelector(":scope > code")?.textContent;
    const a = li.querySelector(":scope > a");
    if (!id || !a || !BOX.test(`\`${id}\`:`)) throw new ShapeError(`${what}: el link ${i + 1} va como "- \`ID\`: [ruta#L1](url)"`);
    links[id] = a.textContent;
    hrefs[id] = a.getAttribute("href");
  }
  return { dot: code, links, hrefs };
}

export const chart = {
  name: "chart",
  takes: sequence("pre", "ul?"),
  attrs: [],
  read: ({ nodes }) => readChart(nodes[0], nodes.find((n) => n.localName === "ul"), "chart"),
  view: (props) => html`<${Chart} ...${props} />`,
};

export const chartPair = {
  name: "chart-pair",
  takes: sequence("p", "pre", "ul?", "p", "pre", "ul?"),
  attrs: [],
  read({ nodes }) {
    const halves = [];
    for (const node of nodes) {
      if (node.localName === "p") halves.push({ label: node.innerHTML.trim(), pre: null, list: null });
      else if (node.localName === "pre") halves.at(-1).pre = node;
      else halves.at(-1).list = node;
    }
    const [before, now] = halves.map((h) => ({ label: h.label, ...readChart(h.pre, h.list, "chart-pair") }));
    return { before, now };
  },
  view: ({ before, now }) => html`<div class="pr-chart-pair">
    ${[before, now].map((half) => html`<div>
      <p class="pr-lede" dangerouslySetInnerHTML=${{ __html: half.label }} />
      <${Chart} ...${half} />
    </div>`)}
  </div>`,
};

// Graphviz lays out each arrow label like a box, so labels do not overlap. It measures text with
// Helvetica metrics, which are close to the page font.
const FONT = { fontname: "Helvetica", fontsize: 16 };
let viz = null;

function Chart({ dot, hrefs }) {
  const box = useRef(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    viz ??= import("@viz-js/viz").then(({ instance }) => instance());
    viz.then((graphviz) => {
      if (!box.current) return;
      const svg = graphviz.renderSVGElement(dot, {
        graphAttributes: { ...FONT, bgcolor: "transparent", nodesep: 0.6, ranksep: 0.5, pad: 0.1 },
        nodeAttributes: { ...FONT, shape: "box", style: "rounded", margin: "0.3,0.15" },
        edgeAttributes: { ...FONT, arrowsize: 0.7 },
      });
      // Graphviz sizes the SVG in points; pixels make its text the size of the page text.
      const [, , width, height] = svg.getAttribute("viewBox").split(" ");
      svg.setAttribute("width", width);
      svg.setAttribute("height", height);
      styleChart(svg, hrefs);
      box.current.replaceChildren(svg);
    }).catch((error) => {
      console.warn("pr: Graphviz no cargó; el gráfico muestra su fuente.", error);
      setFailed(true);
    });
  }, [dot]);
  const label = `Chart: ${[...dot.matchAll(/label="([^"]*)"/g)].map((m) => m[1].replace(/\\n/g, " ")).join(", ")}`;
  return html`<figure class="pr-chart">
    <div class="pr-chart-svg" ref=${box} role="img" aria-label=${label}>${failed ? html`<pre>${dot}</pre>` : null}</div>
    <ui-collapsible class="pr-chart-source">
      <ui-collapsible-trigger><button type="button" aria-expanded="false">Chart source (DOT)</button></ui-collapsible-trigger>
      <ui-collapsible-panel hidden><pre class="pr-dot">${dot}</pre></ui-collapsible-panel>
    </ui-collapsible>
  </figure>`;
}

/** Grays the arrows of muted boxes and wraps each linked box in its link. */
function styleChart(svg, hrefs) {
  const muted = new Set([...svg.querySelectorAll("g.node.muted")].map((b) => b.querySelector("title").textContent));
  for (const arrow of svg.querySelectorAll("g.edge")) {
    const ends = arrow.querySelector("title").textContent.split("->").map((end) => end.split(":")[0]);
    if (ends.some((id) => muted.has(id))) arrow.classList.add("muted");
  }
  for (const node of svg.querySelectorAll("g.node")) {
    const href = hrefs[node.querySelector("title").textContent];
    if (!href) continue;
    const link = document.createElementNS("http://www.w3.org/2000/svg", "a");
    link.setAttribute("href", href);
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener");
    node.replaceWith(link);
    link.append(node);
  }
  // The browser shows titles as tooltips, and these are only ids.
  for (const title of svg.querySelectorAll("title")) title.remove();
}
