// Each component reads its Markdown: what it gets from a page that fits, and why it refuses one that
// doesn't. problemsIn is what `npm run check:docs` runs on every page.
import { test } from "node:test";
import assert from "node:assert/strict";
import { marked } from "marked";
import { parseHTML } from "linkedom";
import { html } from "htm/preact";
import renderToString from "preact-render-to-string";
import { findMarks } from "../as/core.js";
import { problemsIn } from "../bin/check.mjs";
import { annotatedBlock, optionPicker, stepper, terminal } from "../components/mod.js";

/** What a component reads from the Markdown under the first marker of a page. */
function read(component, md, attrs = {}) {
  const { document } = parseHTML(`<main>${marked.parse(md)}</main>`);
  const mark = findMarks(document.querySelector("main"))[0];
  return component.read({ nodes: component.takes.collect(mark), attrs });
}

const BLOCK = "<!-- as: annotated-block -->\n```\nVersion  score\nlabels   100±0\n```\n";

test("annotated-block: each item names a piece of the block and keeps its note", () => {
  const { notes } = read(annotatedBlock, BLOCK + "1. `score`: the average\n2. `100±0` — mean ± spread\n");
  assert.deepEqual(notes.map(({ n, mark, note }) => ({ n, mark, note })), [
    { n: 1, mark: "score", note: "the average" },
    { n: 2, mark: "100±0", note: "mean ± spread" },
  ]);
});

test("annotated-block: a piece that isn't in the block is refused", () => {
  assert.deepEqual(problemsIn(BLOCK + "1. `effect`: how to read it\n"), [
    "1: `effect` (punto 1) no está en el bloque de código",
  ]);
});

test("annotated-block: an item that doesn't start with a piece is refused", () => {
  assert.deepEqual(problemsIn(BLOCK + "1. The `score`: the average\n"), [
    "1: el punto 1 de la lista no empieza con un `trozo` del bloque",
  ]);
});

const TABLE = `<!-- as: option-picker label="isolation" -->
| Lo que ve la corrida | \`clean\` | \`none\` |
| --- | --- | --- |
| tu login | sí | sí |
| plugins | no | ✓ |
| tu carpeta | no: una vacía | yes |
`;

test("option-picker: one column per value, and what gets through instead", () => {
  const props = read(optionPicker, TABLE, { label: "isolation" });
  assert.deepEqual(props.options, ["clean", "none"]);
  assert.equal(props.pick, "clean");
  assert.equal(props.label, "isolation");
  assert.deepEqual(props.rows.map((r) => r.fates.clean), [
    { passes: true, instead: null },
    { passes: false, instead: null },
    { passes: false, instead: "una vacía" },
  ]);
  assert.ok(props.rows.every((r) => r.fates.none.passes));
});

test("option-picker: a cell that isn't yes or no is refused, not guessed", () => {
  const bad = TABLE.replace("| plugins | no |", "| plugins | a veces |");
  assert.deepEqual(problemsIn(bad), [
    '1: fila 2, columna clean: "a veces" no empieza con sí o no',
  ]);
});

test("option-picker: default has to be one of the columns", () => {
  const bad = TABLE.replace('label="isolation"', 'default="hermetic"');
  assert.deepEqual(problemsIn(bad), ['1: default="hermetic" no es una columna de la tabla (clean, none)']);
});

const STEPS = "# Guide\n\n<!-- as: stepper -->\n\n## One\n\nfirst\n\n```sh\nrun\n```\n\n## Two\n\nsecond\n";

test("stepper: each ## is a step with the page's own nodes", () => {
  const { steps } = read(stepper, STEPS);
  // Docsify gives each heading its id; the step keeps it so a link to the heading opens the step.
  assert.deepEqual(steps.map((s) => [s.title, s.nodes.map((n) => n.localName)]), [
    ["One", ["h2", "p", "pre"]],
    ["Two", ["h2", "p"]],
  ]);
  assert.equal(steps[0].id, steps[0].nodes[0].id);
});

test("stepper: a single step is refused", () => {
  assert.deepEqual(problemsIn("<!-- as: stepper -->\n\n## Only\n\ntext\n"), [
    "1: un stepper necesita al menos dos ## (pasos)",
  ]);
});

test("terminal: static by default, lifts leading $ command and copies the command", () => {
  const md = "<!-- as: terminal -->\n```console\n$ kiri-pm status\nInbox: 3\nIn progress: 1\n```\n";
  const props = read(terminal, md);
  assert.equal(props.command, "kiri-pm status");
  assert.equal(props.copyText, "kiri-pm status");
  assert.equal(props.lineMs, 0);
  assert.equal(props.exit, null);
  assert.equal(props.nota, null);
  assert.equal(props.estado, null);
  assert.deepEqual(props.lines.map((l) => [l.text, l.kind, l.delayMs]), [
    ["Inbox: 3", "plain", 0],
    ["In progress: 1", "plain", 0],
  ]);
});

