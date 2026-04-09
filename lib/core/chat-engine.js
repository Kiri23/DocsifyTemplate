// Chat Engine — state machine, context builder, message history.
// Pure functions + one stateful class. No DOM, no Worker, no framework.
// Reads model config from config.js when available.

import { getConfig, isFeatureEnabled } from './config.js';

const CHARS_PER_TOKEN = 4;
const MAX_CONTEXT_TOKENS = 120000;

// Build system prompt dynamically based on enabled tools
function buildSystemPrompt() {
  let cfg;
  try { cfg = getConfig(); } catch { cfg = null; }
  const tools = cfg?.features?.chat?.tools || {};

  const toolLines = [];
  if (tools.export !== false)           toolLines.push('- export_page: Export current page to PDF, LaTeX, or Markdown');
  if (tools.navigate !== false)         toolLines.push('- navigate_to_page: Go to a different doc page (use paths from context)');
  if (tools.switchTab !== false)        toolLines.push('- switch_tab: Switch between tabs on the current page');
  if (tools.search !== false)           toolLines.push('- search_docs: Search across all documentation');
  if (tools.generateComponent !== false) toolLines.push('- generate_component: Create a YAML code fence component (card-grid, api-endpoint, status-flow, entity-schema, config-example, step-type, side-by-side, file-tree, directive-table)');
  if (tools.scrollToSection !== false)  toolLines.push('- scroll_to_section: Scroll to a heading on the current page');

  const toolSection = toolLines.length > 0
    ? `\n\nAVAILABLE ACTIONS (use tool calls for these):\n${toolLines.join('\n')}\n\nWhen the user asks you to DO something (export, navigate, create, scroll), use a tool call.`
    : '';

  return `You are a helpful documentation assistant with tool-calling capabilities. You can answer questions AND take actions.${toolSection} When they ask a QUESTION, answer from the documentation context. Be concise and direct.`;
}

export { buildSystemPrompt as getSystemPrompt };
export const SYSTEM_PROMPT = buildSystemPrompt();

// --- Available models ---
// Default catalog — config.features.chat.model can override or extend

const DEFAULT_MODEL_CATALOG = [
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
    id: 'onnx-community/Qwen3-1.7B-ONNX',
    label: 'Qwen 3 1.7B',
    size: '~1.4 GB',
    params: '1.7B',
    speed: 'Fast',
    architecture: 'causal-lm',
    dtype: 'q4f16',
    useExternalData: false,
    nativeToolCalling: false,
    maxNewTokens: 1024,
  },
  {
    id: 'onnx-community/Qwen3-0.6B-ONNX',
    label: 'Qwen 3 0.6B',
    size: '~570 MB',
    params: '0.6B',
    speed: 'Very Fast',
    architecture: 'causal-lm',
    dtype: 'q4f16',
    useExternalData: false,
    nativeToolCalling: false,
    maxNewTokens: 512,
  },
];

// Build catalog: if config specifies a model, ensure it's first in the list
export function getModelCatalog() {
  let cfg;
  try { cfg = getConfig(); } catch { return DEFAULT_MODEL_CATALOG; }

  const configModel = cfg?.features?.chat?.model;
  if (!configModel || !configModel.id) return DEFAULT_MODEL_CATALOG;

  // Check if config model is already in catalog
  const existing = DEFAULT_MODEL_CATALOG.find(m => m.id === configModel.id);
  if (existing) {
    // Merge config overrides into catalog entry, put it first
    const merged = { ...existing, ...configModel };
    return [merged, ...DEFAULT_MODEL_CATALOG.filter(m => m.id !== configModel.id)];
  }

  // Config model is custom — add it at the top
  return [configModel, ...DEFAULT_MODEL_CATALOG];
}

// Legacy export for compatibility
export const MODEL_CATALOG = getModelCatalog();

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
      const prompt = buildSystemPrompt();
      const out = [];
      out.push({
        role: 'user',
        content: `${prompt}\n\n--- DOCUMENTATION CONTEXT ---\n${context}\n--- END CONTEXT ---`
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
