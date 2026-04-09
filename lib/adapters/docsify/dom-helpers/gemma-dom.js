// Gemma Chat — Shell (DOM creation, styles, rendering).
// Thin visual layer. No state, no worker. Dispatches events to orchestrator.

// --- CSS ---

const CSS = `
  #gemma-chat { --gc-accent: var(--accent, #0891b2); --gc-accent-rgb: var(--accent-rgb, 8 145 178); --gc-radius: 12px; --gc-font: var(--font-ui, -apple-system, BlinkMacSystemFont, system-ui, sans-serif); font-family: var(--gc-font); }
  .gemma-hidden { display: none !important; }

  /* FAB */
  #gemma-fab { position: fixed; bottom: 20px; right: 20px; z-index: 10000; width: 52px; height: 52px; border-radius: 50%; background: var(--gc-accent); color: white; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px rgb(var(--gc-accent-rgb) / 0.35); transition: transform 0.2s, box-shadow 0.2s; }
  #gemma-fab:hover { transform: scale(1.08); box-shadow: 0 6px 24px rgb(var(--gc-accent-rgb) / 0.45); }

  /* Panel */
  #gemma-panel { position: fixed; bottom: 84px; right: 20px; z-index: 10001; width: 400px; max-width: calc(100vw - 32px); height: 560px; max-height: calc(100vh - 120px); background: var(--surface-page, #faf9f7); border: 1px solid var(--border-subtle, #e7e5e4); border-radius: var(--gc-radius); box-shadow: 0 12px 48px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06); display: flex; flex-direction: column; overflow: hidden; animation: gemma-slide-up 0.25s cubic-bezier(0.25,1,0.5,1); }
  @keyframes gemma-slide-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

  /* Header */
  #gemma-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid var(--border-subtle, #e7e5e4); background: var(--surface-raised, #f5f5f4); flex-shrink: 0; }
  #gemma-title { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 14px; color: var(--text-primary, #1c1917); }
  #gemma-dot { width: 8px; height: 8px; border-radius: 50%; background: #a8a29e; flex-shrink: 0; }
  #gemma-dot.ready { background: #34d399; }
  #gemma-dot.loading { background: #fbbf24; animation: gemma-pulse 1.2s infinite; }
  @keyframes gemma-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  /* Model picker (header) */
  #gemma-title { position: relative; }
  #gemma-model-picker { background: none; border: 1px solid transparent; cursor: pointer; padding: 2px 6px; border-radius: 6px; display: flex; align-items: center; gap: 4px; font-weight: 600; font-size: 14px; color: var(--text-primary, #1c1917); font-family: var(--gc-font); transition: background 0.15s, border-color 0.15s; }
  #gemma-model-picker:hover { background: var(--surface-sunken, #efedeb); border-color: var(--border-subtle, #e7e5e4); }
  #gemma-model-picker svg { opacity: 0.5; transition: transform 0.2s; }
  #gemma-model-picker.open svg { transform: rotate(180deg); }

  /* Model dropdown — fixed position to escape panel overflow:hidden */
  #gemma-model-dropdown { position: fixed; min-width: 260px; background: var(--surface-page, #faf9f7); border: 1px solid var(--border-subtle, #e7e5e4); border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.12); z-index: 10002; overflow: hidden; animation: gemma-slide-down 0.15s ease-out; }
  .gemma-model-option { display: flex; flex-direction: column; gap: 1px; padding: 8px 12px; cursor: pointer; transition: background 0.1s; }
  .gemma-model-option:hover { background: rgb(var(--gc-accent-rgb) / 0.06); }
  .gemma-model-option.active { background: rgb(var(--gc-accent-rgb) / 0.08); }
  .gemma-model-option.loading { opacity: 0.5; pointer-events: none; }
  .gemma-model-option-row { display: flex; align-items: center; justify-content: space-between; }
  .gemma-model-option-name { font-size: 13px; font-weight: 600; color: var(--text-primary, #1c1917); }
  .gemma-model-option-check { color: var(--gc-accent); font-size: 14px; font-weight: 700; }
  .gemma-model-option-meta { font-size: 11px; color: var(--text-muted, #a8a29e); }
  .gemma-model-option + .gemma-model-option { border-top: 1px solid var(--border-subtle, #e7e5e4); }

  #gemma-header-actions { display: flex; gap: 4px; }
  #gemma-header-actions button { background: none; border: none; cursor: pointer; padding: 4px; border-radius: 6px; color: var(--text-tertiary, #78716c); display: flex; align-items: center; position: relative; }
  #gemma-header-actions button:hover { background: var(--surface-sunken, #efedeb); color: var(--text-primary, #1c1917); }

  /* Context count badge */
  #gemma-ctx-count { position: absolute; top: -4px; right: -4px; min-width: 16px; height: 16px; border-radius: 8px; background: var(--gc-accent); color: white; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; padding: 0 4px; }

  /* Context Panel */
  #gemma-ctx-panel { border-bottom: 1px solid var(--border-subtle, #e7e5e4); background: var(--surface-raised, #f5f5f4); flex-shrink: 0; max-height: 280px; display: flex; flex-direction: column; animation: gemma-slide-down 0.2s ease-out; }
  @keyframes gemma-slide-down { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 280px; } }
  #gemma-ctx-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px 4px; }
  #gemma-ctx-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-tertiary, #78716c); }
  #gemma-ctx-tokens { font-size: 11px; color: var(--text-muted, #a8a29e); font-variant-numeric: tabular-nums; }
  #gemma-ctx-actions { display: flex; gap: 6px; padding: 4px 14px 8px; }
  #gemma-ctx-actions button { font-size: 11px; padding: 3px 10px; border-radius: 5px; border: 1px solid var(--border-subtle, #e7e5e4); background: var(--surface-page, #faf9f7); color: var(--text-secondary, #44403c); cursor: pointer; font-family: var(--gc-font); }
  #gemma-ctx-actions button:hover { border-color: var(--gc-accent); color: var(--gc-accent); }

  /* Context list */
  #gemma-ctx-list { overflow-y: auto; padding: 0 14px 8px; flex: 1; }
  #gemma-ctx-list::-webkit-scrollbar { width: 4px; }
  #gemma-ctx-list::-webkit-scrollbar-thumb { background: var(--border-subtle, #e7e5e4); border-radius: 4px; }
  .gemma-ctx-group { font-size: 11px; font-weight: 600; color: var(--text-tertiary, #78716c); margin: 8px 0 4px; text-transform: uppercase; letter-spacing: 0.3px; }
  .gemma-ctx-group:first-child { margin-top: 0; }
  .gemma-ctx-item { display: flex; align-items: center; gap: 8px; padding: 4px 0; cursor: pointer; }
  .gemma-ctx-item:hover { color: var(--gc-accent); }
  .gemma-ctx-item input[type="checkbox"] { accent-color: var(--gc-accent); width: 14px; height: 14px; cursor: pointer; flex-shrink: 0; }
  .gemma-ctx-item label { font-size: 13px; color: var(--text-primary, #1c1917); cursor: pointer; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .gemma-ctx-item .gemma-ctx-size { font-size: 10px; color: var(--text-muted, #a8a29e); flex-shrink: 0; font-variant-numeric: tabular-nums; }
  .gemma-ctx-item.current label { font-weight: 600; }
  .gemma-ctx-item.current label::after { content: ' (current)'; font-weight: 400; font-size: 11px; color: var(--gc-accent); }

  /* Context capacity bar */
  #gemma-ctx-bar-wrap { padding: 6px 14px 10px; display: flex; align-items: center; gap: 8px; }
  #gemma-ctx-bar { flex: 1; height: 4px; background: var(--surface-sunken, #efedeb); border-radius: 2px; overflow: hidden; }
  #gemma-ctx-bar-fill { height: 100%; background: var(--gc-accent); border-radius: 2px; transition: width 0.2s, background 0.2s; width: 0%; }
  #gemma-ctx-bar-fill.warn { background: #f59e0b; }
  #gemma-ctx-bar-fill.over { background: #ef4444; }
  #gemma-ctx-bar-label { font-size: 10px; color: var(--text-muted, #a8a29e); white-space: nowrap; font-variant-numeric: tabular-nums; }

  /* Messages */
  #gemma-messages { flex: 1; overflow-y: auto; padding: 16px 14px; display: flex; flex-direction: column; gap: 12px; }
  #gemma-messages::-webkit-scrollbar { width: 4px; }
  #gemma-messages::-webkit-scrollbar-thumb { background: var(--border-subtle, #e7e5e4); border-radius: 4px; }

  /* Welcome */
  #gemma-welcome { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; flex: 1; gap: 6px; padding: 20px 10px; }
  #gemma-welcome-icon { color: var(--text-muted, #a8a29e); margin-bottom: 4px; }
  #gemma-welcome-title { font-size: 16px; font-weight: 700; color: var(--text-primary, #1c1917); margin: 0; }
  #gemma-welcome-sub { font-size: 13px; color: var(--text-tertiary, #78716c); line-height: 1.5; margin: 0; }
  #gemma-model-select { margin-top: 10px; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-subtle, #e7e5e4); background: var(--surface-page, #faf9f7); color: var(--text-primary, #1c1917); font-size: 13px; font-family: var(--gc-font); cursor: pointer; width: 100%; max-width: 260px; }
  #gemma-model-select:focus { border-color: var(--gc-accent); outline: none; box-shadow: 0 0 0 2px rgb(var(--gc-accent-rgb) / 0.15); }
  #gemma-load-btn { margin-top: 8px; padding: 10px 24px; border-radius: 8px; background: var(--gc-accent); color: white; border: none; cursor: pointer; font-weight: 600; font-size: 14px; font-family: var(--gc-font); transition: background 0.15s, transform 0.15s; }
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

  /* Action bubbles (tool calls) */
  .gemma-msg.action { align-self: center; max-width: 95%; background: var(--surface-sunken, #efedeb); border: 1px dashed var(--border-subtle, #e7e5e4); border-radius: 8px; padding: 8px 12px; font-size: 12px; white-space: normal; }
  .gemma-action-header { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
  .gemma-action-icon { width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
  .gemma-action-icon.success { background: rgb(52 211 153 / 0.2); color: #059669; }
  .gemma-action-icon.error { background: rgb(239 68 68 / 0.2); color: #dc2626; }
  .gemma-action-name { font-weight: 600; color: var(--text-secondary, #44403c); font-family: var(--font-mono, monospace); }
  .gemma-action-args { color: var(--text-muted, #a8a29e); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .gemma-action-result { color: var(--text-tertiary, #78716c); font-size: 11.5px; line-height: 1.5; white-space: pre-wrap; }

  /* Autocomplete dropdown */
  #gemma-autocomplete { position: absolute; bottom: 100%; left: 0; right: 0; max-height: 200px; overflow-y: auto; background: var(--surface-page, #faf9f7); border: 1px solid var(--border-subtle, #e7e5e4); border-radius: 8px; box-shadow: 0 -4px 16px rgba(0,0,0,0.08); margin-bottom: 4px; z-index: 10; }
  #gemma-autocomplete::-webkit-scrollbar { width: 4px; }
  #gemma-autocomplete::-webkit-scrollbar-thumb { background: var(--border-subtle, #e7e5e4); border-radius: 4px; }
  .gemma-ac-group { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted, #a8a29e); padding: 6px 10px 2px; }
  .gemma-ac-item { display: flex; align-items: center; gap: 8px; padding: 6px 10px; cursor: pointer; font-size: 13px; color: var(--text-primary, #1c1917); }
  .gemma-ac-item:hover, .gemma-ac-item.active { background: rgb(var(--gc-accent-rgb) / 0.08); }
  .gemma-ac-item.active { color: var(--gc-accent); }
  .gemma-ac-icon { width: 20px; height: 20px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 11px; flex-shrink: 0; }
  .gemma-ac-icon.page { background: rgb(var(--gc-accent-rgb) / 0.1); color: var(--gc-accent); }
  .gemma-ac-icon.tool { background: rgb(99 102 241 / 0.1); color: #6366f1; }
  .gemma-ac-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .gemma-ac-hint { font-size: 11px; color: var(--text-muted, #a8a29e); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px; }
  .gemma-ac-trigger { display: inline; padding: 0 2px; border-radius: 3px; font-weight: 600; }
  .gemma-ac-trigger.page { color: var(--gc-accent); }
  .gemma-ac-trigger.tool { color: #6366f1; }

  /* Input */
  #gemma-input-area { padding: 10px 14px 12px; border-top: 1px solid var(--border-subtle, #e7e5e4); background: var(--surface-raised, #f5f5f4); flex-shrink: 0; position: relative; }
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

// --- HTML template ---

const WIDGET_HTML = `
  <button id="gemma-fab" aria-label="Open AI chat">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  </button>

  <div id="gemma-panel" class="gemma-hidden">
    <div id="gemma-header">
      <div id="gemma-title">
        <span id="gemma-dot"></span>
        <button id="gemma-model-picker">
          <span id="gemma-model-name">Gemma 4 E2B</span>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 4l3 3 3-3"/></svg>
        </button>
      </div>
      <div id="gemma-header-actions">
        <button id="gemma-ctx-btn" title="Select context pages" class="gemma-hidden">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          <span id="gemma-ctx-count">0</span>
        </button>
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

    <div id="gemma-ctx-panel" class="gemma-hidden">
      <div id="gemma-ctx-header">
        <span id="gemma-ctx-title">Context Pages</span>
        <span id="gemma-ctx-tokens">0 tokens</span>
      </div>
      <div id="gemma-ctx-actions">
        <button id="gemma-ctx-all">All</button>
        <button id="gemma-ctx-none">None</button>
        <button id="gemma-ctx-current">Current Page</button>
      </div>
      <div id="gemma-ctx-list"></div>
      <div id="gemma-ctx-bar-wrap">
        <div id="gemma-ctx-bar"><div id="gemma-ctx-bar-fill"></div></div>
        <span id="gemma-ctx-bar-label">0 / 120K tokens</span>
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
        <select id="gemma-model-select"></select>
        <button id="gemma-load-btn">Load Model</button>
        <div id="gemma-progress-area" class="gemma-hidden"></div>
        <div id="gemma-load-status" class="gemma-hidden"></div>
      </div>
    </div>

    <div id="gemma-input-area" class="gemma-hidden">
      <div id="gemma-tps"></div>
      <div id="gemma-input-row">
        <textarea id="gemma-input" placeholder="Ask about the docs..." rows="1"></textarea>
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

