// Catálogo único de herramientas vivas del chat.
// Lo usan core/chat-engine.js (prompt y autocompletado), core/worker.js (esquemas para el modelo)
// y adapters/docsify.js (permisos por configuración).

function deepFreeze(value) {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

export const CHAT_TOOLS = deepFreeze([
  {
    name: 'navigate_to_page',
    configKey: 'navigate',
    actionVerb: 'navigate',
    promptDescription: 'Go to a different doc page (use paths from context)',
    completionDescription: 'Go to a doc page',
    schema: {
      type: 'function',
      function: {
        name: 'navigate_to_page',
        description: 'Navigate to a different documentation page. Use when the user asks to go to, open, or show a specific page or section.',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'The page path from the sidebar, e.g. /content/guide/getting-started',
            },
          },
          required: ['path'],
        },
      },
    },
  },
  {
    name: 'search_docs',
    configKey: 'search',
    actionVerb: 'search',
    promptDescription: 'Search across all documentation',
    completionDescription: 'Search all documentation',
    schema: {
      type: 'function',
      function: {
        name: 'search_docs',
        description: 'Search across all documentation pages. Use when the user asks to find, search, or look up something across the docs.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query',
            },
          },
          required: ['query'],
        },
      },
    },
  },
  {
    name: 'scroll_to_section',
    configKey: 'scrollToSection',
    actionVerb: 'scroll',
    promptDescription: 'Scroll to a heading on the current page',
    completionDescription: 'Scroll to a heading',
    schema: {
      type: 'function',
      function: {
        name: 'scroll_to_section',
        description: 'Scroll to a specific heading or section on the current page. Use when the user asks to go to a section, jump to a heading, or show a specific part.',
        parameters: {
          type: 'object',
          properties: {
            heading: {
              type: 'string',
              description: 'The heading text to scroll to',
            },
          },
          required: ['heading'],
        },
      },
    },
  },
]);

// Esquemas de herramienta que el worker pasa al modelo para llamadas nativas.
export const WORKER_TOOL_SCHEMAS = Object.freeze(CHAT_TOOLS.map(tool => tool.schema));

// Relación entre el nombre de cada herramienta y su interruptor en la configuración.
export const TOOL_CONFIG_MAP = Object.freeze(
  Object.fromEntries(CHAT_TOOLS.map(tool => [tool.name, tool.configKey]))
);
