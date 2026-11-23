// Tests for docs-site component expansion to Typst, edge cases, and the contract that
// every built-in component defining `.typst(props)` produces well-formed Typst output.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import { parseHTML } from "linkedom";
import * as builtIn from "../../docs-site/components/mod.js";
import { section } from "../../docs-site/as/shapes.js";
import { expandComponentsToTypst, Export, wrapRawTypst } from "../motor/mod.js";
import { defaultTemplateSource, hasCommand, systemEngines } from "../transportes/node/mod.js";

const TERMINAL_DOC = fileURLToPath(
  new URL("../../docs-site/docs/componentes/terminal.md", import.meta.url),
);
const BUILT_IN_MAP = new Map(Object.values(builtIn).map((c) => [c.name, c]));

const PARSERS = {
  parseMarkdown: {
    lexer: (src) => marked.lexer(src),
    parser: (tokens) => marked.parser(tokens),
  },
  parseHtml(html) {
    return parseHTML(`<!DOCTYPE html><html><body><main>${html}</main></body></html>`).document.querySelector("main");
  },
};

/** Checks balanced parentheses and double-quoted strings in a generated Typst snippet. */
function assertBalancedTypst(source, label) {
  let inString = false;
  let escaped = false;
  let depth = 0;
  for (const ch of source) {
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "(") depth++;
    else if (ch === ")") depth--;
    assert.ok(depth >= 0, `${label}: unexpected closing parenthesis in Typst output`);
  }
  assert.equal(inString, false, `${label}: unterminated string literal in Typst output`);
  assert.equal(depth, 0, `${label}: unbalanced parentheses in Typst output`);
}

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
  const calls = expanded.match(/#terminal-window\(/g) ?? [];
  assert.equal(calls.length, 3, "expected exactly 3 expanded terminal-window calls");

  // The fenced example block in "Cómo se escribe" must stay untouched as Markdown.
  assert.ok(expanded.includes('````md\n<!-- as: terminal exit="0" -->\n```console\n$ kiri-pm status\nInbox: 3\n```\n````'));
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

test("CRLF line endings, <details> wrappers, and closing <!-- /as --> comments are handled cleanly", () => {
  const callout = {
    name: "callout",
    takes: section("h2"),
    read({ nodes }) {
      return { heading: nodes[0].textContent.trim(), count: nodes.length };
    },
    view: () => null,
    typst({ heading, count }) {
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

test("every built-in component with .typst produces well-formed Typst (and compiles if typst is available)", async () => {
  const samples = {
    terminal: [
      '<!-- as: terminal exit="0" estado="prototipo" nota="Ruta C:\\tmp\\out con barra." -->',
      "```console",
      '$ bench run --quick -m "con comillas"',
      '│ limpio   ████░░  66% "ok" \\done',
      "```",
      "",
    ].join("\n"),
  };

  const withTypst = Object.values(builtIn).filter((c) => typeof c.typst === "function");
  assert.ok(withTypst.length >= 1, "expected at least terminal to define .typst");

  const engines = systemEngines();
  const template = await defaultTemplateSource();

  for (const component of withTypst) {
    const sample = samples[component.name];
    assert.ok(sample, `missing sample Markdown for component "${component.name}"`);

    const expanded = expandComponentsToTypst(sample, {
      components: new Map([[component.name, component]]),
      ...PARSERS,
    });
    assert.ok(expanded.includes("{=typst}"), `${component.name}: expected raw Typst block`);

    const rawBody = expanded.split(/`+\{=typst\}\n/)[1].split(/\n`+\n/)[0];
    assertBalancedTypst(rawBody, component.name);

    const typstDoc = await Export.ofMarkdown(sample)
      .title(`Test ${component.name}`)
      .templateSource(template)
      .components(new Map([[component.name, component]]))
      .toTypst(engines);

    assert.ok(typstDoc.includes(rawBody), `${component.name}: Pandoc must preserve raw Typst verbatim`);
    assert.ok(!typstDoc.includes(`<!-- as: ${component.name}`), `${component.name}: marker should be expanded`);

    if (hasCommand("typst")) {
      const pdf = await engines.typst(typstDoc);
      assert.ok(pdf.byteLength > 100);
      assert.equal(Buffer.from(pdf.slice(0, 5)).toString("ascii"), "%PDF-");
    } else if (process.env.CI === "true") {
      assert.fail("CI=true requires the typst binary to validate generated Typst documents");
    }
  }
});