test("terminal: explicit command keeps body intact; single-line, continuation and multi-command keep $ in body", () => {
  const withExplicit = read(
    terminal,
    '<!-- as: terminal command="kiri-pm status" -->\n```console\n$ ignored\nInbox: 3\n```\n',
    { command: "kiri-pm status" },
  );
  assert.equal(withExplicit.command, "kiri-pm status");
  assert.deepEqual(withExplicit.lines.map((l) => l.text), ["$ ignored", "Inbox: 3"]);

  const singleLine = read(terminal, "<!-- as: terminal -->\n```console\n$ echo ok\n```\n");
  assert.equal(singleLine.command, null);
  assert.equal(singleLine.copyText, "$ echo ok");
  assert.deepEqual(singleLine.lines.map((l) => l.text), ["$ echo ok"]);

  const continuation = read(terminal, "<!-- as: terminal -->\n```console\n$ curl \\\n  https://example.com\n```\n");
  assert.equal(continuation.command, null);
  assert.deepEqual(continuation.lines.map((l) => l.text), ["$ curl \\", "  https://example.com"]);

  const session = read(terminal, "<!-- as: terminal -->\n```console\n$ ls\na.txt\n$ pwd\n/tmp\n```\n");
  assert.equal(session.command, null);
  assert.equal(session.lines.length, 4);
});

test("terminal: line-ms=0 stays static; positive line-ms uses generic classification and pacing without PromptBench leakage", () => {
  const staticZero = read(
    terminal,
    '<!-- as: terminal line-ms="0" -->\n```console\n$ echo ok\nok\n```\n',
    { "line-ms": "0" },
  );
  assert.equal(staticZero.lineMs, 0);
  assert.equal(staticZero.lines[0].delayMs, 0);

  const md = [
    '<!-- as: terminal line-ms="100" -->',
    "```console",
    "$ bench run",
    "│ Version  score",
    "[run 1/3] ok",
    "Run saved in: out/",
    "…",
    "next after ellipsis",
    "",
    "┌─ Box ───┐",
    "│ a ██░██ │",
    "```",
  ].join("\n") + "\n";
  const animated = read(terminal, md, { "line-ms": "100" });
  assert.equal(animated.lineMs, 100);
  assert.deepEqual(
    animated.lines.map((l) => [l.text, l.kind, l.delayMs]),
    [
      ["│ Version  score", "plain", 0],
      ["[run 1/3] ok", "plain", 100],
      ["Run saved in: out/", "plain", 100],
      ["…", "dim", 100],
      ["next after ellipsis", "plain", 320],
      ["", "plain", 140],
      ["┌─ Box ───┐", "plain", 240],
      ["│ a ██░██ │", "bars", 100],
    ],
  );
  assert.deepEqual(animated.lines.at(-1).parts, [
    { text: "│ a ", bar: false },
    { text: "██", bar: true },
    { text: "░", bar: false },
    { text: "██", bar: true },
    { text: " │", bar: false },
  ]);
});

test("terminal: static view renders one <pre> with no ghost, playback buttons or inline styles; animated adds ghost and controls", () => {
  const staticProps = read(
    terminal,
    '<!-- as: terminal exit="0" estado="prototipo" nota="Salida simulada." -->\n```console\n$ kiri-pm status\n…\nbar ██░ 66%\n```\n',
    { exit: "0", estado: "prototipo", nota: "Salida simulada." },
  );
  const staticHtml = renderToString(html`<${terminal.view} ...${staticProps} />`);
  assert.equal((staticHtml.match(/<pre\b/g) || []).length, 1);
  assert.ok(!staticHtml.includes("terminal-ghost"));
  assert.ok(!staticHtml.includes("Show all"));
  assert.ok(!staticHtml.includes("Replay"));
  assert.ok(!staticHtml.includes("terminal-cursor"));
  assert.ok(!staticHtml.includes("style="));
  assert.ok(!staticHtml.includes("data-lang"));
  assert.ok(staticHtml.includes('data-estado="prototipo"'));
  assert.ok(staticHtml.includes('data-exit="ok"'));
  assert.ok(staticHtml.includes('class="terminal-dim"'));
  assert.ok(staticHtml.includes('class="terminal-bar-fill"'));
  assert.ok(staticHtml.includes("Salida simulada."));

  const animatedProps = read(
    terminal,
    '<!-- as: terminal line-ms="95" exit="1" nota="Corrida de muestra." -->\n```console\n$ test\n…\nline 2 ██\n```\n',
    { "line-ms": "95", exit: "1", nota: "Corrida de muestra." },
  );
  const animatedHtml = renderToString(html`<${terminal.view} ...${animatedProps} />`);
  assert.ok(animatedHtml.includes("terminal-ghost"));
  assert.ok(animatedHtml.includes("terminal-live"));
  assert.ok(animatedHtml.includes("terminal-cursor"));
  assert.ok(animatedHtml.includes('class="terminal-dim"'));
  assert.ok(animatedHtml.includes("Show all"));
  assert.ok(animatedHtml.includes("Replay"));
  assert.ok(animatedHtml.includes('data-exit="fail"'));
  assert.ok(animatedHtml.includes("Corrida de muestra."));
  assert.ok(!animatedHtml.includes("style="));
  assert.ok(!animatedHtml.includes("data-lang"));
});

