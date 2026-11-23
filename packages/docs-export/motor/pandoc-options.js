// Turns an export configuration into the settings and companion files Pandoc needs.
// Used by motor/export.js so both the Node and browser transports send the same input.

export const DEFAULT_INPUT_FORMAT = "gfm+raw_attribute";
export const TEMPLATE_FILE = "template.typ";
export const MERMAID_FILTER_FILE = "mermaid-placeholder.lua";

/** Builds the Pandoc settings and in-memory companion files for a document export. */
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

  // Without captured diagrams the filter would only erase the Mermaid code, so it stays out
  // and the blocks are exported as code.
  if (config.mermaidFilterSource !== undefined && config.mermaidSvgs?.length > 0) {
    files[MERMAID_FILTER_FILE] = config.mermaidFilterSource;
    options.filters = [MERMAID_FILTER_FILE];
  }

  return { options, files };
}
