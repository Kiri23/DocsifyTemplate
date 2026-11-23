// Pure Pandoc defaults-file builder used by motor/export.js.
// Both transports consume the same shape: Node writes defaults.json and runs `pandoc -d`,
// while the browser transport passes `options` and `files` straight to pandoc.wasm.

export const DEFAULT_INPUT_FORMAT = "gfm+raw_attribute";
export const TEMPLATE_FILE = "template.typ";
export const MERMAID_FILTER_FILE = "mermaid-placeholder.lua";

/**
 * Builds the Pandoc defaults object and virtual text files for a Typst conversion.
 * Metadata fields (title, subtitle, author, date) go under `metadata` so Pandoc escapes
 * Typst syntax characters; `variables` are passed raw to the template.
 * @param {{
 *   inputFormat?: string,
 *   title?: string,
 *   subtitle?: string,
 *   author?: string,
 *   date?: string,
 *   toc?: boolean,
 *   templateSource?: string,
 *   templateVariables?: Record<string, string | boolean>,
 *   mermaidFilterSource?: string,
 * }} config
 * @returns {{ options: Record<string, unknown>, files: Record<string, string> }}
 */
export function buildPandocRequest(config = {}) {
  const options = {
    from: config.inputFormat ?? DEFAULT_INPUT_FORMAT,
    to: "typst",
    standalone: true,
  };
  const files = {};

  const metadata = {};
  if (config.title !== undefined) metadata.title = config.title;
  if (config.subtitle !== undefined) metadata.subtitle = config.subtitle;
  if (config.author !== undefined) metadata.author = config.author;
  if (config.date !== undefined) metadata.date = config.date;
  if (Object.keys(metadata).length > 0) {
    options.metadata = metadata;
  }

  if (config.toc) {
    options["table-of-contents"] = true;
  }

  if (config.templateSource !== undefined) {
    files[TEMPLATE_FILE] = config.templateSource;
    options.template = TEMPLATE_FILE;
  }

  if (config.templateVariables && Object.keys(config.templateVariables).length > 0) {
    options.variables = { ...config.templateVariables };
  }

  if (config.mermaidFilterSource !== undefined) {
    files[MERMAID_FILTER_FILE] = config.mermaidFilterSource;
    options.filters = [MERMAID_FILTER_FILE];
  }

  return { options, files };
}
