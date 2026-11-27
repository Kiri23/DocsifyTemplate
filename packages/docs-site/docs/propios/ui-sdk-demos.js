// Los bancos de prueba de la guía de UI SDK: seis pasos, cada uno con elementos `ui-*` de verdad
// arriba (lo que toca la persona) y, abajo, las llamadas que haría un agente contra el mismo
// `window.agent` de la página (plugins/ui-sdk.js). Nada se simula: cada visor pinta lo que
// devolvió la llamada. Una página lo nombra con su marcador:
//
//   <!-- as: ui-demo paso="hello" -->
//   Un párrafo cualquiera, que el banco reemplaza.
//
// Solo importa lo que da el import map de site.js. El único export es el componente.
import { useEffect, useRef, useState } from "preact/hooks";
import { html } from "htm/preact";
import { sequence, ShapeError } from "docs-site/as/mod.js";
let sdkPromise;
const agentSdk = () => (sdkPromise ??= import("@ui-sdk/web/agent"));

const LOOK = new URL("ui-sdk-demos.css", import.meta.url).href;

export const uiDemo = {
  name: "ui-demo",
  takes: sequence("p"),
  attrs: ["paso"],
  read({ attrs }) {
    const valid = ["hello", "query", "allow", "stepper", "webmcp", "mcp"];
    if (!valid.includes(attrs.paso)) {
      throw new ShapeError(`ui-demo necesita paso en ${valid.join(", ")} (recibí "${attrs.paso}")`);
    }
    return { paso: attrs.paso };
  },
  view: UiDemo,
};

function UiDemo({ paso }) {
  const Paso = PASOS[paso];
  return html`
    <link rel="stylesheet" href=${LOOK} />
    <section class="uid" data-paso=${paso} aria-label=${NOMBRES[paso]}>
      <${Paso} />
    </section>
  `;
}

const NOMBRES = {
  hello: "Banco de prueba: un collapsible y window.agent",
  query: "Banco de prueba: varios componentes y query",
  allow: "Banco de prueba: permisos con allow",
  stepper: "Banco de prueba: el stepper como primitivo",
  webmcp: "Banco de prueba: WebMCP y la herramienta read",
  mcp: "Banco de prueba: un agente de afuera por MCP",
};

// ---------- El agente de la página ----------

/** El agente que plugins/ui-sdk.js deja en window; sin él, la llamada falla y el visor lo dice. */
function pageAgent() {
  if (!window.agent) {
    throw new Error("window.agent no está en esta página: el sitio se sirvió sin plugins/ui-sdk.js.");
  }
  return window.agent;
}

function pageRead(input) {
  if (!window.pageText) {
    throw new Error("window.pageText no está en esta página: el sitio se sirvió sin plugins/ui-sdk.js.");
  }
  return window.pageText.read(input);
}

const snapshotCall = (label = "snapshot()") => ({
  label,
  code: "window.agent.snapshot()",
  run: () => pageAgent().snapshot(),
});

const queryCall = (input) => {
  const text = `query(${asCode(input)})`;
  return { label: text, code: `await window.agent.${text}`, run: () => pageAgent().query(input) };
};

/** Un `act` con sus pasos: el botón dice lo corto y el visor, la llamada entera. */
function actCall(label, steps, { agent = pageAgent, name = "window.agent", expect } = {}) {
  return {
    label,
    expect,
    code: `await ${name}.act({ steps: [${steps.map(asCode).join(", ")}] })`,
    run: async () => (await agent()).act({ steps }),
  };
}

/** Un valor como se escribe en JavaScript: claves sin comillas y espacios para leerlo. */
function asCode(value) {
  if (Array.isArray(value)) return `[${value.map(asCode).join(", ")}]`;
  if (value && typeof value === "object") {
    return `{ ${Object.entries(value).map(([k, v]) => `${k}: ${asCode(v)}`).join(", ")} }`;
  }
  return JSON.stringify(value);
}

// Quien corre una llamada avisa, para que cada banco vuelva a leer su estado sin culpar a la persona.
const resyncs = new Set();

/** El visor de un banco: la última llamada, lo que devolvió y si salió bien. */
function useRunner() {
  const [shot, setShot] = useState(null);
  const busy = useRef(false);
  const run = async (call, by = "agente") => {
    if (busy.current) return undefined;
    busy.current = true;
    let out;
    let ok;
    let why;
    try {
      out = await call.run();
      const failed = out && typeof out === "object" && !Array.isArray(out) && (out.ok === false || out.error);
      ok = !failed;
      if (failed) why = typeof out.error === "string" ? out.error : out.error?.message;
    } catch (error) {
      ok = false;
      why = error?.message ?? String(error);
      out = { thrown: why };
    } finally {
      busy.current = false;
      for (const resync of resyncs) resync();
    }
    setShot({ code: call.code, out, ok, why, by });
    return out;
  };
  return [shot, run];
}

