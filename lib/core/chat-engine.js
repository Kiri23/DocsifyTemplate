// Chat Engine — state machine, context builder, message history.
// Pure functions + one stateful class. No DOM, no Worker, no framework.

const CHARS_PER_TOKEN = 4;
const MAX_CONTEXT_TOKENS = 120000;

export const SYSTEM_PROMPT = `You are a helpful documentation assistant with tool-calling capabilities. You can answer questions AND take actions.

AVAILABLE ACTIONS (use tool calls for these):
- export_page: Export current page to PDF, LaTeX, or Markdown
- navigate_to_page: Go to a different doc page (use paths from context)
- switch_tab: Switch between "quick-start" and "technical" tabs
- search_docs: Search across all documentation
- generate_component: Create a YAML code fence component (card-grid, api-endpoint, status-flow, entity-schema, config-example, step-type, side-by-side, file-tree, directive-table)
- scroll_to_section: Scroll to a heading on the current page

When the user asks you to DO something (export, navigate, create, scroll), use a tool call. When they ask a QUESTION, answer from the documentation context. Be concise and direct.`;

// --- Available models ---

export const MODEL_CATALOG = [
  {
    id: 'onnx-community/gemma-4-E2B-it-ONNX',
    label: 'Gemma 4 E2B',
    size: '~1.3 GB',
    params: '2B',
    speed: 'Moderate',
    architecture: 'gemma4',
    dtype: 'q4f16',
    useExternalData: true,
    nativeToolCalling: true,
    maxNewTokens: 1024,
  },
  {
    id: 'onnx-community/Qwen2.5-1.5B-Instruct',
    label: 'Qwen 2.5 1.5B',
    size: '~900 MB',
    params: '1.5B',
    speed: 'Fast',
    architecture: 'causal-lm',
    dtype: 'q4f16',
    useExternalData: true,
    nativeToolCalling: false,
    maxNewTokens: 1024,
  },
  {
    id: 'onnx-community/Qwen2.5-0.5B-Instruct',
    label: 'Qwen 2.5 0.5B',
    size: '~400 MB',
    params: '0.5B',
    speed: 'Very Fast',
    architecture: 'causal-lm',
    dtype: 'q4f16',
    useExternalData: false,
    nativeToolCalling: false,
    maxNewTokens: 512,
  },
];

// --- State machine ---
// unloaded → loading → ready → generating → ready
//                                ↓ (error)
//                             unloaded

export function createChatEngine() {
  let status = 'unloaded'; // unloaded | loading | ready | generating
  let messages = [];
  let sidebarPages = [];        // { title, path, group }
  let pageCache = {};           // path → text content
  let selectedPaths = new Set();
  let listeners = [];

  function emit(event, data) {
    for (const fn of listeners) fn(event, data);
  }

  function setStatus(next) {
    status = next;
    emit('status', status);
  }

  return {
    // --- Lifecycle ---
    getStatus() { return status; },
    setStatus,

    // --- Listeners ---
    onEvent(fn) {
      listeners.push(fn);
      return () => { listeners = listeners.filter(f => f !== fn); };
    },

    // --- Messages ---
    getMessages() { return messages; },

    addMessage(role, content) {
      messages.push({ role, content });
      emit('message', { role, content });
    },

    updateLastAssistant(content) {
      const last = messages[messages.length - 1];
      if (last && last.role === 'assistant') {
        last.content = content;
        emit('message-update', last);
      }
    },

    resetMessages() {
      messages = [];
      emit('reset');
    },

    // --- Pages (sidebar discovery feeds these) ---
    setSidebarPages(pages) { sidebarPages = pages; },
    getSidebarPages() { return sidebarPages; },

    // --- Page cache ---
    getCachedPage(path) { return pageCache[path]; },
    cachePage(path, text) { pageCache[path] = text; },

    // --- Selection ---
    getSelectedPaths() { return selectedPaths; },
    selectPath(path) { selectedPaths.add(path); emit('selection-change'); },
    deselectPath(path) { selectedPaths.delete(path); emit('selection-change'); },
    clearSelection() { selectedPaths.clear(); emit('selection-change'); },
    selectAll() {
      for (const p of sidebarPages) selectedPaths.add(p.path);
      emit('selection-change');
    },

    // --- Token estimation ---
    estimateTokens(text) {
      return Math.ceil((text || '').length / CHARS_PER_TOKEN);
    },

    getSelectedTokenCount() {
      let total = 0;
      for (const path of selectedPaths) {
        total += this.estimateTokens(pageCache[path] || '');
      }
      return total;
    },

    getMaxTokens() { return MAX_CONTEXT_TOKENS; },

    formatTokens(n) {
      if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
      return n.toString();
    },

    // --- Context builder ---
    buildContext(fallbackContent) {
      const parts = [];

      if (selectedPaths.size === 0) {
        if (fallbackContent) parts.push(`## Current Page\n${fallbackContent}`);
      } else {
        for (const path of selectedPaths) {
          const text = pageCache[path];
          if (text) {
            const page = sidebarPages.find(p => p.path === path);
            const title = page ? page.title : path;
            parts.push(`## ${title} (${path})\n${text}`);
          }
        }
      }

      let context = parts.join('\n\n---\n\n');
      const maxChars = MAX_CONTEXT_TOKENS * CHARS_PER_TOKEN;
      if (context.length > maxChars) {
        context = context.slice(0, maxChars) + '\n\n[...truncated]';
      }
      return context;
    },

    // --- Completions ---

    getPageCompletions(query) {
      const q = (query || '').toLowerCase();
      return sidebarPages
        .filter(p => !q || p.title.toLowerCase().includes(q) || p.path.toLowerCase().includes(q))
        .map(p => ({ label: p.title, value: p.path, group: p.group }));
    },

    getToolCompletions(query) {
      const tools = [
        { label: 'export_page', description: 'Export page to PDF/LaTeX/Markdown' },
        { label: 'navigate_to_page', description: 'Go to a doc page' },
        { label: 'switch_tab', description: 'Switch Quick Start / Technical tab' },
        { label: 'search_docs', description: 'Search all documentation' },
        { label: 'generate_component', description: 'Create a YAML component' },
        { label: 'scroll_to_section', description: 'Scroll to a heading' },
      ];
      const q = (query || '').toLowerCase();
      return tools.filter(t => !q || t.label.includes(q) || t.description.toLowerCase().includes(q));
    },

    // --- Build worker messages (full conversation with context injected) ---
    buildWorkerMessages(context) {
      const out = [];
      out.push({
        role: 'user',
        content: `${SYSTEM_PROMPT}\n\n--- DOCUMENTATION CONTEXT ---\n${context}\n--- END CONTEXT ---`
      });
      out.push({
        role: 'assistant',
        content: 'I have the documentation context loaded. How can I help?'
      });
      for (const m of messages) {
        out.push({ role: m.role, content: m.content });
      }
      return out;
    },
  };
}
