// Unit tests mirroring motor/components.js (pure core, zero Node transport imports).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { section } from "../../docs-site/as/shapes.js";
import { expandComponentsToTypst, wrapRawTypst } from "../motor/mod.js";
import { BUILT_IN_MAP, PARSERS, TERMINAL_DOC } from "./helpers.mjs";

test("wrapRawTypst picks a fence longer than any backtick run inside the snippet", () => {
  const snippet = '#terminal-window(lines: ("```", "````",))';
  const wrapped = wrapRawTypst(snippet);
  assert.ok(wrapped.startsWith("\n`````{=typst}\n"));
  assert.ok(wrapped.endsWith("\n`````\n"));
  assert.ok(wrapped.includes(snippet));
});

test("expandComponentsToTypst expands the 3 terminal marks in terminal.md and skips the 4-backtick example", async () => {
  const source = await readFile(TERMINAL_DOC, "utf8");
  const warnings = [];
  const expanded = expandComponentsToTypst(source, {
    components: BUILT_IN_MAP,
    ...PARSERS,
    onWarning: (msg) => warnings.push(msg),
  });

  assert.deepEqual(warnings, []);
  assert.equal((expanded.match(/#terminal-window\(/g) ?? []).length, 3);
  assert.ok(
    expanded.includes('````md\n<!-- as: terminal exit="0" -->\n```console\n$ kiri-pm status\nInbox: 3\n```\n````'),
  );
});

test("components without .typst stay as plain Markdown", () => {
  const md = [
    "# Guía",
    "",
    "<!-- as: stepper -->",
    "",
    "## Uno",
    "",
    "Primer paso.",
    "",
    "## Dos",
    "",
    "Segundo paso.",
    "",
  ].join("\n");

  const expanded = expandComponentsToTypst(md, { components: BUILT_IN_MAP, ...PARSERS });
  assert.equal(expanded, md);
});

test("CRLF documents normalize cleanly, <details> wrappers stay intact, and <!-- /as --> is consumed", () => {
  const callout = {
    name: "callout",
    takes: section("h2"),
    read({ nodes }) {
      return { heading: nodes[0].textContent.trim(), count: nodes.length };
    },
    view: () => null,
    typstPDF({ heading, count }) {
      return `#callout(heading: "${heading}", count: ${count})`;
    },
  };
  const components = new Map([...BUILT_IN_MAP, [callout.name, callout]]);

  const md = [
    "<details>",
    "",
    '<!-- as: terminal exit="1" -->',
    "```console",
    "$ false",
    'quote "here" and slash \\ here',
    "```",
    "",
    "</details>",
    "",
    "<!-- as: callout -->",
    "",
    "## Nota",
    "",
    "Texto dentro.",
    "",
    "<!-- /as -->",
    "",
    "Texto fuera.",
    "",
  ].join("\r\n");

  const expanded = expandComponentsToTypst(md, { components, ...PARSERS });
  assert.ok(!expanded.includes("\r"), "normalized output should not leak stray carriage returns");
  assert.ok(expanded.includes("<details>"));
  assert.ok(expanded.includes("</details>"));
  assert.ok(expanded.includes('#terminal-window(\n  command: "false",\n  exit: 1,'));
  assert.ok(expanded.includes('quote \\"here\\" and slash \\\\ here'));
  assert.ok(expanded.includes('#callout(heading: "Nota", count: 2)'));
  assert.ok(!expanded.includes("<!-- /as -->"));
  assert.ok(expanded.includes("Texto fuera."));
});

test("nested list markers and malformed markers warn and fall back to plain Markdown", () => {
  const warnings = [];
  const md = [
    "- item",
    "",
    "  <!-- as: terminal -->",
    "  ```console",
    "  $ ls",
    "  a",
    "  ```",
    "",
    '<!-- as: terminal exit="999" -->',
    "```console",
    "bad exit",
    "```",
    "",
  ].join("\n");

  const expanded = expandComponentsToTypst(md, {
    components: BUILT_IN_MAP,
    ...PARSERS,
    onWarning: (msg) => warnings.push(msg),
  });

  assert.equal(expanded, md);
  assert.equal(warnings.length, 2);
  assert.match(warnings[0], /anidada/);
  assert.match(warnings[1], /exit tiene que ser un entero entre 0 y 255/);
});