/**
 * Quién movió por última vez los componentes de un banco. `agent.subscribe` lo dice con el valor
 * de antes y el de ahora; el clic y las teclas sobre el escenario, 30 ms después, cubren al
 * navegador donde eso no llega. `onPerson` corre cuando el cambio lo hizo la persona.
 */
function useLive(target, mine, onPerson, deps = []) {
  const [last, setLast] = useState(null);
  const then = useRef(onPerson);
  then.current = onPerson;
  useEffect(() => {
    const el = target();
    const agent = window.agent;
    if (!el || !agent) return undefined;
    const own = () => JSON.stringify(agent.snapshot().filter(mine).map(({ ref, ...state }) => state));
    let seen = own();
    let heard = 0;
    const timers = new Set();
    const later = (fn) => {
      const timer = setTimeout(() => {
        timers.delete(timer);
        fn();
      }, 30);
      timers.add(timer);
    };
    const resync = () => later(() => (seen = own()));
    resyncs.add(resync);
    const off = agent.subscribe?.((change) => {
      if (!mine(change)) return;
      heard = Date.now();
      const who = change.source === "agent" ? "agente" : "persona";
      setLast({ who, label: change.label, key: change.key, value: change.value, previous: change.previous, at: heard });
      later(() => {
        seen = own();
        if (who === "persona") then.current?.();
      });
    });
    const poke = () => later(() => {
      if (Date.now() - heard < 200) return;
      const now = own();
      if (now === seen) return;
      seen = now;
      setLast({ who: "persona", at: Date.now() });
      then.current?.();
    });
    el.addEventListener("click", poke);
    el.addEventListener("keydown", poke);
    return () => {
      off?.();
      resyncs.delete(resync);
      el.removeEventListener("click", poke);
      el.removeEventListener("keydown", poke);
      for (const timer of timers) clearTimeout(timer);
    };
  }, deps);
  return last;
}

const byLabel = (...labels) => (entry) => labels.includes(entry.label);

// ---------- Piezas que comparten los seis bancos ----------

/** El cable entre la persona (arriba) y el agente (abajo): quién movió el estado y qué cambió. */
function Wire({ last, children }) {
  const who = last?.who ?? "nadie";
  return html`
    <div class="uid-wire" data-who=${who}>
      <span class="uid-who" data-on=${String(who === "persona")}>Persona</span>
      <span class="uid-change" aria-live="polite">
        ${!last && "Nadie movió nada todavía."}
        ${last && html`<span class="uid-moved" key=${last.at}>
          ${last.key
            ? html`${last.label && html`<span class="uid-moved-label">${last.label}</span>`}
                <span class="uid-delta">${last.key}: ${brief(last.previous)} → ${brief(last.value)}</span>`
            : "cambió el estado"}
        </span>`}
        ${children}
      </span>
      <span class="uid-who" data-on=${String(who === "agente")}>Agente</span>
    </div>
  `;
}

function brief(value) {
  const text = JSON.stringify(value) ?? "undefined";
  return text.length > 36 ? `${text.slice(0, 35)}…` : text;
}

function Calls({ calls, last, onRun }) {
  return html`
    <div class="uid-calls" role="group" aria-label="Llamadas de prueba">
      ${calls.map((call) => html`
        <button
          type="button"
          key=${call.label}
          class="uid-run"
          title=${call.code}
          data-expect=${call.expect ?? "ok"}
          data-last=${String(last === call.code)}
          onClick=${() => onRun(call)}
        >${call.label}</button>
      `)}
    </div>
  `;
}

function Viewer({ shot, empty = "Corré una llamada y acá aparece lo que devolvió.", mark, flash }) {
  if (!shot) return html`<div class="uid-view"><p class="uid-empty">${empty}</p></div>`;
  return html`
    <div class="uid-view">
      <div class="uid-bar">
        <span class="uid-code">${shot.code}</span>
        ${shot.by === "persona" && html`<span class="uid-tag">tras tu clic</span>`}
        <span class="uid-badge" data-ok=${String(shot.ok)}>${shot.ok ? "OK" : "Error"}</span>
      </div>
      ${shot.why && html`<p class="uid-why">${shot.why}</p>`}
      <${Json} key=${flash} value=${shot.out} mark=${mark} />
    </div>
  `;
}

/** Un valor como JSON de leer: lo corto en una línea, lo largo abierto, con los colores del tema. */
function Json({ value, mark }) {
  return html`<div class="uid-json" tabindex="0" role="group" aria-label="Resultado en JSON">${paint(pretty(value), mark)}</div>`;
}

