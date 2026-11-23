// Immutable fluent API for exporting a Markdown document to Typst or PDF.
// Holds only plain data until `.toTypst(engines)` or `.toPdf(engines)` runs,
// so the same core works in Node (system binaries) and the browser (WASM).
import { expandComponentsToTypst } from "./components.js";
import { inlineMermaidSvgs } from "./mermaid.js";
import { buildPandocRequest } from "./pandoc-options.js";

/** Converts a plain map, array of components, or Map into a frozen Map by component name. */
function normalizeComponents(input) {
  if (input instanceof Map) return new Map(input);
  if (Array.isArray(input)) {
    return new Map(input.map((component) => [component.name, component]));
  }
  throw new TypeError("components() espera un Map<string, component> o un array de componentes");
}

/** Validates that a text option is a string. */
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

  /** Starts an export description from a Markdown string. */
  static ofMarkdown(markdown) {
    assertString(markdown, "markdown");
    return new Export({ markdown });
  }

  /** Sets the document title (escaped safely through Pandoc metadata). */
  title(text) {
    assertString(text, "title");
    return new Export({ ...this.#state, title: text });
  }

  /** Sets the document subtitle (escaped safely through Pandoc metadata). */
  subtitle(text) {
    assertString(text, "subtitle");
    return new Export({ ...this.#state, subtitle: text });
  }

  /** Sets the document author (escaped safely through Pandoc metadata). */
  author(text) {
    assertString(text, "author");
    return new Export({ ...this.#state, author: text });
  }

  /** Sets the document date (escaped safely through Pandoc metadata). */
  date(text) {
    assertString(text, "date");
    return new Export({ ...this.#state, date: text });
  }

  /** Includes a table of contents in the exported document. */
  toc() {
    return new Export({ ...this.#state, toc: true });
  }

  /** Sets the raw text of the Pandoc Typst template (not a file path). */
  templateSource(source) {
    assertString(source, "templateSource");
    return new Export({ ...this.#state, templateSource: source });
  }

  /** Merges raw template variables passed verbatim to Pandoc (`-V` / `variables`). */
  templateVariables(variables) {
    if (!variables || typeof variables !== "object" || Array.isArray(variables)) {
      throw new TypeError("templateVariables() espera un objeto plano clave-valor");
    }
    return new Export({
      ...this.#state,
      templateVariables: Object.freeze({ ...this.#state.templateVariables, ...variables }),
    });
  }

  /** Sets the raw text of the Lua filter that turns mermaid fences into placeholders. */
  mermaidFilterSource(source) {
    assertString(source, "mermaidFilterSource");
    return new Export({ ...this.#state, mermaidFilterSource: source });
  }

  /** Sets captured Mermaid SVG strings to splice into the Typst output in document order. */
  mermaidSvgs(svgs) {
    if (!Array.isArray(svgs)) {
      throw new TypeError("mermaidSvgs() espera un array de strings SVG");
    }
    return new Export({ ...this.#state, mermaidSvgs: Object.freeze([...svgs]) });
  }

  /** Registers docs-site components whose `.typst(props)` views should expand before Pandoc. */
  components(components) {
    return new Export({ ...this.#state, components: normalizeComponents(components) });
  }

  /** Sets the loader used by components whose shape reads a sibling JSON file. */
  jsonLoader(load) {
    if (typeof load !== "function") {
      throw new TypeError("jsonLoader() espera una función (src) => data");
    }
    return new Export({ ...this.#state, load });
  }

  /** Sets a callback invoked when a component marker cannot be expanded and falls back to Markdown. */
  onWarning(handler) {
    if (typeof handler !== "function") {
      throw new TypeError("onWarning() espera una función (message) => void");
    }
    return new Export({ ...this.#state, onWarning: handler });
  }

  /** Returns the pure Pandoc defaults object and virtual files without running any engine. */
  toPandocRequest() {
    return buildPandocRequest(this.#state);
  }

  /**
   * Produces Typst source by expanding registered `.typst` components, running Pandoc,
   * and inlining any provided Mermaid SVGs.
   * @param {{
   *   pandoc: (req: { options: object, stdin: string, files: Record<string, string> }) => Promise<string> | string,
   *   parseHtml?: (html: string) => object,
   *   parseMarkdown?: { lexer: Function, parser: Function },
   * }} engines
   * @returns {Promise<string>}
   */
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

    if (this.#state.mermaidSvgs) {
      return inlineMermaidSvgs(rawTypst, this.#state.mermaidSvgs);
    }
    return rawTypst;
  }

  /**
   * Produces PDF bytes by generating Typst source and compiling it with `engines.typst`.
   * Fails before running Pandoc if `engines.typst` is not provided.
   * @param {{
   *   pandoc: Function,
   *   typst: (typstSource: string) => Promise<Uint8Array> | Uint8Array,
   *   parseHtml?: Function,
   *   parseMarkdown?: { lexer: Function, parser: Function },
   * }} engines
   * @returns {Promise<Uint8Array>}
   */
  async toPdf(engines) {
    if (typeof engines?.typst !== "function") {
      throw new Error(
        "toPdf(engines) necesita engines.typst(typstSource); si solo querés el archivo .typ, usá toTypst(engines)",
      );
    }
    const typstSource = await this.toTypst(engines);
    const pdf = await engines.typst(typstSource);
    if (!(pdf instanceof Uint8Array) || pdf.byteLength === 0) {
      throw new Error("engines.typst() devolvió un PDF vacío o inválido");
    }
    return pdf;
  }
}
