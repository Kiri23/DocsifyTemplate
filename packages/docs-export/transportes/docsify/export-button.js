// Docsify 5 plugin that adds "download as .typ / .pdf" buttons at the top of every page.
// A site turns it on by adding it to window.$docsify.plugins; site.js does not load it.
// On click it calls export-page.js with the browser engines (transportes/browser/engines.js)
// and saves the result. The .typ is for agents (plain text they can read and edit), the .pdf
// for people.
import { captureMermaidSvgs } from "../browser/mermaid-capture.js";
import { browserEngines } from "../browser/engines.js";
import { EXPORT_FORMATS, exportPage } from "./export-page.js";

export const DEFAULT_MARKED_URL = "https://cdn.jsdelivr.net/npm/marked@18.2.1/lib/marked.esm.js";
const DEFAULT_TEMPLATE_URL = new URL("../../templates/branded.typ", import.meta.url).href;
const DEFAULT_MERMAID_FILTER_URL = new URL("../../filters/mermaid-placeholder.lua", import.meta.url).href;

const BAR_CLASS = "docs-export-bar";
const STYLE_ID = "docs-export-style";
// Only the site's own color variables: the theme decides the colors.
const BAR_STYLE = `
.${BAR_CLASS} { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin: 0 0 16px; }
.${BAR_CLASS} button { font: inherit; font-size: 0.85em; padding: 4px 10px; cursor: pointer;
  border: 1px solid var(--line, currentColor); border-radius: var(--radius, 6px);
  background: transparent; color: inherit; }
.${BAR_CLASS} button:disabled { opacity: 0.6; cursor: progress; }
.${BAR_CLASS} [role="status"] { font-size: 0.85em; color: var(--text-dim, inherit); }
`;

const BUTTON_LABELS = Object.freeze({ typ: "Descargar .typ", pdf: "Descargar .pdf" });

/** Creates the Docsify plugin; pandocWasmUrl says where the site serves pandoc.wasm. */
export function exportButton({
  pandocWasmUrl,
  typstUrl,
  wasiShimUrl,
  markedUrl = DEFAULT_MARKED_URL,
  components,
  templateUrl = DEFAULT_TEMPLATE_URL,
  templateSource,
  mermaidFilterUrl = DEFAULT_MERMAID_FILTER_URL,
  mermaidFilterSource,
  formats = ["typ", "pdf"],
  engines,
  document = globalThis.document,
  importModule = (url) => import(url),
  fetchText = defaultFetchText,
} = {}) {
  if (!engines && (typeof pandocWasmUrl !== "string" || pandocWasmUrl === "")) {
    throw new Error(
      "exportButton necesita pandocWasmUrl: la dirección donde tu sitio sirve pandoc.wasm " +
        "(el archivo no vive en este repo)",
    );
  }
  for (const format of formats) {
    if (!EXPORT_FORMATS[format]) throw new Error(`exportButton: formato desconocido "${format}" (usá "typ" o "pdf")`);
  }

  const hasComponents = components && (components.size ?? components.length) > 0;
  let enginesReady = null;
  const textCache = new Map();

  /** Builds the browser engines once, with the Markdown parser only when components need it. */
  function enginesForSite() {
    if (engines) return Promise.resolve(engines);
    enginesReady ??= (async () => {
      const marked = hasComponents ? (await importModule(markedUrl)).marked : undefined;
      return browserEngines({ pandocWasmUrl, typstUrl, wasiShimUrl, marked, document, importModule });
    })().catch((error) => {
      enginesReady = null;
      throw error;
    });
    return enginesReady;
  }

  /** Reads a text file the export needs (template, filter) once per page load. */
  function textAt(url) {
    if (!textCache.has(url)) {
      textCache.set(url, fetchText(url).catch((error) => {
        textCache.delete(url);
        throw error;
      }));
    }
    return textCache.get(url);
  }

  return (hook) => {
    let pageMarkdown = "";

    hook.beforeEach((markdown) => {
      pageMarkdown = markdown;
      return markdown;
    });

    hook.doneEach(() => {
      const section = document.querySelector(".markdown-section");
      if (!section || section.querySelector(`.${BAR_CLASS}`)) return;
      addStyleOnce(document);

      const bar = document.createElement("div");
      bar.className = BAR_CLASS;
      const status = document.createElement("span");
      status.setAttribute("role", "status");
      const buttons = formats.map((format) => {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.format = format;
        button.textContent = BUTTON_LABELS[format];
        return button;
      });

      const markdown = pageMarkdown;
      for (const button of buttons) {
        button.addEventListener("click", async () => {
          const format = button.dataset.format;
          for (const b of buttons) b.disabled = true;
          status.textContent = format === "pdf" ? "Armando el PDF…" : "Armando el .typ…";
          const warnings = [];
          try {
            const [activeEngines, template, filter] = await Promise.all([
              enginesForSite(),
              templateSource ?? textAt(templateUrl),
              mermaidFilterSource ?? textAt(mermaidFilterUrl),
            ]);
            const file = await exportPage({
              markdown,
              format,
              engines: activeEngines,
              title: section.querySelector("h1")?.textContent.trim(),
              templateSource: template,
              mermaidFilterSource: filter,
              mermaidSvgs: captureMermaidSvgs(section),
              components,
              onWarning: (message) => warnings.push(message),
            });
            saveFile(document, file);
            for (const message of warnings) console.warn(`docs-export: ${message}`);
            status.textContent = warnings.length > 0 ? `Listo, con ${warnings.length} aviso(s) en la consola.` : "";
          } catch (error) {
            console.error("docs-export:", error);
            status.textContent = `No se pudo exportar: ${error.message}`;
          } finally {
            for (const b of buttons) b.disabled = false;
          }
        });
      }

      bar.append(...buttons, status);
      section.prepend(bar);
    });
  };
}

/** Downloads a text file the export needs, failing with the address when it is missing. */
async function defaultFetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`no se pudo leer ${url} (HTTP ${response.status})`);
  return response.text();
}

/** Puts the bar's few style rules on the page the first time a bar is drawn. */
function addStyleOnce(document) {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = BAR_STYLE;
  document.head.append(style);
}

/** Hands the finished file to the browser as a download. */
function saveFile(document, { filename, mime, content }) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