function pretty(value, pad = "", width = 60) {
  if (value === undefined) return "undefined";
  if (typeof value === "function") return JSON.stringify(`ƒ ${value.name || "anónima"}()`);
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  const list = Array.isArray(value);
  const keys = list ? value.map((_, i) => i) : Object.keys(value).filter((k) => value[k] !== undefined);
  if (keys.length === 0) return list ? "[]" : "{}";
  const one = (key, inner, room) => (list ? "" : `${JSON.stringify(key)}: `) + pretty(value[key], inner, room);
  const flat = (list ? "[" : "{ ") + keys.map((key) => one(key, "", Infinity)).join(", ") + (list ? "]" : " }");
  if (pad.length + flat.length <= width) return flat;
  const inner = `${pad}  `;
  return `${list ? "[" : "{"}\n${keys.map((key) => inner + one(key, inner, width)).join(",\n")}\n${pad}${list ? "]" : "}"}`;
}

const TOKEN = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null|undefined)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

/** El texto de `pretty` en spans; `mark` resalta esa clave, y su valor, en el primer nivel. */
function paint(text, mark) {
  const out = [];
  let at = 0;
  let hot = false;
  for (const match of text.matchAll(TOKEN)) {
    if (match.index > at) out.push(text.slice(at, match.index));
    const key = Boolean(match[1] && match[2]);
    const kind = key ? "k" : match[1] ? "s" : match[3] ? "b" : "n";
    const wasHot = hot && !key;
    hot = false;
    if (key && mark && match[1] === `"${mark}"`) {
      const line = text.lastIndexOf("\n", match.index) + 1;
      hot = match.index - line <= 2;
    }
    out.push(html`<span class=${`uid-j-${kind}${wasHot || hot ? " uid-hot" : ""}`}>${match[1] ?? match[0]}</span>`);
    if (key) out.push(match[2]);
    at = match.index + match[0].length;
  }
  if (at < text.length) out.push(text.slice(at));
  return out;
}

/** Los textos largos de un valor, recortados para leerlo en el visor. */
function clip(value, max = 160) {
  if (typeof value === "string") return value.length > max ? `${value.slice(0, max - 1)}…` : value;
  if (Array.isArray(value)) return value.map((item) => clip(item, max));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clip(item, max)]));
  }
  return value;
}

// ---------- 1. Hello: un componente, snapshot y act ----------

function Hello() {
  const stage = useRef(null);
  const [shot, run] = useRunner();
  const ref = "Notas de despliegue";
  const calls = [
    { ...snapshotCall(), label: "window.agent.snapshot()" },
    actCall("act: setOpen(true)", [{ ref, action: "setOpen", args: [true] }]),
    actCall("act: setOpen(false)", [{ ref, action: "setOpen", args: [false] }]),
  ];
  const last = useLive(() => stage.current, byLabel(ref), () => run(snapshotCall(), "persona"));
  return html`
    <div class="uid-stage" ref=${stage}>
      <ui-collapsible aria-label="Notas de despliegue">
        <ui-collapsible-trigger><button type="button" aria-expanded="false">Notas de despliegue</button></ui-collapsible-trigger>
        <ui-collapsible-panel hidden>
          <p>Último deploy: v0.1.0-beta.17 · sin cambios de esquema · rollback listo.</p>
        </ui-collapsible-panel>
      </ui-collapsible>
    </div>
    <${Wire} last=${last} />
    <div class="uid-console">
      <${Calls} calls=${calls} last=${shot?.code} onRun=${run} />
      <${Viewer} shot=${shot} />
      <p class="uid-note">Probá también hacer clic directo en el botón arriba: el snapshot refleja el cambio al instante.</p>
    </div>
  `;
}

// ---------- 2. Query: tres componentes y un act de dos pasos ----------

function Query() {
  const stage = useRef(null);
  const [shot, run] = useRunner();
  const calls = [
    snapshotCall(),
    queryCall({ text: "Unified" }),
    queryCall({ kind: "accordion" }),
    queryCall({ closed: true }),
    actCall("act: unified + abrir caché", [
      { ref: "Vista de diffs", action: "setValue", args: ["unified"] },
      { ref: "Detalles de caché", action: "setOpen", args: [true] },
    ]),
  ];
  const mine = byLabel("Vista de diffs", "Decisión: usar import map", "Detalles de caché");
  const last = useLive(() => stage.current, mine, () => run(snapshotCall(), "persona"));
  return html`
    <div class="uid-stage" ref=${stage}>
      <div class="uid-field">
        <span class="uid-field-name" aria-hidden="true">Vista de diffs</span>
        <ui-segmented-control aria-label="Vista de diffs" default-value="split">
          <ui-segmented-control-indicator></ui-segmented-control-indicator>
          <ui-segmented-control-item value="split">Split</ui-segmented-control-item>
          <ui-segmented-control-item value="unified">Unified</ui-segmented-control-item>
        </ui-segmented-control>
      </div>
      <ui-accordion aria-label="Decisión: usar import map">
        <ui-accordion-item value="open">
          <ui-accordion-header>
            <ui-accordion-trigger>
              <button type="button" aria-expanded="false">Decisión: usar import map</button>
            </ui-accordion-trigger>
          </ui-accordion-header>
          <ui-accordion-panel hidden>
            <p><strong>Por qué:</strong> una sola versión de cada paquete para toda la página, sin build.</p>
            <p><strong>Trade-off:</strong> el módulo de un repo solo puede importar lo que el mapa nombra.</p>
          </ui-accordion-panel>
        </ui-accordion-item>
      </ui-accordion>
      <ui-collapsible aria-label="Detalles de caché">
        <ui-collapsible-trigger><button type="button" aria-expanded="false">Detalles de caché</button></ui-collapsible-trigger>
        <ui-collapsible-panel hidden>
          <p>Cada módulo sale de esm.sh con su versión fija, así que el navegador lo guarda hasta que la versión cambia.</p>
        </ui-collapsible-panel>
      </ui-collapsible>
    </div>
    <${Wire} last=${last} />
    <div class="uid-console">
      <${Calls} calls=${calls} last=${shot?.code} onRun=${run} />
      <${Viewer} shot=${shot} />
      <p class="uid-note">El último botón manda dos pasos en una sola llamada: si el primero falla, el segundo no corre.</p>
    </div>
  `;
}