// --- DOM API ---

export function createWidget() {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const container = document.createElement('div');
  container.id = 'gemma-chat';
  container.innerHTML = WIDGET_HTML;
  document.body.appendChild(container);

  // Model dropdown lives on body to escape panel overflow:hidden
  const dd = document.createElement('div');
  dd.id = 'gemma-model-dropdown';
  dd.className = 'gemma-hidden';
  document.body.appendChild(dd);

  return container;
}

export function $(id) { return document.getElementById(id); }

export function show(id, text) {
  const el = $(id);
  el.classList.remove('gemma-hidden');
  if (text !== undefined) el.textContent = text;
}

export function hide(id) {
  $(id).classList.add('gemma-hidden');
}

export function toggle(id) {
  $(id).classList.toggle('gemma-hidden');
}

// --- Status dot ---

export function setDot(state) {
  $('gemma-dot').className = state || '';
}

// --- Messages ---

export function appendBubble(role, text) {
  const container = $('gemma-messages');
  const div = document.createElement('div');
  div.className = `gemma-msg ${role}`;
  div.textContent = text;
  container.appendChild(div);
  scrollToBottom();
}

export function updateLastBubble(text) {
  const msgs = document.querySelectorAll('.gemma-msg.assistant');
  const last = msgs[msgs.length - 1];
  if (last) last.textContent = text;
}

