/**
 * Gemma 4 E2B — Floating Chat Widget for DocsifyTemplate
 *
 * Self-contained: creates its own DOM, worker, and styles.
 * Context selector: pick which doc pages to feed into the 128K context window.
 * Opt-in: model only downloads when user clicks "Load Model".
 */

(function () {
  'use strict';

  const SYSTEM_PROMPT = `You are a helpful documentation assistant. Answer questions using ONLY the documentation context provided below. Be concise and direct. If the answer is in the context, cite which section. If not, say so honestly.`;

  // ~4 chars per token is a rough estimate for English text
  const CHARS_PER_TOKEN = 4;
  const MAX_CONTEXT_TOKENS = 120000; // leave room for conversation in 128K window

  let worker = null;
  let messages = [];
  let isRunning = false;
  let modelStatus = null;

  // Context system
  let sidebarPages = [];       // { title, path, group }
  let pageCache = {};          // path → text content
  let selectedPaths = new Set(); // paths user has checked
  let contextPanelOpen = false;

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

        <!-- Context Selector Panel -->
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
            <button id="gemma-load-btn">Load Model (~1.5 GB)</button>
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
    document.body.appendChild(container);
    injectStyles();
    bindEvents();
    parseSidebar();
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
      #gemma-panel { position: fixed; bottom: 84px; right: 20px; z-index: 10001; width: 400px; max-width: calc(100vw - 32px); height: 560px; max-height: calc(100vh - 120px); background: var(--surface-page, #faf9f7); border: 1px solid var(--border-subtle, #e7e5e4); border-radius: var(--gc-radius); box-shadow: 0 12px 48px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06); display: flex; flex-direction: column; overflow: hidden; animation: gemma-slide-up 0.25s cubic-bezier(0.25,1,0.5,1); }
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

  // ── Sidebar Parsing ───────────────────────────────────────────

  async function parseSidebar() {
    try {
      const res = await fetch('/_sidebar.md');
      if (!res.ok) return;
      const text = await res.text();

      let currentGroup = 'Pages';
      const pages = [];

      for (const line of text.split('\n')) {
        const trimmed = line.trim();
        // Group header: "* Guide" or "* How-To Guides" (no link)
        const groupMatch = trimmed.match(/^\*\s+([^[]+)$/);
        if (groupMatch) {
          currentGroup = groupMatch[1].trim();
          continue;
        }
        // Page link: "* [Title](/path)"  or "  * [Title](/path)"
        const linkMatch = trimmed.match(/\*\s+\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch) {
          pages.push({
            title: linkMatch[1],
            path: linkMatch[2],
            group: currentGroup,
          });
        }
      }

      sidebarPages = pages;
    } catch (e) {
      // Sidebar not available — fall back to current page only
    }
  }

  // ── Page Fetching ─────────────────────────────────────────────

  async function fetchPage(path) {
    if (pageCache[path]) return pageCache[path];

    // Docsify serves markdown from /path.md or /path/README.md
    let mdPath = path.endsWith('/') ? path + 'README.md' : path + '.md';
    // Ensure leading slash
    if (!mdPath.startsWith('/')) mdPath = '/' + mdPath;

    try {
      const res = await fetch(mdPath);
      if (!res.ok) throw new Error(res.status);
      const md = await res.text();
      // Strip YAML frontmatter
      const stripped = md.replace(/^---[\s\S]*?---\s*/, '');
      pageCache[path] = stripped;
      return stripped;
    } catch {
      pageCache[path] = '';
      return '';
    }
  }

  function getCurrentPagePath() {
    // Docsify uses hash routing: #/content/guide/getting-started
    const hash = location.hash.replace(/^#/, '') || '/';
    return hash.split('?')[0];
  }

  function getPageContent() {
    const el = document.querySelector('.markdown-section') ||
               document.querySelector('article') ||
               document.querySelector('#main');
    if (!el) return '';
    const clone = el.cloneNode(true);
    clone.querySelectorAll('script, style, #gemma-chat').forEach(n => n.remove());
    return clone.textContent.replace(/\s+/g, ' ').trim();
  }

  function estimateTokens(text) {
    return Math.ceil(text.length / CHARS_PER_TOKEN);
  }

  // ── Context Panel Rendering ───────────────────────────────────

  function renderContextList() {
    const list = document.getElementById('gemma-ctx-list');
    const currentPath = getCurrentPagePath();

    // Always include current page as an option
    let allPages = [...sidebarPages];
    const currentInSidebar = allPages.some(p => p.path === currentPath);
    if (!currentInSidebar && currentPath !== '/') {
      allPages.unshift({ title: 'Current Page', path: currentPath, group: 'Active' });
    }

    // Group pages
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
        const cached = pageCache[page.path];
        const sizeLabel = cached ? `~${formatTokens(estimateTokens(cached))}` : '';
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

    // Bind checkbox events
    list.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', async () => {
        const path = cb.dataset.path;
        if (cb.checked) {
          selectedPaths.add(path);
          // Fetch if not cached
          if (!pageCache[path]) {
            await fetchPage(path);
            renderContextList(); // re-render to show size
            return;
          }
        } else {
          selectedPaths.delete(path);
        }
        updateTokenCounter();
      });
    });

    updateTokenCounter();
  }

  function updateTokenCounter() {
    let totalTokens = 0;
    for (const path of selectedPaths) {
      const text = pageCache[path] || '';
      totalTokens += estimateTokens(text);
    }

    const countEl = document.getElementById('gemma-ctx-count');
    const tokensEl = document.getElementById('gemma-ctx-tokens');
    const barFill = document.getElementById('gemma-ctx-bar-fill');
    const barLabel = document.getElementById('gemma-ctx-bar-label');

    countEl.textContent = selectedPaths.size;
    tokensEl.textContent = `~${formatTokens(totalTokens)} tokens`;

    const pct = Math.min((totalTokens / MAX_CONTEXT_TOKENS) * 100, 100);
    barFill.style.width = pct + '%';
    barFill.className = pct > 90 ? 'over' : pct > 70 ? 'warn' : '';
    barLabel.textContent = `${formatTokens(totalTokens)} / ${formatTokens(MAX_CONTEXT_TOKENS)}`;
  }

  function formatTokens(n) {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  }

  // ── Build Context String ──────────────────────────────────────

  async function buildContext() {
    const parts = [];

    if (selectedPaths.size === 0) {
      // Fallback: use current page DOM content
      const content = getPageContent();
      if (content) parts.push(`## Current Page\n${content}`);
    } else {
      for (const path of selectedPaths) {
        let text = pageCache[path];
        if (!text) {
          text = await fetchPage(path);
        }
        if (text) {
          const page = sidebarPages.find(p => p.path === path);
          const title = page ? page.title : path;
          parts.push(`## ${title} (${path})\n${text}`);
        }
      }
    }

    let context = parts.join('\n\n---\n\n');

    // Truncate if over limit
    const maxChars = MAX_CONTEXT_TOKENS * CHARS_PER_TOKEN;
    if (context.length > maxChars) {
      context = context.slice(0, maxChars) + '\n\n[...truncated]';
    }

    return context;
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
    const ctxBtn = document.getElementById('gemma-ctx-btn');
    const ctxPanel = document.getElementById('gemma-ctx-panel');

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

    // Context panel toggle
    ctxBtn.addEventListener('click', async () => {
      contextPanelOpen = !contextPanelOpen;
      if (contextPanelOpen) {
        ctxPanel.classList.remove('gemma-hidden');
        // Auto-select current page if nothing selected
        if (selectedPaths.size === 0) {
          await autoSelectCurrentPage();
        }
        renderContextList();
      } else {
        ctxPanel.classList.add('gemma-hidden');
      }
    });

    // Context quick actions
    document.getElementById('gemma-ctx-all').addEventListener('click', async () => {
      for (const page of sidebarPages) {
        selectedPaths.add(page.path);
        if (!pageCache[page.path]) await fetchPage(page.path);
      }
      renderContextList();
    });

    document.getElementById('gemma-ctx-none').addEventListener('click', () => {
      selectedPaths.clear();
      renderContextList();
    });

    document.getElementById('gemma-ctx-current').addEventListener('click', async () => {
      selectedPaths.clear();
      await autoSelectCurrentPage();
      renderContextList();
    });

    input.addEventListener('input', () => {
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

  async function autoSelectCurrentPage() {
    const currentPath = getCurrentPagePath();
    selectedPaths.add(currentPath);
    // Cache current page from DOM (faster than fetching)
    if (!pageCache[currentPath]) {
      pageCache[currentPath] = getPageContent();
    }
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
        document.getElementById('gemma-ctx-btn').classList.remove('gemma-hidden');
        document.getElementById('gemma-input').focus();
        // Auto-select current page
        autoSelectCurrentPage().then(() => updateTokenCounter());
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

  async function sendMessage() {
    const input = document.getElementById('gemma-input');
    const text = input.value.trim();
    if (!text) return;

    messages.push({ role: 'user', content: text });
    appendBubble('user', text);
    input.value = '';
    input.style.height = 'auto';

    isRunning = true;
    toggleRunningUI(true);
    document.getElementById('gemma-tps').textContent = '';

    // Build context from selected pages
    const context = await buildContext();

    // Build conversation for the worker
    const contextMessages = [];
    contextMessages.push({
      role: 'user',
      content: `${SYSTEM_PROMPT}\n\n--- DOCUMENTATION CONTEXT ---\n${context}\n--- END CONTEXT ---`
    });
    contextMessages.push({
      role: 'assistant',
      content: 'I have the documentation context loaded. How can I help?'
    });
    // Append full conversation history
    for (const m of messages) {
      contextMessages.push({ role: m.role, content: m.content });
    }

    worker.postMessage({ type: 'generate', data: contextMessages });
    scrollToBottom();
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

  // ── Init ──────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createWidget);
  } else {
    createWidget();
  }

})();