// ---------- 3. Allow: un agente con una regla que decide cada paso ----------

// Un solo agente con regla para toda la sesión: el interruptor cambia la regla, no el agente.
const guard = { blocking: true, heard: null, agent: null };

async function guardedAgent() {
  if (!guard.agent) {
    const { createAgent } = await agentSdk();
    guard.agent = createAgent({
      allow: (step) => {
        const ok = !guard.blocking || !(step.label === "Entorno de deploy" && step.args?.[0] === "produccion");
        guard.heard?.({ step, ok });
        return ok;
      },
    });
    window.guardedAgent = guard.agent;
  }
  return guard.agent;
}

function Allow() {
  const stage = useRef(null);
  const [shot, run] = useRunner();
  const [blocking, setBlocking] = useState(guard.blocking);
  const [verdict, setVerdict] = useState(null);
  const count = useRef(0);
  useEffect(() => {
    guardedAgent();
    guard.heard = ({ step, ok }) => {
      const { ref, component, label, action, args } = step;
      setVerdict({ step: { ref, component, label, action, args }, ok, n: ++count.current });
    };
    return () => (guard.heard = null);
  }, []);
  const toggle = () => {
    guard.blocking = !blocking;
    setBlocking(!blocking);
  };
  const as = { agent: guardedAgent, name: "window.guardedAgent" };
  const calls = [
    actCall("act: abrir Vista previa", [{ ref: "Vista previa", action: "setOpen", args: [true] }], as),
    actCall("act: pasar a staging", [{ ref: "Entorno de deploy", action: "setValue", args: ["staging"] }], as),
    actCall("act: pasar a produccion", [{ ref: "Entorno de deploy", action: "setValue", args: ["produccion"] }], {
      ...as,
      expect: blocking ? "rechazo" : "ok",
    }),
  ];
  const last = useLive(() => stage.current, byLabel("Vista previa", "Entorno de deploy"));
  return html`
    <div class="uid-stage" ref=${stage}>
      <ui-collapsible aria-label="Vista previa">
        <ui-collapsible-trigger><button type="button" aria-expanded="false">Vista previa</button></ui-collapsible-trigger>
        <ui-collapsible-panel hidden>
          <p>La rama se ve en staging-preview.internal antes de salir. Abrir esto no cambia nada.</p>
        </ui-collapsible-panel>
      </ui-collapsible>
      <div class="uid-field">
        <span class="uid-field-name" aria-hidden="true">Entorno de deploy</span>
        <ui-segmented-control aria-label="Entorno de deploy" default-value="staging">
          <ui-segmented-control-indicator></ui-segmented-control-indicator>
          <ui-segmented-control-item value="staging">Staging</ui-segmented-control-item>
          <ui-segmented-control-item value="produccion">Producción</ui-segmented-control-item>
        </ui-segmented-control>
      </div>
    </div>
    <${Wire} last=${last} />
    <div class="uid-console">
      <div class="uid-policy" data-on=${String(blocking)}>
        <button type="button" class="uid-switch" role="switch" aria-checked=${String(blocking)} onClick=${toggle}>
          <span class="uid-switch-track" aria-hidden="true"><span class="uid-switch-thumb"></span></span>
          <span>Bloquearle producción al agente</span>
        </button>
        <div class="uid-rule">${blocking
          ? 'allow: (step) => !(step.label === "Entorno de deploy" && step.args?.[0] === "produccion")'
          : "allow: () => true"}</div>
      </div>
      <${Calls} calls=${calls} last=${shot?.code} onRun=${run} />
      <div class="uid-pair">
        <div class="uid-verdict" data-ok=${verdict ? String(verdict.ok) : "none"} aria-live="polite">
          <div class="uid-bar">
            <span class="uid-code">allow(step)</span>
            ${verdict && html`<span class="uid-badge" key=${verdict.n} data-ok=${String(verdict.ok)}>devolvió ${String(verdict.ok)}</span>`}
          </div>
          ${verdict
            ? html`<${Json} value=${verdict.step} />`
            : html`<p class="uid-empty">La regla todavía no recibió ningún paso. Corré una llamada.</p>`}
        </div>
        <${Viewer} shot=${shot} empty="Acá aparece lo que act le contesta al agente." />
      </div>
      <p class="uid-note">La regla solo decide los pasos del agente: tu clic en Producción pasa igual. El mismo agente está en <span class="uid-inline">window.guardedAgent</span> para probarlo desde DevTools.</p>
    </div>
  `;
}

