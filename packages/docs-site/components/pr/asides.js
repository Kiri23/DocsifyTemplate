// The boxes of prose of a PR summary, each a quote under its marker: a note of the author
// (callout), an idea the PR dropped (discarded) and what the PR relies on (assumption).
//
//   <!-- as: callout label="Note" -->
//   > The test does not look at the Typst that comes out.
import { html } from "htm/preact";
import { sequence } from "../../as/shapes.js";
import { quoted } from "./read.js";

/** A box with a small label above its paragraphs. */
function box(name, label, className) {
  return {
    name,
    takes: sequence("blockquote"),
    attrs: name === "callout" ? ["label"] : [],
    read: ({ nodes: [quote], attrs }) => ({ label: attrs.label ?? label, paragraphs: quoted(quote, name) }),
    view: ({ label: said, paragraphs }) => html`<aside class=${className} aria-label=${said}>
      <div class="pr-label">${said}</div>
      ${paragraphs.map((p) => html`<p dangerouslySetInnerHTML=${{ __html: p }} />`)}
    </aside>`,
  };
}

export const callout = box("callout", "Note", "pr-callout");
export const discarded = box("discarded", "Discarded idea", "pr-discarded");
export const assumption = box("assumption", "Assumption", "pr-assumption");
