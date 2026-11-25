// The components of a PR summary (docs/prs/<n>.md), the page that bin/pr.mjs writes from what the
// summarize-pr skill made. Each block of that skill's template is one component; their views use
// UI SDK elements (registered by plugins/ui-sdk.js) so an agent on the page can read and use them.
export { prHeader } from "./pr-header.js";
export { story } from "./story.js";
export { callout, discarded, assumption } from "./asides.js";
export { decision } from "./decision.js";
export { diff } from "./diff.js";
export { example } from "./example.js";
export { chart, chartPair } from "./chart.js";
export { tests } from "./tests.js";