// ---------- 4. Stepper: el primitivo propio de la página, visto por el agente ----------

const isStepper = (entry) => entry.component === "stepper";

function Stepper() {
  // undefined: todavía buscando; null: la página no tiene stepper.
  const [el, setEl] = useState(undefined);
  const [entry, setEntry] = useState(null);
  const [flash, setFlash] = useState(0);
  const value = useRef(undefined);
  const [shot, run] = useRunner();

  const read = () => {
    const found = window.agent?.snapshot().find(isStepper) ?? null;
    setEntry(found);
    if (found && found.value !== value.current) {
      if (value.current !== undefined) setFlash((n) => n + 1);
      value.current = found.value;
    }
  };

  // El stepper lo dibuja otro componente de la misma página: puede llegar un instante después.
  useEffect(() => {
    let tries = 0;
    let timer;
    const look = () => {
      const found = document.querySelector("as-stepper");
      if (found) setEl(found);
      else if (++tries < 40) timer = setTimeout(look, 100);
      else setEl(null);
    };
    look();
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!el) return undefined;
    read();
    const watcher = new MutationObserver(read);
    watcher.observe(el, { subtree: true, attributes: true, attributeFilter: ["aria-selected"] });
    return () => watcher.disconnect();
  }, [el]);

  const last = useLive(() => el ?? null, isStepper, read, [el]);

  if (el === null) {
    return html`<div class="uid-console">
      <p class="uid-empty">Esta página no tiene un stepper. Este banco necesita el bloque <span class="uid-inline">${"<!-- as: stepper -->"}</span> más arriba.</p>
    </div>`;
  }

  const ref = entry?.label ?? "Pasos";
  const count = el ? el.querySelectorAll('[role="tab"]').length : 0;
  const step = (label, action, args, expect) => actCall(label, [args ? { ref, action, args } : { ref, action }], { expect });
  const calls = [
    {
      label: "snapshot()",
      code: 'window.agent.snapshot().find((e) => e.component === "stepper")',
      run: () => pageAgent().snapshot().find(isStepper),
    },
    step("act setValue(3)", "setValue", [3]),
    step("act next()", "next"),
    step("act previous()", "previous"),
    step("act setValue(9)", "setValue", [9], "rechazo"),
  ];
  return html`
    <${Wire} last=${last}>
      ${entry && html`<span class="uid-rail" aria-label=${`Paso ${entry.value} de ${count}`}>
        ${Array.from({ length: count }, (_, i) => html`<span class="uid-rail-dot" key=${i} data-on=${String(i + 1 === entry.value)} data-done=${String(i + 1 < entry.value)}></span>`)}
        <span class="uid-rail-value" key=${flash}>value ${entry.value}</span>
      </span>`}
    <//>
    <div class="uid-console">
      <${Calls} calls=${calls} last=${shot?.code} onRun=${run} />
      <div class="uid-pair">
        <div class="uid-view">
          <div class="uid-bar">
            <span class="uid-code">el stepper en snapshot(), en vivo</span>
          </div>
          ${entry
            ? html`<${Json} key=${flash} value=${entry} mark="value" />`
            : html`<p class="uid-empty">Buscando el stepper de la página…</p>`}
        </div>
        <${Viewer} shot=${shot} empty="Acá aparece lo que devolvió la última llamada." />
      </div>
      <p class="uid-note">Mové el stepper de arriba con el mouse o con las flechas: <span class="uid-inline">value</span> cambia igual que cuando lo mueve el agente.</p>
    </div>
  `;
}

// ---------- 5. WebMCP: las cuatro herramientas y por qué existe read ----------

/**
 * Lo que plugins/ui-sdk.js:36-44 registra cuando el navegador trae WebMCP, capturado con un
 * `document.modelContext` de mentira que dura lo que tarda la llamada. `registerTools` es el real.
 */