export function clearMessages() {
  $('gemma-messages').innerHTML = '';
}

export function appendActionBubble(toolName, args, result) {
  const container = $('gemma-messages');
  const div = document.createElement('div');
  div.className = 'gemma-msg action';

  const icon = result.success ? '\u2713' : '\u2717';
  const argsStr = Object.entries(args).map(([k, v]) => `${k}: ${v}`).join(', ');
  const escapedMsg = result.message ? result.message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
  div.innerHTML = `
    <div class="gemma-action-header">
      <span class="gemma-action-icon ${result.success ? 'success' : 'error'}">${icon}</span>
      <span class="gemma-action-name">${toolName}</span>
      <span class="gemma-action-args">${argsStr}</span>
    </div>
    ${escapedMsg ? `<div class="gemma-action-result">${escapedMsg}</div>` : ''}
  `;
  container.appendChild(div);
  scrollToBottom();
}

export function scrollToBottom() {
  const el = $('gemma-messages');
  el.scrollTop = el.scrollHeight;
}

// --- TPS display ---

export function setTps(text) {
  $('gemma-tps').textContent = text;
}

// --- Running UI toggle ---

export function toggleRunningUI(running) {
  const sendBtn = $('gemma-send-btn');
  const sendIcon = $('gemma-send-icon');
  const stopIcon = $('gemma-stop-icon');
  const input = $('gemma-input');

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

// --- Progress bars ---

export function addProgressItem(file) {
  const area = $('gemma-progress-area');
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

export function updateProgressItem(file, progress) {
  const item = document.querySelector(`.gemma-progress-item[data-file="${file}"]`);
  if (!item) return;
  const fill = item.querySelector('.gemma-progress-fill');
  if (fill) fill.style.width = `${(progress || 0).toFixed(0)}%`;
}

export function removeProgressItem(file) {
  const item = document.querySelector(`.gemma-progress-item[data-file="${file}"]`);
  if (item) item.remove();
}

// --- Context list rendering ---

export function renderContextList(engine, currentPath, onCheckboxChange) {
  const list = $('gemma-ctx-list');
  const allPages = [...engine.getSidebarPages()];
  const selectedPaths = engine.getSelectedPaths();
  const currentInSidebar = allPages.some(p => p.path === currentPath);
  if (!currentInSidebar && currentPath !== '/') {
    allPages.unshift({ title: 'Current Page', path: currentPath, group: 'Active' });
  }

  const groups = {};
  for (const page of allPages) {
    if (!groups[page.group]) groups[page.group] = [];
    groups[page.group].push(page);
  }

  let html = '';
  for (const [group, pages] of Object.entries(groups)) {
    html += `<div class="gemma-ctx-group">${group}</div>`;
    for (const page of pages) {
      const id = 'gc-' + page.path.replace(/[^a-z0-9]/gi, '-');
      const checked = selectedPaths.has(page.path) ? 'checked' : '';
      const isCurrent = page.path === currentPath ? ' current' : '';
      const cached = engine.getCachedPage(page.path);
      const sizeLabel = cached ? `~${engine.formatTokens(engine.estimateTokens(cached))}` : '';
      html += `
        <div class="gemma-ctx-item${isCurrent}">
          <input type="checkbox" id="${id}" data-path="${page.path}" ${checked}>
          <label for="${id}">${page.title}</label>
          <span class="gemma-ctx-size">${sizeLabel}</span>
        </div>
      `;
    }
  }

  list.innerHTML = html;

  list.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => onCheckboxChange(cb.dataset.path, cb.checked));
  });
}

