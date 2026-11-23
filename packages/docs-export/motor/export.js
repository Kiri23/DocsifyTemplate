// Describes a Markdown export as immutable data and turns it into Typst or PDF.
// Calls motor/components.js, motor/pandoc-options.js, and motor/mermaid.js; transports supply
// the engines so the same core works in Node and in the browser.
import { expandComponentsToTypst } from "./components.js";
import { inlineMermaidSvgs } from "./mermaid.js";
import { buildPandocRequest } from "./pandoc-options.js";

/** Copies a component list or map into an isolated lookup table by name. */
function normalizeComponents(input) {
  if (input instanceof Map) return new Map(input);
  if (Array.isArray(input)) {
    return new Map(input.map((component) => [component.name, component]));
  }
  throw new TypeError("components() espera un Map<string, component> o un array de componentes");
}

/** Rejects non-text values early when configuring an export. */
function assertString(value, name) {
  if (typeof value !== "string") {
    throw new TypeError(`${name} tiene que ser un string`);
  }
}

export class Export {
  #state;

  constructor(state) {
    this.#state = Object.freeze({ ...state });
    Object.freeze(this);
  }

  /** Starts a new export from a Markdown page. */
  static ofMarkdown(markdown) {
    assertString(markdown, "markdown");
    return new Export({ markdown });
  }

  /** Sets the document title shown on the cover and page header. */
  title(text) {
    assertString(text, "title");
    return new Export({ ...this.#state, title: text });
  }

  /** Sets the subtitle shown below the title on the cover page. */
  subtitle(text) {
    assertString(text, "subtitle");
    return new Export({ ...this.#state, subtitle: text });
  }

  /** Sets the author shown on the cover page. */
  author(text) {
    assertString(text, "author");
    return new Export({ ...this.#state, author: text });
  }

  /** Sets the date shown on the cover page. */
  date(text) {
    assertString(text, "date");
    return new Export({ ...this.#state, date: text });
  }

  /** Adds a table of contents before the document body. */
  toc() {
    return new Export({ ...this.#state, toc: true });
  }

  /** Sets the text of the Typst template (the content itself, not a file path). */
  templateSource(source) {
    assertString(source, "templateSource");
    return new Export({ ...this.#state, templateSource: source });
  }

  /** Adds template customisations such as brand name or palette overrides. */
  templateVariables(variables) {
    if (!variables || typeof variables !== "object" || Array.isArray(variables)) {
      throw new TypeError("templateVariables() espera un objeto plano clave-valor");
    }
    return new Export({
      ...this.#state,
      templateVariables: Object.freeze({ ...this.#state.templateVariables, ...variables }),
    });
  }

  /** Sets the text of the Mermaid filter (the content itself, not a file path). */
  mermaidFilterSource(source) {
    assertString(source, "mermaidFilterSource");
    return new Export({ ...this.#state, mermaidFilterSource: source });
  }

  /** Supplies captured Mermaid diagrams to embed into the finished document. */
  mermaidSvgs(svgs) {
    if (!Array.isArray(svgs)) {
      throw new TypeError("mermaidSvgs() espera un array de strings SVG");
    }
    return new Export({ ...this.#state, mermaidSvgs: Object.freeze([...svgs]) });
  }

  /** Registers the components whose Typst views should expand before conversion. */
  components(components) {
    return new Export({ ...this.#state, components: normalizeComponents(components) });
  }

  /** Sets how components that read a sibling JSON file load that data. */
  jsonLoader(load) {
    if (typeof load !== "function") {
      throw new TypeError("jsonLoader() espera una función (src) => data");
    }
    return new Export({ ...this.#state, load });
  }

  /** Sets a listener for markers that cannot expand and fall back to plain Markdown. */
  onWarning(handler) {
    if (typeof handler !== "function") {
      throw new TypeError("onWarning() espera una función (message) => void");
    }
    return new Export({ ...this.#state, onWarning: handler });
  }

  /** Returns the Pandoc request data without running any external tool. */
  toPandocRequest() {
    return buildPandocRequest(this.#state);
  }

  /** Produces the Typst text for this document using the supplied transport engines. */
  async toTypst(engines) {
    if (typeof engines?.pandoc !== "function") {
      throw new Error("toTypst(engines) necesita engines.pandoc({ options, stdin, files })");
    }

    let markdown = this.#state.markdown;
    if (this.#state.components && this.#state.components.size > 0) {
      markdown = expandComponentsToTypst(markdown, {
        components: this.#state.components,
        parseMarkdown: engines.parseMarkdown,
        parseHtml: engines.parseHtml,
        load: this.#state.load,
        onWarning: this.#state.onWarning,
      });
    }

    const { options, files } = this.toPandocRequest();
    const rawTypst = await engines.pandoc({ options, stdin: markdown, files });
    if (typeof rawTypst !== "string") {
      throw new Error("engines.pandoc() tiene que devolver el código Typst como string");
    }

    if (this.#state.mermaidSvgs?.length > 0) {
      return inlineMermaidSvgs(rawTypst, this.#state.mermaidSvgs, { onWarning: this.#state.onWarning });
    }
    return rawTypst;
  }

  /** Produces the compiled PDF bytes for this document using the supplied transport engines. */
  async toPdf(engines) {
    if (typeof engines?.compilePdf !== "function") {
      throw new Error(
        "toPdf(engines) necesita engines.compilePdf(typstSource); si solo querés el archivo .typ, usá toTypst(engines)",
      );
    }
    const typstSource = await this.toTypst(engines);
    const pdf = await engines.compilePdf(typstSource);
    if (!(pdf instanceof Uint8Array) || pdf.byteLength === 0) {
      throw new Error("engines.compilePdf() devolvió un PDF vacío o inválido");
    }
    return pdf;
  }
}