async function captureTools() {
  const { registerTools } = await agentSdk();
  const agent = pageAgent();
  if (!window.pageText) throw new Error("window.pageText no está en esta página.");
  const before = Object.getOwnPropertyDescriptor(document, "modelContext");
  const captured = [];
  Object.defineProperty(document, "modelContext", {
    configurable: true,
    writable: true,
    value: {
      registerTool(tool) {
        captured.push(tool);
        return Promise.resolve();
      },
    },
  });
  try {
    const unregister = registerTools(agent, { allow: () => true });
    document.modelContext.registerTool?.({
      ...window.pageText.tool,
      annotations: { readOnlyHint: true, untrustedContentHint: true, consequentialHint: false },
      execute: (input) => window.pageText.read(input),
    })?.catch?.(() => {});
    unregister();
  } finally {
    if (before) Object.defineProperty(document, "modelContext", before);
    else delete document.modelContext;
  }
  return captured.map(({ name, description, inputSchema, annotations, execute }) => ({
    name,
    description,
    inputSchema,
    annotations,
    runs: typeof execute === "function",
  }));
}

/** La primera línea de prosa de un Markdown, para buscarla en otro lado. */
function probeOf(markdown) {
  const line = String(markdown ?? "").split("\n").map((l) => l.trim()).find((l) => l.length >= 30 && !/^[`<#>|!-]/.test(l));
  return line ? line.slice(0, 48) : "";
}

function WebMcp() {
  const [shot, run] = useRunner();
  const [tools, setTools] = useState(null);
  const [failed, setFailed] = useState("");
  const [probe, setProbe] = useState(null);
  const native = Boolean(document.modelContext);

  const simulate = async () => {
    try {
      setTools(await captureTools());
      setFailed("");
    } catch (error) {
      setTools(null);
      setFailed(error?.message ?? String(error));
    }
  };

  // El título como lo tiene la página: si el Markdown lo escribe con `read` entre comillas
  // invertidas, la herramienta lo quiere así.
  const wanted = "Por qué existe read";
  const section = window.pageText?.read().sections?.find((title) => title.replace(/`/g, "") === wanted) ?? wanted;
  const calls = [
    { label: "pageText.read()", code: "window.pageText.read()", run: () => pageRead() },
    {
      label: `pageText.read({ section })`,
      code: `window.pageText.read(${asCode({ section })})`,
      run: () => {
        const out = pageRead({ section });
        const text = probeOf(out?.text);
        if (text) setProbe({ text, inSnapshot: JSON.stringify(pageAgent().snapshot()).includes(text) });
        return out;
      },
    },
    snapshotCall("agent.snapshot()"),
  ];

  return html`
    <div class="uid-console">
      <div class="uid-probe" data-ok=${String(native)}>
        <span class="uid-code">Boolean(document.modelContext)</span>
        <span class="uid-badge" data-ok=${String(native)}>${String(native)}</span>
        <p>${native
          ? "Este navegador trae WebMCP: la página ya le registró sus cuatro herramientas al arrancar."
          : "Este navegador no trae WebMCP, así que la página no registró nada. El botón de abajo muestra lo que registraría."}</p>
      </div>
      <button type="button" class="uid-run uid-run-wide" onClick=${simulate}>
        Simular <span class="uid-inline">document.modelContext</span> y llamar <span class="uid-inline">registerTools</span>
      </button>
      ${failed && html`<p class="uid-why">${failed}</p>`}
      ${tools && html`
        <p class="uid-note">${tools.length} herramientas capturadas. El <span class="uid-inline">document.modelContext</span> de prueba ya no está: quedó como antes.</p>
        <ul class="uid-tools">
          ${tools.map((tool) => html`
            <li class="uid-tool" key=${tool.name} data-ours=${String(tool.name === "read")}>
              <div class="uid-tool-head">
                <span class="uid-tool-name">${tool.name}</span>
                <span class="uid-tag">${tool.name === "read" ? "de este sitio" : "de UI SDK"}</span>
              </div>
              <p class="uid-tool-about">${clip(tool.description, 150)}</p>
              <dl class="uid-hints">
                ${Object.entries(tool.annotations ?? {}).map(([hint, on]) => html`
                  <div key=${hint} data-on=${String(on)}><dt>${hint}</dt><dd>${String(on)}</dd></div>
                `)}
              </dl>
              <details class="uid-more">
                <summary>inputSchema y descripción entera</summary>
                <${Json} value=${tool.inputSchema} />
                <p class="uid-tool-full">${tool.description}</p>
              </details>
            </li>
          `)}
        </ul>
      `}
    </div>
    <div class="uid-console uid-console-next">
      <${Calls} calls=${calls} last=${shot?.code} onRun=${run} />
      <${Viewer} shot=${shot} empty="Leé la página con read y después pedí el snapshot: compará qué trae cada uno." />
      ${probe && html`<p class="uid-compare" data-ok=${String(!probe.inSnapshot)}>
        <span class="uid-quote">«${probe.text}…»</span>${" vino en "}<span class="uid-inline">read()</span>${probe.inSnapshot ? " y también está en " : " y no está en "}<span class="uid-inline">snapshot()</span>.
      </p>`}
      <p class="uid-note">snapshot lista componentes y su estado. La prosa de la página solo llega por read.</p>
    </div>
  `;
}

