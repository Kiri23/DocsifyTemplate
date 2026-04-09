// Chat Engine — state machine, context builder, message history.
// Pure functions + one stateful class. No DOM, no Worker, no framework.

const CHARS_PER_TOKEN = 4;
const MAX_CONTEXT_TOKENS = 120000;

export const SYSTEM_PROMPT = `You are a helpful documentation assistant. Answer questions using ONLY the documentation context provided below. Be concise and direct. If the answer is in the context, cite which section. If not, say so honestly.`;

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
