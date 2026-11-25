// summarize-pr's own check (summarize-pr/check.mjs, a copy), run on a page that comes in. The
// converter reads only <main>, so the page is checked with the template's CSS and script in place
// of its own: a page that changed them (prs/55.html has links to the glossary) is still checked
// for everything it says. The tests and bin/pr.mjs call this.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const CHECK = fileURLToPath(new URL("summarize-pr/check.mjs", import.meta.url));
const TEMPLATE = fileURLToPath(new URL("summarize-pr/template.html", import.meta.url));
const STYLE = /<style>[\s\S]*?<\/style>/;
const MODULE_SCRIPT = /<script type="module">[\s\S]*?<\/script>/;

/**
 * What summarize-pr's check says about a page.
 * @param {string} html the page
 * @returns {{ errors: string[], warnings: string[], shown: { additions: number, deletions: number } }}
 */
export function checkSummary(html) {
  const template = readFileSync(TEMPLATE, "utf8");
  const page = html
    .replace(STYLE, () => template.match(STYLE)[0])
    .replace(MODULE_SCRIPT, () => template.match(MODULE_SCRIPT)[0]);
  const dir = mkdtempSync(join(tmpdir(), "pr-check-"));
  let output;
  try {
    writeFileSync(join(dir, "page.html"), page);
    try {
      output = execFileSync("node", [CHECK, join(dir, "page.html")], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    } catch (error) {
      output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  const lines = output.split("\n");
  const said = (prefix) => lines.filter((l) => l.startsWith(prefix)).map((l) => l.slice(prefix.length));
  const shown = /\(\+(\d+) with \d+ test names?, −(\d+);/.exec(output);
  return {
    errors: said("error: "),
    warnings: said("warning: "),
    shown: { additions: Number(shown?.[1] ?? NaN), deletions: Number(shown?.[2] ?? NaN) },
  };
}
