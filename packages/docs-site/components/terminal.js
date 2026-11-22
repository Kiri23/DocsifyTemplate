// A terminal window for CLI output: static by default, or line-by-line typewriter when `line-ms`
// is a positive number. The Markdown is a plain fenced code block; a leading `$ command` line
// moves up to the window bar unless `command="..."` is set on the marker.
//
//   <!-- as: terminal exit="0" -->
//   ```console
//   $ kiri-pm status
//   Inbox: 3
//   ```
//
//   <!-- as: terminal estado="prototipo" nota="Salida simulada." -->
//   <!-- as: terminal line-ms="95" -->
import { useEffect, useRef, useState } from "preact/hooks";
import { html } from "htm/preact";
import { sequence, ShapeError } from "../as/shapes.js";

/** Allowed values for `estado`; adding a new status is adding it here. */
const ESTADOS = ["prototipo"];

/** A line that starts with a shell prompt followed by a command. */
const PROMPT_LINE = /^\$\s+\S/;

/** A non-negative whole number written as plain digits. */
const DIGITS = /^\d+$/;

/** An ellipsis line, shown dimmer and followed by a longer beat when animating. */
const DIM_LINE = /^\s*(?:…|\.\.\.)/;

/** The top border of a Unicode box, given a brief beat after a blank line. */
const BOX_TOP = /^\s*[┌╭╔]/;

export const terminal = {
  name: "terminal",
  takes: sequence("pre"),
  attrs: ["command", "line-ms", "exit", "nota", "estado"],
  read({ nodes: [pre], attrs }) {
    const raw = (pre.textContent ?? "").replace(/\r\n/g, "\n").replace(/\n+$/, "");
    if (!raw.trim()) throw new ShapeError("el bloque de terminal está vacío");

    const lineMs = readLineMs(attrs["line-ms"]);
    const exit = readExit(attrs.exit);
    const estado = readEstado(attrs.estado);
    const explicitCommand = readOptionalText(attrs.command, "command");
    const nota = readOptionalText(attrs.nota, "nota");

    const body = raw.split("\n");
    let command = explicitCommand;
    if (!command && canExtractPrompt(body)) {
      command = body.shift().replace(/^\$\s+/, "").trim();
    }

    const classified = body.map(classifyLine);
    const lines = classified.map((entry, i) => ({
      ...entry,
      delayMs: lineMs > 0 && i > 0
        ? lineDelay({ line: entry, prev: classified[i - 1], baseMs: lineMs })
        : 0,
    }));

    return {
      command,
      label: "terminal",
      copyText: command ?? raw,
      lines,
      lineMs,
      exit,
      nota,
      estado,
    };
  },
  view: Terminal,
};

/** Parses `line-ms`: absent or "0" is static; a positive integer enables typewriter mode. */
function readLineMs(value) {
  if (value === undefined) return 0;
  if (!DIGITS.test(value)) {
    throw new ShapeError(`line-ms tiene que ser 0 o un entero positivo (recibí "${value}")`);
  }
  return Number(value);
}

/** Parses `exit`: an optional POSIX exit code from 0 to 255. */
function readExit(value) {
  if (value === undefined) return null;
  if (!DIGITS.test(value) || Number(value) > 255) {
    throw new ShapeError(`exit tiene que ser un entero entre 0 y 255 (recibí "${value}")`);
  }
  return Number(value);
}

/** Validates `estado` against the known statuses so a typo fails the check. */
function readEstado(value) {
  if (value === undefined) return null;
  if (!ESTADOS.includes(value)) {
    throw new ShapeError(`estado="${value}" no es válido; los permitidos: ${ESTADOS.join(", ")}`);
  }
  return value;
}

/** Reads an optional text attribute and rejects an empty string. */
function readOptionalText(value, name) {
  if (value === undefined) return null;
  const trimmed = value.trim();
  if (!trimmed) throw new ShapeError(`${name} no puede estar vacío`);
  return trimmed;
}

/** Whether the first line is a single command whose output follows below it. */
function canExtractPrompt(lines) {
  if (lines.length <= 1) return false;
  if (!PROMPT_LINE.test(lines[0])) return false;
  if (lines[0].trimEnd().endsWith("\\")) return false;
  return lines.filter((line) => PROMPT_LINE.test(line)).length === 1;
}

/** Classifies a terminal line using only generic visual cues: progress bars and ellipses. */
function classifyLine(text) {
  if (text.includes("█")) {
    const parts = text.split(/(█+)/).filter(Boolean).map((chunk) => ({
      text: chunk,
      bar: chunk[0] === "█",
    }));
    return { text, kind: "bars", parts };
  }
  if (DIM_LINE.test(text)) return { text, kind: "dim" };
  return { text, kind: "plain" };
}

/** Picks the pause before printing a line in typewriter mode. */
function lineDelay({ line, prev, baseMs }) {
  if (line.text.trim() === "") return Math.round(baseMs * 1.4);
  if (prev.kind === "dim") return Math.round(baseMs * 3.2);
  if (prev.text.trim() === "" && BOX_TOP.test(line.text)) return Math.round(baseMs * 2.4);
  return baseMs;
}

