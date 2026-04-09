/**
 * Gemma 4 E2B — Floating Chat Widget for DocsifyTemplate
 *
 * Self-contained: creates its own DOM, worker, and styles.
 * Reads the current page content to provide context-aware answers.
 * Opt-in: model only downloads when user clicks "Load Model".
 */

(function () {
  'use strict';

  const SYSTEM_PROMPT = `You are a helpful documentation assistant embedded in a docs site. Answer questions about the current page content provided below. Be concise and direct. If the answer is in the context, cite the relevant part. If not, say so honestly.`;

  let worker = null;
  let messages = [];
  let isRunning = false;
  let modelStatus = null; // null | 'loading' | 'ready'

  // ── DOM Creation ──────────────────────────────────────────────

  function createWidget() {
    const container = document.createElement('div');
    container.id = 'gemma-chat';
    container.innerHTML = `
      <button id="gemma-fab" aria-label="Open AI chat">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </button>

      <div id="gemma-panel" class="gemma-hidden">
        <div id="gemma-header">
          <div id="gemma-title">
            <span id="gemma-dot"></span>
            <span>Gemma 4 E2B</span>
            <span id="gemma-badge">WebGPU</span>
          </div>
          <div id="gemma-header-actions">
            <button id="gemma-reset-btn" title="Reset chat" class="gemma-hidden">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
              </svg>
            </button>
            <button id="gemma-close-btn" title="Close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <div id="gemma-messages">
          <div id="gemma-welcome">
            <div id="gemma-welcome-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.5">
                <path d="M12 2a4 4 0 0 0-4 4v2H6a4 4 0 0 0-4 4v2a4 4 0 0 0 4 4h1l1 4h8l1-4h1a4 4 0 0 0 4-4v-2a4 4 0 0 0-4-4h-2V6a4 4 0 0 0-4-4z"/>
                <circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/>
              </svg>
            </div>
            <p id="gemma-welcome-title">Local AI Assistant</p>
            <p id="gemma-welcome-sub">Runs 100% in your browser via WebGPU.<br>No data leaves your device.</p>
            <button id="gemma-load-btn">Load Model (~1.5 GB)</button>
            <div id="gemma-progress-area" class="gemma-hidden"></div>
            <div id="gemma-load-status" class="gemma-hidden"></div>
          </div>
        </div>

        <div id="gemma-input-area" class="gemma-hidden">
          <div id="gemma-tps"></div>
          <div id="gemma-input-row">
            <textarea id="gemma-input" placeholder="Ask about this page..." rows="1"></textarea>
            <button id="gemma-send-btn" disabled>
              <svg id="gemma-send-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
              <svg id="gemma-stop-icon" class="gemma-hidden" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(container);
    injectStyles();
    bindEvents();
  }

  // ── Styles ────────────────────────────────────────────────────

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #gemma-chat { --gc-accent: var(--accent, #0891b2); --gc-accent-rgb: var(--accent-rgb, 8 145 178); --gc-radius: 12px; --gc-font: var(--font-ui, -apple-system, BlinkMacSystemFont, system-ui, sans-serif); font-family: var(--gc-font); }
      .gemma-hidden { display: none !important; }

      /* FAB */
      #gemma-fab { position: fixed; bottom: 20px; right: 20px; z-index: 10000; width: 52px; height: 52px; border-radius: 50%; background: var(--gc-accent); color: white; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px rgb(var(--gc-accent-rgb) / 0.35); transition: transform 0.2s, box-shadow 0.2s; }
      #gemma-fab:hover { transform: scale(1.08); box-shadow: 0 6px 24px rgb(var(--gc-accent-rgb) / 0.45); }

      /* Panel */
      #gemma-panel { position: fixed; bottom: 84px; right: 20px; z-index: 10001; width: 380px; max-width: calc(100vw - 32px); height: 520px; max-height: calc(100vh - 120px); background: var(--surface-page, #faf9f7); border: 1px solid var(--border-subtle, #e7e5e4); border-radius: var(--gc-radius); box-shadow: 0 12px 48px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06); display: flex; flex-direction: column; overflow: hidden; animation: gemma-slide-up 0.25s cubic-bezier(0.25,1,0.5,1); }
      @keyframes gemma-slide-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

      /* Header */
      #gemma-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid var(--border-subtle, #e7e5e4); background: var(--surface-raised, #f5f5f4); flex-shrink: 0; }
      #gemma-title { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 14px; color: var(--text-primary, #1c1917); }
      #gemma-dot { width: 8px; height: 8px; border-radius: 50%; background: #a8a29e; flex-shrink: 0; }
      #gemma-dot.ready { background: #34d399; }
      #gemma-dot.loading { background: #fbbf24; animation: gemma-pulse 1.2s infinite; }
      @keyframes gemma-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      #gemma-badge { font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; background: rgb(var(--gc-accent-rgb) / 0.1); color: var(--gc-accent); text-transform: uppercase; letter-spacing: 0.5px; }
      #gemma-header-actions { display: flex; gap: 4px; }
      #gemma-header-actions button { background: none; border: none; cursor: pointer; padding: 4px; border-radius: 6px; color: var(--text-tertiary, #78716c); display: flex; align-items: center; }
      #gemma-header-actions button:hover { background: var(--surface-sunken, #efedeb); color: var(--text-primary, #1c1917); }

      /* Messages */
      #gemma-messages { flex: 1; overflow-y: auto; padding: 16px 14px; display: flex; flex-direction: column; gap: 12px; }
      #gemma-messages::-webkit-scrollbar { width: 4px; }
      #gemma-messages::-webkit-scrollbar-thumb { background: var(--border-subtle, #e7e5e4); border-radius: 4px; }

      /* Welcome */
      #gemma-welcome { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; flex: 1; gap: 6px; padding: 20px 10px; }
      #gemma-welcome-icon { color: var(--text-muted, #a8a29e); margin-bottom: 4px; }
      #gemma-welcome-title { font-size: 16px; font-weight: 700; color: var(--text-primary, #1c1917); margin: 0; }
      #gemma-welcome-sub { font-size: 13px; color: var(--text-tertiary, #78716c); line-height: 1.5; margin: 0; }
      #gemma-load-btn { margin-top: 10px; padding: 10px 24px; border-radius: 8px; background: var(--gc-accent); color: white; border: none; cursor: pointer; font-weight: 600; font-size: 14px; font-family: var(--gc-font); transition: background 0.15s, transform 0.15s; }
      #gemma-load-btn:hover { filter: brightness(1.1); transform: scale(1.02); }
      #gemma-load-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
      #gemma-load-status { font-size: 12px; color: var(--text-tertiary, #78716c); margin-top: 4px; }

      /* Progress bars */
      #gemma-progress-area { width: 100%; max-width: 280px; display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
      .gemma-progress-item { display: flex; flex-direction: column; gap: 2px; }
      .gemma-progress-label { font-size: 11px; color: var(--text-muted, #a8a29e); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .gemma-progress-bar { height: 4px; background: var(--surface-sunken, #efedeb); border-radius: 2px; overflow: hidden; }
      .gemma-progress-fill { height: 100%; background: var(--gc-accent); border-radius: 2px; transition: width 0.15s; }

      /* Chat bubbles */
      .gemma-msg { max-width: 88%; padding: 10px 14px; border-radius: 10px; font-size: 13.5px; line-height: 1.6; word-break: break-word; white-space: pre-wrap; }
      .gemma-msg.user { align-self: flex-end; background: var(--gc-accent); color: white; border-bottom-right-radius: 3px; }
      .gemma-msg.assistant { align-self: flex-start; background: var(--surface-raised, #f5f5f4); color: var(--text-primary, #1c1917); border: 1px solid var(--border-subtle, #e7e5e4); border-bottom-left-radius: 3px; }
      .gemma-msg.assistant code { background: var(--surface-sunken, #efedeb); padding: 1px 5px; border-radius: 4px; font-family: var(--font-mono, monospace); font-size: 12px; }

      /* Input */
      #gemma-input-area { padding: 10px 14px 12px; border-top: 1px solid var(--border-subtle, #e7e5e4); background: var(--surface-raised, #f5f5f4); flex-shrink: 0; }
      #gemma-tps { font-size: 11px; color: var(--text-muted, #a8a29e); text-align: center; min-height: 16px; margin-bottom: 4px; }
      #gemma-input-row { display: flex; align-items: flex-end; gap: 8px; }
      #gemma-input { flex: 1; resize: none; border: 1px solid var(--border-subtle, #e7e5e4); border-radius: 8px; padding: 8px 12px; font-size: 13.5px; font-family: var(--gc-font); background: var(--surface-page, #faf9f7); color: var(--text-primary, #1c1917); outline: none; max-height: 100px; overflow-y: auto; line-height: 1.5; }
      #gemma-input:focus { border-color: var(--gc-accent); box-shadow: 0 0 0 2px rgb(var(--gc-accent-rgb) / 0.15); }
      #gemma-input::placeholder { color: var(--text-muted, #a8a29e); }
      #gemma-send-btn { width: 36px; height: 36px; border-radius: 8px; background: var(--gc-accent); color: white; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: opacity 0.15s; }
      #gemma-send-btn:disabled { opacity: 0.35; cursor: not-allowed; }

      /* Mobile */
      @media (max-width: 480px) {
        #gemma-panel { width: calc(100vw - 16px); right: 8px; bottom: 78px; height: calc(100vh - 100px); }
        #gemma-fab { bottom: 14px; right: 14px; }
      }
    `;
    document.head.appendChild(style);
  }

  // ── Event Binding ─────────────────────────────────────────────

  function bindEvents() {
    const fab = document.getElementById('gemma-fab');
    const panel = document.getElementById('gemma-panel');
    const closeBtn = document.getElementById('gemma-close-btn');
    const resetBtn = document.getElementById('gemma-reset-btn');
    const loadBtn = document.getElementById('gemma-load-btn');
    const input = document.getElementById('gemma-input');
    const sendBtn = document.getElementById('gemma-send-btn');

    fab.addEventListener('click', () => {
      panel.classList.toggle('gemma-hidden');
      fab.classList.toggle('gemma-hidden');
      if (modelStatus === 'ready') input.focus();
    });

    closeBtn.addEventListener('click', () => {
      panel.classList.add('gemma-hidden');
      fab.classList.remove('gemma-hidden');
    });

    loadBtn.addEventListener('click', () => {
      loadBtn.disabled = true;
      loadBtn.textContent = 'Loading...';
      initWorker();
      worker.postMessage({ type: 'load' });
    });

    resetBtn.addEventListener('click', () => {
      messages = [];
      document.getElementById('gemma-messages').innerHTML = '';
      document.getElementById('gemma-tps').textContent = '';
      resetBtn.classList.add('gemma-hidden');
      worker.postMessage({ type: 'reset' });
    });

    input.addEventListener('input', () => {
      // Auto-resize
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 100) + 'px';
      sendBtn.disabled = input.value.trim().length === 0 && !isRunning;
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && input.value.trim() && !isRunning) {
        e.preventDefault();
        sendMessage();
      }
    });

    sendBtn.addEventListener('click', () => {
      if (isRunning) {
        worker.postMessage({ type: 'interrupt' });
      } else if (input.value.trim()) {
        sendMessage();
      }
    });
  }

  // ── Worker Init ───────────────────────────────────────────────

  function initWorker() {
    if (worker) return;

    worker = new Worker(new URL('/lib/vendor/gemma-chat/worker.js', location.origin), {
      type: 'module',
    });

    worker.addEventListener('message', onWorkerMessage);
  }

  function onWorkerMessage(e) {
    const { status, data, output, tps, numTokens } = e.data;

    switch (status) {
      case 'loading':
        setDot('loading');
        show('gemma-load-status', data);
        break;

      case 'initiate':
        show('gemma-progress-area');
        addProgressItem(e.data);
        break;

      case 'progress':
        updateProgressItem(e.data);
        break;

      case 'done':
        removeProgressItem(e.data.file);
        break;

      case 'ready':
        modelStatus = 'ready';
        setDot('ready');
        document.getElementById('gemma-welcome').classList.add('gemma-hidden');
        document.getElementById('gemma-input-area').classList.remove('gemma-hidden');
        document.getElementById('gemma-input').focus();
        break;

      case 'start':
        messages.push({ role: 'assistant', content: '' });
        appendBubble('assistant', '');
        break;

      case 'update': {
        const last = messages[messages.length - 1];
        last.content += output;
        updateLastBubble(last.content);
        if (tps) {
          document.getElementById('gemma-tps').textContent = `${tps.toFixed(1)} tok/s`;
        }
        scrollToBottom();
        break;
      }

      case 'complete':
        isRunning = false;
        toggleRunningUI(false);
        document.getElementById('gemma-reset-btn').classList.remove('gemma-hidden');
        break;

      case 'error':
        show('gemma-load-status', 'Error: ' + data);
        document.getElementById('gemma-load-btn').disabled = false;
        document.getElementById('gemma-load-btn').textContent = 'Retry';
        setDot('');
        break;
    }
  }

  // ── Send Message ──────────────────────────────────────────────

  function sendMessage() {
    const input = document.getElementById('gemma-input');
    const text = input.value.trim();
    if (!text) return;

    // Get current page content as context
    const pageContent = getPageContent();

    // Build message with context
    const userMsg = text;
    messages.push({ role: 'user', content: userMsg });

    appendBubble('user', text);
    input.value = '';
    input.style.height = 'auto';

    isRunning = true;
    toggleRunningUI(true);
    document.getElementById('gemma-tps').textContent = '';

    // Send messages with system context to worker
    const workerMessages = [
      { role: 'user', content: `${SYSTEM_PROMPT}\n\n--- CURRENT PAGE CONTENT ---\n${pageContent}\n--- END PAGE CONTENT ---\n\nUser question: ${messages.filter(m => m.role === 'user').map(m => m.content).join('\n')}` },
      ...messages.filter((_, i) => i > 0) // skip first user msg, already in system context
    ];

    // Simplified: just send the full conversation with context in first message
    const contextMessages = [];
    contextMessages.push({
      role: 'user',
      content: `${SYSTEM_PROMPT}\n\nPage context:\n${pageContent.slice(0, 4000)}`
    });
    contextMessages.push({
      role: 'assistant',
      content: 'Understood. I have the page context. How can I help?'
    });
    // Add actual conversation
    for (const m of messages) {
      contextMessages.push({ role: m.role, content: m.content });
    }

    worker.postMessage({ type: 'generate', data: contextMessages });
    scrollToBottom();
  }

  // ── Page Content Extraction ───────────────────────────────────

  function getPageContent() {
    // Docsify renders content in .markdown-section or article
    const el = document.querySelector('.markdown-section') ||
               document.querySelector('article') ||
               document.querySelector('#main') ||
               document.querySelector('.content');
    if (!el) return '(No page content found)';

    // Clone and strip scripts/styles
    const clone = el.cloneNode(true);
    clone.querySelectorAll('script, style, #gemma-chat').forEach(n => n.remove());
    return clone.textContent.replace(/\s+/g, ' ').trim();
  }

  // ── DOM Helpers ───────────────────────────────────────────────

  function appendBubble(role, text) {
    const container = document.getElementById('gemma-messages');
    const div = document.createElement('div');
    div.className = `gemma-msg ${role}`;
    div.textContent = text;
    container.appendChild(div);
    scrollToBottom();
  }

  function updateLastBubble(text) {
    const msgs = document.querySelectorAll('.gemma-msg.assistant');
    const last = msgs[msgs.length - 1];
    if (last) last.textContent = text;
  }

  function scrollToBottom() {
    const el = document.getElementById('gemma-messages');
    el.scrollTop = el.scrollHeight;
  }

  function setDot(state) {
    const dot = document.getElementById('gemma-dot');
    dot.className = state || '';
  }

  function show(id, text) {
    const el = document.getElementById(id);
    el.classList.remove('gemma-hidden');
    if (text !== undefined) el.textContent = text;
  }

  function toggleRunningUI(running) {
    const sendBtn = document.getElementById('gemma-send-btn');
    const sendIcon = document.getElementById('gemma-send-icon');
    const stopIcon = document.getElementById('gemma-stop-icon');
    const input = document.getElementById('gemma-input');

    if (running) {
      sendIcon.classList.add('gemma-hidden');
      stopIcon.classList.remove('gemma-hidden');
      sendBtn.disabled = false;
      input.disabled = true;
    } else {
      sendIcon.classList.remove('gemma-hidden');
      stopIcon.classList.add('gemma-hidden');
      sendBtn.disabled = true;
      input.disabled = false;
      input.focus();
    }
  }

  // ── Progress Bars ─────────────────────────────────────────────

  function addProgressItem({ file }) {
    const area = document.getElementById('gemma-progress-area');
    const item = document.createElement('div');
    item.className = 'gemma-progress-item';
    item.dataset.file = file;
    const shortName = file.split('/').pop();
    item.innerHTML = `
      <div class="gemma-progress-label">${shortName}</div>
      <div class="gemma-progress-bar"><div class="gemma-progress-fill" style="width: 0%"></div></div>
    `;
    area.appendChild(item);
  }

  function updateProgressItem({ file, progress }) {
    const item = document.querySelector(`.gemma-progress-item[data-file="${file}"]`);
    if (!item) return;
    const fill = item.querySelector('.gemma-progress-fill');
    if (fill) fill.style.width = `${(progress || 0).toFixed(0)}%`;
  }

  function removeProgressItem(file) {
    const item = document.querySelector(`.gemma-progress-item[data-file="${file}"]`);
    if (item) item.remove();
  }

  // ── Init on DOM ready ─────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createWidget);
  } else {
    createWidget();
  }

})();