// --- Token counter UI ---

export function updateTokenCounterUI(engine) {
  const selectedPaths = engine.getSelectedPaths();
  const totalTokens = engine.getSelectedTokenCount();
  const maxTokens = engine.getMaxTokens();

  $('gemma-ctx-count').textContent = selectedPaths.size;
  $('gemma-ctx-tokens').textContent = `~${engine.formatTokens(totalTokens)} tokens`;

  const pct = Math.min((totalTokens / maxTokens) * 100, 100);
  const barFill = $('gemma-ctx-bar-fill');
  barFill.style.width = pct + '%';
  barFill.className = pct > 90 ? 'over' : pct > 70 ? 'warn' : '';
  $('gemma-ctx-bar-label').textContent = `${engine.formatTokens(totalTokens)} / ${engine.formatTokens(maxTokens)}`;
}

// --- Model picker (header dropdown) ---

let _models = [];
let _selectedModelId = null;
let _onModelChange = null;

export function populateModelSelect(models, onModelChange) {
  _models = models;
  _onModelChange = onModelChange;
  if (!_selectedModelId && models.length > 0) _selectedModelId = models[0].id;
  updateModelName();
  // Also populate welcome screen select
  const welcomeSelect = $('gemma-model-select');
  if (welcomeSelect) {
    welcomeSelect.innerHTML = '';
    for (const m of models) {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = `${m.label} (${m.params}, ${m.size}) — ${m.speed}`;
      welcomeSelect.appendChild(opt);
    }
    welcomeSelect.addEventListener('change', () => {
      _selectedModelId = welcomeSelect.value;
      updateModelName();
    });
  }
}

