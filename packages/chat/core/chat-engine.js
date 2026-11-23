// Chat Engine — state machine, context builder, message history.
// Pure functions + one stateful class. No DOM, no Worker, no framework.
// Accepts config as constructor argument — no external config imports.

import { CHAT_TOOLS } from './tools.js';

const CHARS_PER_TOKEN = 4;
const MAX_CONTEXT_TOKENS = 120000;

// --- System prompt (built from tool config) ---

export function buildSystemPrompt(toolConfig = {}) {
  const enabledTools = CHAT_TOOLS.filter(tool => toolConfig[tool.configKey] !== false);
  const toolLines = enabledTools.map(tool => `- ${tool.name}: ${tool.promptDescription}`);
  const actionVerbs = enabledTools.map(tool => tool.actionVerb).join(', ');

  const toolSection = toolLines.length > 0
    ? `\n\nAVAILABLE ACTIONS (use tool calls for these):\n${toolLines.join('\n')}\n\nWhen the user asks you to DO something (${actionVerbs}), use a tool call.`
    : '';

  return `You are a helpful documentation assistant with tool-calling capabilities. You can answer questions AND take actions.${toolSection} When they ask a QUESTION, answer from the documentation context. Be concise and direct.`;
}

// --- Model catalog ---

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

export function getModelCatalog(configModel = null) {
  if (!configModel || !configModel.id) return DEFAULT_MODEL_CATALOG;

  const existing = DEFAULT_MODEL_CATALOG.find(m => m.id === configModel.id);
  if (existing) {
    const merged = { ...existing, ...configModel };
    return [merged, ...DEFAULT_MODEL_CATALOG.filter(m => m.id !== configModel.id)];
  }
  return [configModel, ...DEFAULT_MODEL_CATALOG];
}

// --- Engine factory ---

export function createChatEngine(options = {}) {
  const toolConfig = options.tools || {};
  const modelConfig = options.model || null;

  let status = 'unloaded';
  let messages = [];
  let sidebarPages = [];
  let pageCache = {};
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
    // --- Config access ---
    getToolConfig() { return toolConfig; },
    getModelConfig() { return modelConfig; },

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

    // --- Pages ---
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
      const tools = CHAT_TOOLS
        .filter(tool => toolConfig[tool.configKey] !== false)
        .map(tool => ({ label: tool.name, description: tool.completionDescription }));

      const q = (query || '').toLowerCase();
      return tools.filter(t => !q || t.label.includes(q) || t.description.toLowerCase().includes(q));
    },

    // --- Build worker messages ---
    buildWorkerMessages(context) {
      const prompt = buildSystemPrompt(toolConfig);
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
