#!/usr/bin/env node
// Turns the page that the summarize-pr skill made for a PR (prs/59.html) into the site's Markdown
// for it (prs/59.md, next to it): one `<!-- as: … -->` marker per block, drawn by the components
// of components/pr/. The HTML stays as the original, linked from the page. Before writing, it runs
// summarize-pr's own check on the page, and after, it checks that the Markdown has every block,
// text and datum of the page. With --check it writes nothing and fails if the .md is not up to date.
//
//   node packages/docs-site/bin/pr.mjs packages/docs-site/docs/prs/59.html
//   node packages/docs-site/bin/pr.mjs packages/docs-site/docs/prs/*.html --check
//   node packages/docs-site/bin/pr.mjs packages/docs-site/docs/prs/59.html --json   (what the page has)
import { existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { basename, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual, parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { readSummary, SummaryError } from "../pr/read-summary.mjs";
import { toMarkdown } from "../pr/write-markdown.mjs";
import { checkSummary } from "../pr/upstream.mjs";
import { drawnText, factsOfMarkdown, factsOfSummary, inventoryOfMarkdown, inventoryOfSummary, proseOfSummary, textOfSummary } from "../pr/inventory.mjs";
import * as builtIn from "../components/mod.js";
import * as prComponents from "../components/pr/mod.js";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const COMPONENTS = new Map([...Object.values(builtIn), ...Object.values(prComponents)].map((c) => [c.name, c]));

/**
 * The Markdown of one page and what is wrong with it.
 * @param {string} file a summarize-pr page
 * @returns {{ markdown: string | null, problems: string[], warnings: string[] }}
 */
export function convert(file) {
  const html = readFileSync(file, "utf8");
  const { errors } = checkSummary(html);
  let page;
  try {
    page = readSummary(html);
  } catch (error) {
    if (error instanceof SummaryError) return { markdown: null, problems: [error.message], warnings: errors };
    throw error;
  }
  const markdown = toMarkdown(page, { original: basename(file), source: relative(ROOT, resolve(file)) });
  const problems = [];
  const want = inventoryOfSummary(page);
  const got = inventoryOfMarkdown(markdown, COMPONENTS);
  for (const key of Object.keys(want)) {
    if (want[key] !== got[key]) problems.push(`la página tiene ${want[key]} ${key} y el Markdown ${got[key]}`);
  }
  const facts = factsOfSummary(page);
  const read = factsOfMarkdown(markdown, COMPONENTS);
  for (const key of Object.keys(facts)) {
    if (!isDeepStrictEqual(facts[key], read[key])) problems.push(`${key}: el Markdown no dice lo mismo que la página`);
  }
  const drawn = drawnText(markdown, COMPONENTS);
  for (const text of textOfSummary(html).filter((t) => !drawn.includes(t))) problems.push(`falta el texto "${text}"`);
  // summarize-pr's check speaks of the page's content; the converter keeps it as it is.
  return { markdown, problems, warnings: errors };
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const { values, positionals: files } = parseArgs({ allowPositionals: true, options: { check: { type: "boolean", default: false }, json: { type: "boolean", default: false } } });
  if (!files.length || files.some((f) => !f.endsWith(".html") || !existsSync(f))) {
    console.error("uso: pr.mjs <página de summarize-pr .html>… [--check | --json]");
    process.exit(2);
  }
  // No process.exit() from here on: it cuts what is still on its way down a pipe (at 64 KiB).
  // What each page has, as JSON, for a test that compares it with the drawn page (test/pr_agente.py).
  if (values.json) {
    const out = Object.fromEntries(files.map((file) => {
      const page = readSummary(readFileSync(file, "utf8"));
      return [basename(file, ".html"), { inventory: inventoryOfSummary(page), facts: factsOfSummary(page), prose: proseOfSummary(page) }];
    }));
    console.log(JSON.stringify(out));
  } else {
    process.exitCode = convertAll(files, values.check) ? 1 : 0;
  }
}

/** Converts each page next to it (or, with check, says which .md is not up to date). How many failed. */
function convertAll(files, check) {
  let failed = 0;
  for (const file of files) {
    const out = file.replace(/\.html$/, ".md");
    const { markdown, problems, warnings } = convert(file);
    for (const warning of warnings) console.log(`${relative(process.cwd(), file)}: summarize-pr dice: ${warning}`);
    for (const problem of problems) console.log(`${relative(process.cwd(), file)}: ${problem}`);
    if (problems.length || markdown === null) {
      failed++;
      continue;
    }
    if (check) {
      const same = existsSync(out) && readFileSync(out, "utf8") === markdown;
      if (!same) {
        console.log(`${relative(process.cwd(), out)} no está al día: corré node packages/docs-site/bin/pr.mjs ${relative(process.cwd(), file)}`);
        failed++;
      }
    } else {
      writeFileSync(out, markdown);
      console.log(`${relative(process.cwd(), out)} ← ${basename(file)}`);
    }
  }
  return failed;
}
