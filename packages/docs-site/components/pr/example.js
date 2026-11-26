// A code example: code that is not in the PR and shows how something uses the change. It draws
// with the same highlighter as the diffs, and exposes a UI SDK copy button in its bar.
//
//   <!-- as: example -->
//   ```javascript
//   exportButton({ engines })
//   ```
import { html } from "htm/preact";
import { sequence } from "../../as/shapes.js";
import { codeBlock } from "./read.js";
import { readSide } from "./code-lines.js";
import { CodeView, PrCopyButton } from "./diff.js";

export const example = {
  name: "example",
  takes: sequence("pre"),
  attrs: [],
  read: ({ nodes: [pre] }) => codeBlock(pre, "example"),
  view: ({ lang, code }) => html`<figure class="pr-example" aria-label="Code example">
    <figcaption class="pr-example-head">
      <span class="pr-example-lang">${lang}</span>
      <${PrCopyButton} text=${readSide(code).expandedText} label=${lang ? `Copy ${lang} example` : "Copy example"} />
    </figcaption>
    <${CodeView} lang=${lang} newCode=${code} />
  </figure>`,
};