function updateModelName() {
  const m = _models.find(m => m.id === _selectedModelId);
  if (m) $('gemma-model-name').textContent = m.label;
}

function renderModelDropdown() {
  const dd = $('gemma-model-dropdown');
  let html = '';
  for (const m of _models) {
    const active = m.id === _selectedModelId ? ' active' : '';
    const check = m.id === _selectedModelId ? '<span class="gemma-model-option-check">✓</span>' : '';
    html += `<div class="gemma-model-option${active}" data-model-id="${m.id}">
      <div class="gemma-model-option-row">
        <span class="gemma-model-option-name">${m.label}</span>
        ${check}
      </div>
      <span class="gemma-model-option-meta">${m.params} · ${m.size} · ${m.speed}</span>
    </div>`;
  }
  dd.innerHTML = html;

  dd.querySelectorAll('.gemma-model-option').forEach(opt => {
    opt.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const id = opt.dataset.modelId;
      if (id === _selectedModelId) {
        toggleModelDropdown(false);
        return;
      }
      _selectedModelId = id;
      updateModelName();
      toggleModelDropdown(false);
      // Sync welcome select
      const welcomeSelect = $('gemma-model-select');
      if (welcomeSelect) welcomeSelect.value = id;
      if (_onModelChange) _onModelChange(id);
    });
  });
}