test("terminal: invalid shape, unknown attributes and bad values fail in check.mjs", () => {
  assert.deepEqual(problemsIn("<!-- as: terminal -->\n\nUn párrafo.\n"), [
    "1: esperaba <pre> después de la marca, encontré <p>",
  ]);
  assert.deepEqual(problemsIn("<!-- as: terminal -->\n```console\n   \n```\n"), [
    "1: el bloque de terminal está vacío",
  ]);
  assert.deepEqual(problemsIn('<!-- as: terminal lineMs="95" -->\n```console\nok\n```\n'), [
    '1: marca mal escrita: <!-- as: terminal lineMs="95" -->; va <!-- as: nombre clave="valor" -->',
  ]);
  assert.deepEqual(problemsIn('<!-- as: terminal foo="bar" -->\n```console\nok\n```\n'), [
    '1: terminal no conoce "foo"; conoce: command, line-ms, exit, nota, estado',
  ]);
  assert.deepEqual(problemsIn('<!-- as: terminal line-ms="-5" -->\n```console\nok\n```\n'), [
    '1: line-ms tiene que ser 0 o un entero positivo (recibí "-5")',
  ]);
  assert.deepEqual(problemsIn('<!-- as: terminal line-ms="" -->\n```console\nok\n```\n'), [
    '1: line-ms tiene que ser 0 o un entero positivo (recibí "")',
  ]);
  assert.deepEqual(problemsIn('<!-- as: terminal exit="256" -->\n```console\nok\n```\n'), [
    '1: exit tiene que ser un entero entre 0 y 255 (recibí "256")',
  ]);
  assert.deepEqual(problemsIn('<!-- as: terminal estado="borrador" -->\n```console\nok\n```\n'), [
    '1: estado="borrador" no es válido; los permitidos: prototipo',
  ]);
  assert.deepEqual(problemsIn('<!-- as: terminal command="   " -->\n```console\nok\n```\n'), [
    "1: command no puede estar vacío",
  ]);
  assert.deepEqual(problemsIn('<!-- as: terminal nota="" -->\n```console\nok\n```\n'), [
    "1: nota no puede estar vacío",
  ]);
});

test("terminal: typstPDF view emits #terminal-window with escaped strings and single-element tuple comma", () => {
  const props = read(
    terminal,
    '<!-- as: terminal exit="0" estado="prototipo" nota="Ruta C:\\tmp." -->\n```console\n$ echo "hi"\nok \\done\n```\n',
    { exit: "0", estado: "prototipo", nota: "Ruta C:\\tmp." },
  );
  const typst = terminal.typstPDF(props);
  assert.equal(
    typst,
    [
      "#terminal-window(",
      '  command: "echo \\"hi\\"",',
      "  exit: 0,",
      '  estado: "prototipo",',
      '  nota: "Ruta C:\\\\tmp.",',
      "  lines: (",
      '    "ok \\\\done",',
      "  ),",
      ")",
    ].join("\n"),
  );

  const noCommand = read(terminal, "<!-- as: terminal -->\n```console\n$ echo ok\n```\n");
  assert.equal(
    terminal.typstPDF(noCommand),
    '#terminal-window(\n  lines: (\n    "$ echo ok",\n  ),\n)',
  );
  assert.equal(
    terminal.typstPDF({ ...noCommand, label: "shell" }),
    '#terminal-window(\n  label: "shell",\n  lines: (\n    "$ echo ok",\n  ),\n)',
  );
});

test("check reports the line of each marker that fails", () => {
  const md = "# Page\n\n<!-- as: stepper -->\n\n## A\n\n## B\n\n<!-- /as -->\n\ntext\n\n<!-- as: nope -->\n\ntext\n";
  assert.deepEqual(problemsIn(md), [
    "13: no hay un componente \"nope\"; los que hay: annotated-block, option-picker, stepper, terminal",
  ]);
});
