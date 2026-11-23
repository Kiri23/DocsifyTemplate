// Docsify 5 plugin that adds "download as .typ / .pdf" buttons at the top of every page.
// A site turns it on through window.$docsify.pluginModules in site.js; it is off by default.
// On click it runs the motor (motor/export.js) with the engines the site gives, usually
// browserEngines from transportes/browser/, and saves the result. The .typ is for agents (plain
// text they can read and edit), the .pdf for people.
import { Export } from "../../motor/mod.js";
import { captureMermaidSvgs } from "../browser/mermaid-capture.js";

const DEFAULT_TEMPLATE_URL = new URL("../../templates/branded.typ", import.meta.url).href;
const DEFAULT_MERMAID_FILTER_URL = new URL("../../filters/mermaid-placeholder.lua", import.meta.url).href;

// What each button produces: how the motor makes it and how the browser saves it.
const FORMATS = Object.freeze({
  typ: Object.freeze({
    label: "Descargar .typ",
    busy: "Armando el .typ (la primera vez descarga pandoc.wasm, unos 56 MB)…",
    extension: ".typ",
    mime: "text/plain;charset=utf-8",
    build: (job, engines) => job.toTypst(engines),
  }),
  pdf: Object.freeze({
    label: "Descargar .pdf",
    busy: "Armando el PDF (la primera vez descarga pandoc.wasm y typst)…",
    extension: ".pdf",
    mime: "application/pdf",
    build: (job, engines) => job.toPdf(engines),
  }),
});

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

/** Makes a download name from the page title: lower case, no accents, words joined by dashes. */
export function downloadFilename(title, extension) {
  const slug = (title ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "documento"}${extension}`;
}

/** Creates the Docsify plugin that exports each page with the given engines. */
export function exportButton({
  engines,
  components,
  formats = ["typ", "pdf"],
  templateUrl = DEFAULT_TEMPLATE_URL,
  mermaidFilterUrl = DEFAULT_MERMAID_FILTER_URL,
  document = globalThis.document,
  fetchText = defaultFetchText,
} = {}) {
  if (typeof engines?.pandoc !== "function") {
    throw new Error(
      "exportButton necesita engines, por ejemplo browserEngines({ pandocWasmUrl }) " +
        "de docs-export/transportes/browser/mod.js",
    );
  }
  for (const format of formats) {
    if (!FORMATS[format]) throw new Error(`exportButton: formato desconocido "${format}" (usá "typ" o "pdf")`);
  }

  const textCache = new Map();

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
        button.textContent = FORMATS[format].label;
        return button;
      });

      const markdown = pageMarkdown;
      for (const button of buttons) {
        button.addEventListener("click", async () => {
          const format = FORMATS[button.dataset.format];
          for (const b of buttons) b.disabled = true;
          status.textContent = format.busy;
          const warnings = [];
          try {
            const [template, mermaidFilter] = await Promise.all([textAt(templateUrl), textAt(mermaidFilterUrl)]);
            const title = section.querySelector("h1")?.textContent.trim();
            let job = Export.ofMarkdown(markdown)
              .templateSource(template)
              .mermaidFilterSource(mermaidFilter)
              .mermaidSvgs(captureMermaidSvgs(section))
              .onWarning((message) => warnings.push(message));
            if (title) job = job.title(title);
            if (components) job = job.components(components);

            const content = await format.build(job, engines);
            saveDownload(document, {
              filename: downloadFilename(title, format.extension),
              mime: format.mime,
              content,
            });
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
function saveDownload(document, { filename, mime, content }) {
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