export function toggleModelDropdown(forceState) {
  const dd = $('gemma-model-dropdown');
  const picker = $('gemma-model-picker');
  if (!dd || !picker) { console.warn('[gemma-dom] dropdown or picker not found'); return; }

  const isOpen = forceState !== undefined ? !forceState : !dd.classList.contains('gemma-hidden');
  console.log('[gemma-dom] toggleModelDropdown', { forceState, isOpen, willOpen: !isOpen });

  if (isOpen) {
    dd.classList.add('gemma-hidden');
    picker.classList.remove('open');
  } else {
    renderModelDropdown();
    const rect = picker.getBoundingClientRect();
    console.log('[gemma-dom] picker rect:', rect, 'models:', _models.length);
    dd.style.top = (rect.bottom + 4) + 'px';
    dd.style.left = rect.left + 'px';
    dd.classList.remove('gemma-hidden');
    picker.classList.add('open');
    console.log('[gemma-dom] dropdown shown, innerHTML length:', dd.innerHTML.length);
  }
}

export function getSelectedModelId() {
  return _selectedModelId;
}

export function setModelSelectDisabled(disabled) {
  $('gemma-model-picker').disabled = disabled;
  const welcomeSelect = $('gemma-model-select');
  if (welcomeSelect) welcomeSelect.disabled = disabled;
}