// ---------- 6. MCP: un agente de afuera, salto por salto ----------

const HOPS = [
  { name: "Claude Code", kind: "LLM" },
  { name: "pagina_mcp.py", kind: "MCP por stdio" },
  { name: "Chromium", kind: "page.evaluate" },
  { name: "window.agent", kind: "UI SDK" },
  { name: "<ui-segmented-control>", kind: "Modo del servidor" },
  { name: "Persona", kind: "mira y hace clic" },
];

const GOING = [
  "Claude Code elige la herramienta y escribe una línea de JSON.",
  "pagina_mcp.py lee esa línea por stdin.",
  "Playwright le pasa la llamada a la página con page.evaluate.",
  "window.agent corre la llamada.",
  "El control responde con su estado.",
  "La persona ve el cambio en pantalla.",
];

const motionOff = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const wait = () => new Promise((resolve) => setTimeout(resolve, motionOff() ? 0 : 240));

/** Lo que pagina_mcp.py:91-92 contesta a tools/list: las herramientas que leyó de la página al arrancar. */
function listedTools() {
  if (!window.pageText) throw new Error("window.pageText no está en esta página.");
  return [...pageAgent().tools, window.pageText.tool].map(({ name, description, inputSchema }) => ({ name, description, inputSchema }));
}

const RPC = [
  { label: "tools/list", method: "tools/list", reach: 1 },
  { label: "tools/call: snapshot", method: "tools/call", params: { name: "snapshot", arguments: {} }, reach: 4 },
  {
    label: 'tools/call: act setValue("interactivo")',
    method: "tools/call",
    params: { name: "act", arguments: { steps: [{ ref: "Modo del servidor", action: "setValue", args: ["interactivo"] }] } },
    reach: 5,
  },
];

