// The lede of a PR summary: the "Before / Now" lines at the top, in a quote.
//
//   <!-- as: story -->
//   > **Before**, the site had no glossary.
//   >
//   > **Now**, …
import { html } from "htm/preact";
import { sequence } from "../../as/shapes.js";
import { quoted } from "./read.js";

export const story = {
  name: "story",
  takes: sequence("blockquote"),
  attrs: [],
  read: ({ nodes: [quote] }) => ({ ledes: quoted(quote, "story") }),
  view: ({ ledes }) => html`<div class="pr-story">
    ${ledes.map((lede) => html`<p class="pr-lede" dangerouslySetInnerHTML=${{ __html: lede }} />`)}
  </div>`,
};