// --- Autocomplete dropdown ---

let acEl = null;
let acItems = [];
let acIndex = -1;

function ensureAcEl() {
  if (acEl) return acEl;
  acEl = document.createElement('div');
  acEl.id = 'gemma-autocomplete';
  acEl.className = 'gemma-hidden';
  $('gemma-input-area').appendChild(acEl);
  return acEl;
}

export function showAutocomplete(items, type, onSelect) {
  const el = ensureAcEl();
  acItems = items;
  acIndex = -1;

  if (items.length === 0) { hideAutocomplete(); return; }

  // Group items
  const groups = {};
  for (const item of items) {
    const g = item.group || (type === 'page' ? 'Pages' : 'Tools');
    if (!groups[g]) groups[g] = [];
    groups[g].push(item);
  }

  let html = '';
  let idx = 0;
  for (const [group, groupItems] of Object.entries(groups)) {
    html += `<div class="gemma-ac-group">${group}</div>`;
    for (const item of groupItems) {
      const icon = type === 'page' ? '@' : '/';
      const iconClass = type === 'page' ? 'page' : 'tool';
      const hint = item.description || item.value || '';
      html += `<div class="gemma-ac-item" data-idx="${idx}" data-value="${item.label}" data-type="${type}">
        <span class="gemma-ac-icon ${iconClass}">${icon}</span>
        <span class="gemma-ac-label">${item.label}</span>
        ${hint ? `<span class="gemma-ac-hint">${hint}</span>` : ''}
      </div>`;
      idx++;
    }
  }

  el.innerHTML = html;
  el.classList.remove('gemma-hidden');

  // Click handler
  el.querySelectorAll('.gemma-ac-item').forEach(item => {
    item.addEventListener('mousedown', (e) => {
      e.preventDefault(); // don't blur input
      onSelect(item.dataset.value, item.dataset.type);
    });
  });
}

export function hideAutocomplete() {
  if (acEl) {
    acEl.classList.add('gemma-hidden');
    acEl.innerHTML = '';
  }
  acItems = [];
  acIndex = -1;
}

export function isAutocompleteVisible() {
  return acEl && !acEl.classList.contains('gemma-hidden');
}

export function autocompleteNavigate(direction) {
  if (!acItems.length) return null;
  const items = acEl.querySelectorAll('.gemma-ac-item');
  if (acIndex >= 0 && acIndex < items.length) items[acIndex].classList.remove('active');

  if (direction === 'up') {
    acIndex = acIndex <= 0 ? items.length - 1 : acIndex - 1;
  } else {
    acIndex = acIndex >= items.length - 1 ? 0 : acIndex + 1;
  }

  items[acIndex].classList.add('active');
  items[acIndex].scrollIntoView({ block: 'nearest' });
  return { value: items[acIndex].dataset.value, type: items[acIndex].dataset.type };
}

export function autocompleteSelect() {
  const items = acEl?.querySelectorAll('.gemma-ac-item');
  if (!items || items.length === 0) return null;
  // If nothing highlighted, select first item
  const idx = acIndex >= 0 ? acIndex : 0;
  return { value: items[idx].dataset.value, type: items[idx].dataset.type };
}