function Mcp() {
  const stage = useRef(null);
  const turn = useRef(0);
  const ids = useRef(0);
  const [trace, setTrace] = useState(null);
  const [say, setSay] = useState("Mandá una llamada, o hacé clic en el control para ver el camino de vuelta.");
  const [wire, setWire] = useState(null);
  const [log, setLog] = useState([]);

  /** Una llamada como le llega a pagina_mcp.py, y su respuesta como la escribe en stdout. */
  const send = async (call) => {
    const mine = ++turn.current;
    const request = { jsonrpc: "2.0", id: ++ids.current, method: call.method, ...(call.params && { params: call.params }) };
    setWire({ label: call.label, request });
    setLog((lines) => [...lines, { way: "in", text: JSON.stringify(request) }]);

    let result;
    let parsed;
    let ok = true;
    const runAt = Math.min(call.reach, 3);
    for (let at = 0; at <= call.reach; at += 1) {
      if (mine !== turn.current) return;
      setTrace({ mode: "ida", at, reach: call.reach, tone: "ida" });
      setSay(call.method === "tools/list" && at === 1
        ? "pagina_mcp.py contesta con la lista que leyó de la página al arrancar: esta llamada no toca el navegador."
        : GOING[at]);
      await wait();
      if (at !== runAt) continue;
      // pagina_mcp.py:77-118: tools/list sale de la lista guardada; tools/call corre en la página.
      try {
        if (call.method === "tools/list") {
          result = { tools: listedTools() };
          parsed = result;
        } else {
          parsed = await pageAgent()[call.params.name](call.params.arguments);
          result = { content: [{ type: "text", text: JSON.stringify(parsed) }] };
          ok = !(parsed && parsed.ok === false);
        }
      } catch (error) {
        ok = false;
        parsed = undefined;
        result = { content: [{ type: "text", text: String(error?.message ?? error) }], isError: true };
      }
    }

    const response = { jsonrpc: "2.0", id: request.id, result };
    for (let at = call.reach; at >= 0; at -= 1) {
      if (mine !== turn.current) return;
      setTrace({ mode: "vuelta", at, reach: call.reach, tone: ok ? "ok" : "error" });
      setSay(at === 0
        ? "Claude Code lee la respuesta y decide qué sigue."
        : "La respuesta vuelve por el mismo camino y sale por stdout.");
      await wait();
    }
    setWire({ label: call.label, request, response, parsed, ok });
    setLog((lines) => [...lines, { way: "out", text: JSON.stringify(response) }]);
  };

  /** El camino inverso: la persona toca el control y el próximo snapshot del agente ya lo trae. */
  const personMoved = async () => {
    const mine = ++turn.current;
    for (let at = 5; at >= 3; at -= 1) {
      if (mine !== turn.current) return;
      setTrace({ mode: "persona", at, reach: 5, tone: "ida" });
      setSay(["window.agent ya tiene el valor nuevo: el próximo snapshot() lo trae.", "El control cambia su estado.", "La persona hace clic."][at - 3]);
      await wait();
    }
    let seen;
    try {
      seen = pageAgent().snapshot().filter(byLabel("Modo del servidor", "Registro MCP"));
    } catch (error) {
      seen = { thrown: error?.message ?? String(error) };
    }
    setWire({ label: "window.agent.snapshot()", seen });
  };

  useLive(() => stage.current, byLabel("Modo del servidor", "Registro MCP"), personMoved);

  const lit = (i) => {
    if (!trace) return false;
    if (trace.mode === "ida") return i <= trace.at;
    return i >= trace.at && i <= trace.reach;
  };

  return html`
    <ol class="uid-hops" data-tone=${trace?.tone ?? "ida"} data-mode=${trace?.mode ?? "quieto"}>
      ${HOPS.map((hop, i) => html`
        <li class="uid-hop" key=${hop.name} data-lit=${String(lit(i))} data-on=${String(trace?.at === i)}>
          <span class="uid-hop-dot" aria-hidden="true"></span>
          <span class="uid-hop-text">
            <span class="uid-hop-name">${hop.name}</span>
            <span class="uid-hop-kind">${hop.kind}</span>
          </span>
        </li>
      `)}
    </ol>
    <p class="uid-say" aria-live="polite">${say}</p>
    <div class="uid-stage" ref=${stage}>
      <div class="uid-field">
        <span class="uid-field-name" aria-hidden="true">Modo del servidor</span>
        <ui-segmented-control aria-label="Modo del servidor" default-value="lectura">
          <ui-segmented-control-indicator></ui-segmented-control-indicator>
          <ui-segmented-control-item value="lectura">Lectura</ui-segmented-control-item>
          <ui-segmented-control-item value="interactivo">Interactivo</ui-segmented-control-item>
        </ui-segmented-control>
      </div>
      <ui-collapsible aria-label="Registro MCP">
        <ui-collapsible-trigger><button type="button" aria-expanded="false">Registro MCP</button></ui-collapsible-trigger>
        <ui-collapsible-panel hidden>
          ${log.length === 0
            ? html`<p>Sin mensajes todavía. Cada llamada deja acá su línea de entrada y la de salida.</p>`
            : html`<ol class="uid-log">
                ${log.map((line, i) => html`<li key=${i} data-way=${line.way}>
                  <span class="uid-log-way">${line.way === "in" ? "stdin" : "stdout"}</span>
                  <span class="uid-log-text">${line.text}</span>
                </li>`)}
              </ol>`}
        </ui-collapsible-panel>
      </ui-collapsible>
    </div>
    <div class="uid-console">
      <${Calls}
        calls=${RPC.map((call) => ({ ...call, code: call.label }))}
        last=${wire?.label}
        onRun=${send}
      />
      ${!wire && html`<div class="uid-view"><p class="uid-empty">Acá aparece el JSON-RPC 2.0 de la llamada: lo que entra por stdin y lo que sale por stdout.</p></div>`}
      ${wire?.request && html`
        <div class="uid-view">
          <div class="uid-bar"><span class="uid-code">stdin de pagina_mcp.py</span></div>
          <${Json} value=${wire.request} />
        </div>
        <div class="uid-view">
          <div class="uid-bar">
            <span class="uid-code">stdout de pagina_mcp.py</span>
            ${wire.response && html`<span class="uid-badge" data-ok=${String(wire.ok)}>${wire.ok ? "OK" : "Error"}</span>`}
          </div>
          ${wire.response
            ? html`<${Json} value=${clip(wire.response)} />`
            : html`<p class="uid-empty">La llamada va en camino…</p>`}
        </div>
        ${wire.response && wire.parsed !== undefined && wire.request.method === "tools/call" && html`
          <div class="uid-view">
            <div class="uid-bar"><span class="uid-code">content[0].text, como lo lee Claude Code</span></div>
            <${Json} value=${wire.parsed} />
          </div>
        `}
      `}
      ${wire?.seen && html`
        <div class="uid-view">
          <div class="uid-bar">
            <span class="uid-code">window.agent.snapshot()</span>
            <span class="uid-tag">tras tu clic</span>
          </div>
          <${Json} value=${wire.seen} mark="value" />
        </div>
      `}
      <p class="uid-note">Acá no hay Claude Code ni Playwright: la llamada corre en este navegador contra el mismo <span class="uid-inline">window.agent</span>, y el JSON-RPC es el que <span class="uid-inline">pagina_mcp.py:77-118</span> lee y escribe. En stdout los textos largos van recortados a 160 caracteres.</p>
    </div>
  `;
}

const PASOS = { hello: Hello, query: Query, allow: Allow, stepper: Stepper, webmcp: WebMcp, mcp: Mcp };
