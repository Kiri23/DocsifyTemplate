// The top of a PR summary: the link to the PR, how many lines the page shows of the PR's lines,
// the flags that gate the change, and the Split/Unified control of the diffs (a UI SDK segmented
// control, so an agent can switch it too). The numbers come from the marker, which the converter
// writes from the summarize-pr page.
//
//   <!-- as: pr-header repo="https://github.com/o/r" pr="59" head="<sha>" additions="2879"
//        deletions="6" shown-additions="109" shown-deletions="1" -->
//   [Ver el original](59.html) · hecho con [summarize-pr](…)
//
//   - `experiment: new-sort`
import { html } from "htm/preact";
import { useEffect, useRef } from "preact/hooks";
import { sequence, ShapeError } from "../../as/shapes.js";
import { choose, diffStyle, narrow } from "./diff-style.js";

const NUMBERS = ["pr", "additions", "deletions", "shown-additions", "shown-deletions"];
const format = new Intl.NumberFormat("en-US");

export const prHeader = {
  name: "pr-header",
  takes: sequence("p", "ul?"),
  attrs: ["repo", "head", "preview", ...NUMBERS],
  read({ nodes: [about, chips], attrs }) {
    if (!/^https:\/\/github\.com\/[^/]+\/[^/]+$/.test(attrs.repo ?? "")) throw new ShapeError('pr-header: repo="https://github.com/<dueño>/<repo>"');
    for (const key of NUMBERS) {
      if (!/^\d+$/.test(attrs[key] ?? "")) throw new ShapeError(`pr-header: ${key}="…" va con un número`);
    }
    return {
      repo: attrs.repo,
      pr: Number(attrs.pr),
      head: attrs.head ?? null,
      preview: attrs.preview ?? null,
      lines: {
        additions: Number(attrs.additions),
        deletions: Number(attrs.deletions),
        shownAdditions: Number(attrs["shown-additions"]),
        shownDeletions: Number(attrs["shown-deletions"]),
      },
      about: about.innerHTML.trim(),
      chips: [...(chips?.children ?? [])].map((li) => li.innerHTML.trim()),
    };
  },
  view: PrHeader,
};

function PrHeader({ repo, pr, preview, lines, about, chips }) {
  const control = useRef(null);
  const style = diffStyle.value;
  useEffect(() => {
    const el = control.current;
    const follow = (event) => choose(event.detail.value);
    el?.addEventListener("valuechange", follow);
    return () => el?.removeEventListener("valuechange", follow);
  }, []);
  useEffect(() => {
    if (control.current && control.current.value !== style) control.current.value = style;
  }, [style]);
  return html`<div class="pr-header">
    <div class="pr-header-row">
      <a class="pr-link" href=${`${repo}/pull/${pr}`} target="_blank" rel="noopener" title="Open the pull request on GitHub">${repo.split("/").at(-1)}#${pr} ↗</a>
      <span class="pr-stats" title="Lines on this page (lines in the pull request)">
        <span class="pr-add">+${lines.shownAdditions} <span class="pr-faint">(${format.format(lines.additions)})</span></span>
        ${" "}<span class="pr-del">−${lines.shownDeletions} <span class="pr-faint">(${format.format(lines.deletions)})</span></span>
      </span>
      ${chips.map((chip) => html`<span class="pr-chip" dangerouslySetInnerHTML=${{ __html: chip }} />`)}
      ${preview && html`<a class="pr-preview" href=${preview} target="_blank" rel="noopener" title="Open the production preview of this pull request">Preview ↗</a>`}
    </div>
    <div class="pr-header-row">
      <p class="pr-about" dangerouslySetInnerHTML=${{ __html: about }} />
      <ui-segmented-control ref=${control} class="pr-diff-style" aria-label="Diff layout" default-value=${style} hidden=${narrow.value}>
        <ui-segmented-control-indicator></ui-segmented-control-indicator>
        <ui-segmented-control-item value="split">Split</ui-segmented-control-item>
        <ui-segmented-control-item value="unified">Unified</ui-segmented-control-item>
      </ui-segmented-control>
    </div>
  </div>`;
}
