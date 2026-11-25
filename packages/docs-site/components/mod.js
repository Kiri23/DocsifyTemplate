// The components a page can name with `<!-- as: name -->`. The first four come from prototypes of
// prompt-bench#25 that Christian liked; the rest draw the summary of a PR that the summarize-pr
// skill made (components/pr/, written by bin/pr.mjs). Their look lives in
// theme/themes/promptbench/components/.
export { annotatedBlock } from "./annotated-block.js";
export { optionPicker } from "./option-picker.js";
export { stepper } from "./stepper.js";
export { terminal } from "./terminal.js";
export { assumption, callout, chart, chartPair, decision, diff, discarded, example, prHeader, story, tests } from "./pr/mod.js";