/** Whether the reader asked the system for reduced motion. */
function prefersReducedMotion() {
  return typeof matchMedia === "function" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Chooses the static view when `lineMs` is 0 or the reader prefers reduced motion. */
function Terminal(props) {
  const [reduced] = useState(prefersReducedMotion);
  if (props.lineMs === 0 || reduced) return html`<${TerminalStatic} ...${props} />`;
  return html`<${TerminalAnimated} ...${props} />`;
}

/** Renders the complete output immediately, with no timers, observer or ghost element. */
function TerminalStatic({ command, label, copyText, lines, exit, nota, estado }) {
  return html`
    <figure
      class="window terminal-window"
      aria-label=${command ? `Terminal: ${command}` : "Terminal"}
      data-estado=${estado || undefined}
    >
      <${TerminalBar}
        command=${command}
        label=${label}
        copyText=${copyText}
        exit=${exit}
        estado=${estado}
      />
      <pre class="terminal-output">${lines.map((line, i) =>
        renderLine({ line, isFirst: i === 0, withCursor: false })
      )}</pre>
      ${nota ? html`<p class="terminal-note">${nota}</p>` : null}
    </figure>
  `;
}

/** Reveals lines one by one when the window enters the viewport, with Show all and Replay. */
function TerminalAnimated({ command, label, copyText, lines, exit, nota, estado }) {
  const figureRef = useRef(null);
  const replayRef = useRef(null);
  const [shown, setShown] = useState(() => (lines.length <= 1 ? lines.length : 1));
  const [playing, setPlaying] = useState(false);

  // Starts playback the first time the window scrolls into view.
  useEffect(() => {
    if (lines.length <= 1) return;
    const node = figureRef.current;
    if (!node || typeof IntersectionObserver !== "function") {
      setPlaying(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          setPlaying(true);
        }
      },
      { threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [lines]);

  // Advances one line per timer so unmounting or replaying cleanly cancels the pending step.
  useEffect(() => {
    if (!playing) return;
    if (shown >= lines.length) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setShown((n) => n + 1), lines[shown].delayMs);
    return () => clearTimeout(timer);
  }, [playing, shown, lines]);

  const done = shown >= lines.length;
  const finish = () => {
    setPlaying(false);
    setShown(lines.length);
    replayRef.current?.focus();
  };
  const replay = () => {
    setShown(1);
    setPlaying(lines.length > 1);
  };

  const visible = lines.slice(0, shown);

  return html`
    <figure
      class="window terminal-window"
      ref=${figureRef}
      aria-label=${command ? `Terminal: ${command}` : "Terminal"}
      data-estado=${estado || undefined}
    >
      <${TerminalBar}
        command=${command}
        label=${label}
        copyText=${copyText}
        exit=${exit}
        estado=${estado}
        controls=${html`
          ${!done
            ? html`<button class="terminal-btn" type="button" onClick=${finish}>Show all</button>`
            : null}
          <button class="terminal-btn" type="button" ref=${replayRef} onClick=${replay}>Replay</button>
        `}
      />
      <div class="terminal-stage">
        <pre class="terminal-ghost" aria-hidden="true">${lines.map((line) => line.text).join("\n")}</pre>
        <pre class="terminal-live">${visible.map((line, i) =>
          renderLine({ line, isFirst: i === 0, withCursor: i === visible.length - 1 && !done })
        )}</pre>
      </div>
      ${nota ? html`<p class="terminal-note">${nota}</p>` : null}
    </figure>
  `;
}

/** The window header bar: command title, optional status/exit badges, playback buttons and Copy. */
function TerminalBar({ command, label, copyText, exit, estado, controls = null }) {
  const title = command ? `$ ${command}` : label;
  return html`
    <figcaption class="window-bar terminal-bar">
      <span class="terminal-cmd" title=${title}>
        ${command
          ? html`<span class="terminal-prompt" aria-hidden="true">$ </span>${command}`
          : label}
      </span>
      <span class="terminal-actions">
        ${estado ? html`<span class="terminal-badge terminal-estado">${estado}</span>` : null}
        ${exit !== null
          ? html`<span class="terminal-badge terminal-exit" data-exit=${Number(exit) === 0 ? "ok" : "fail"}>exit ${exit}</span>`
          : null}
        ${controls}
        <${CopyButton} text=${copyText} />
      </span>
    </figcaption>
  `;
}

/** Copies the command (or output when there is no command) and briefly confirms. */
function CopyButton({ text }) {
  const [said, say] = useState("Copy");
  useEffect(() => {
    if (said === "Copy") return;
    const back = setTimeout(() => say("Copy"), 1600);
    return () => clearTimeout(back);
  }, [said]);
  const copy = () =>
    navigator.clipboard.writeText(text).then(
      () => say("Copied"),
      () => say("Copy failed"),
    );
  const copied = said === "Copied" || undefined;
  return html`
    <button class="copy-button" type="button" onClick=${copy} aria-live="polite" data-copied=${copied}>
      ${said}
    </button>
  `;
}

/** Draws one classified line and appends the blinking cursor to the active line while typing. */
function renderLine({ line, isFirst, withCursor }) {
  const nl = isFirst ? "" : "\n";
  const cursor = withCursor
    ? html`<span class="terminal-cursor" aria-hidden="true"> </span>`
    : null;
  if (line.kind === "bars") {
    return html`${nl}${line.parts.map((part) =>
      part.bar ? html`<span class="terminal-bar-fill">${part.text}</span>` : part.text
    )}${cursor}`;
  }
  if (line.kind === "dim") {
    return html`${nl}<span class="terminal-dim">${line.text}</span>${cursor}`;
  }
  return html`${nl}${line.text}${cursor}`;
}
