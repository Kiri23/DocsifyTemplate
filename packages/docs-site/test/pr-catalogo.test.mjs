// The converter (pr/read-summary.mjs) knows the blocks of summarize-pr's template as it was at
// MeLlamoPablo/skills@72199a8, the copy in pr/summarize-pr/. This test downloads the template of
// today and says when its blocks changed, so the converter is updated before a page with a new
// block fails. Without a network it is skipped.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const UPSTREAM = "https://raw.githubusercontent.com/MeLlamoPablo/skills/main/skills/summarize-pr/template.html";
const COPY = new URL("../pr/summarize-pr/template.html", import.meta.url);

/** The blocks of a template: each class used in its <main>, and the <main>'s data attributes. */
function catalog(html) {
  const main = html.slice(html.indexOf("<main"), html.indexOf("</main>"));
  return {
    classes: [...new Set([...main.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)))].sort(),
    data: [...new Set([...main.matchAll(/\b(data-[a-z-]+)=/g)].map((m) => m[1]))].sort(),
  };
}

test("summarize-pr's template has the same blocks as the copy the converter knows", async (t) => {
  let upstream;
  try {
    const response = await fetch(UPSTREAM, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    upstream = await response.text();
  } catch (error) {
    t.skip(`sin red: ${error.message}`);
    return;
  }
  assert.deepEqual(catalog(upstream), catalog(readFileSync(COPY, "utf8")),
    "la plantilla de summarize-pr cambió sus bloques: traé la copia nueva (pr/summarize-pr/README.md) y actualizá pr/read-summary.mjs");
});
