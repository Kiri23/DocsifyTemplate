// Docsify Adapter for @docsify-template/chat
// Bridges chat engine ↔ Web Worker ↔ DOM shell.
// Knows about Docsify (sidebar discovery, hash routing). No rendering logic.
// Config is injected via injectGemmaChat(config) — no global config import.

import { createChatEngine, getModelCatalog } from '../core/chat-engine.js';
import {
  createWidget, $, show, hide, toggle, setDot,
  appendBubble, updateLastBubble, clearMessages, scrollToBottom,
  appendActionBubble,
  setTps, toggleRunningUI,
  addProgressItem, updateProgressItem, removeProgressItem,
  renderContextList, updateTokenCounterUI,
  showAutocomplete, hideAutocomplete, isAutocompleteVisible,
  autocompleteNavigate, autocompleteSelect,
  populateModelSelect, getSelectedModelId, setModelSelectDisabled,
  toggleModelDropdown
} from '../ui/chat-dom.js';

let engine = null;
let worker = null;
let contextPanelOpen = false;
let _config = {}; // Injected config, stored for tool gating

// --- Docsify integration: sidebar parsing ---

async function parseSidebar() {
  try {
    // Try common sidebar locations (depends on server root vs docsify basePath)
    let res = await fetch('/_sidebar.md');
    if (!res.ok) res = await fetch('/docs/_sidebar.md');
    console.log('[gemma-chat] parseSidebar fetch:', res.status, res.url);
    if (!res.ok) { console.warn('[gemma-chat] sidebar fetch failed:', res.status); return; }
    const text = await res.text();
    console.log('[gemma-chat] sidebar raw text:', text.slice(0, 200));

    let currentGroup = 'Pages';
    const pages = [];

    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      const groupMatch = trimmed.match(/^\*\s+([^[]+)$/);
      if (groupMatch) {
        currentGroup = groupMatch[1].trim();
        continue;
      }
      const linkMatch = trimmed.match(/\*\s+\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        pages.push({ title: linkMatch[1], path: linkMatch[2], group: currentGroup });
      }
    }

    console.log('[gemma-chat] parsed sidebar pages:', pages.length, pages.map(p => p.path));
    engine.setSidebarPages(pages);
  } catch (e) {
    console.error('[gemma-chat] parseSidebar error:', e);
  }
}

// --- Docsify integration: current page ---

function getCurrentPagePath() {
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

// --- Page fetching ---

async function fetchPage(path) {
  if (engine.getCachedPage(path)) return engine.getCachedPage(path);

  let mdPath = path.endsWith('/') ? path + 'README.md' : path + '.md';
  if (!mdPath.startsWith('/')) mdPath = '/' + mdPath;

  try {
    const res = await fetch(mdPath);
    if (!res.ok) throw new Error(res.status);
    const md = await res.text();
    const stripped = md.replace(/^---[\s\S]*?---\s*/, '');
    engine.cachePage(path, stripped);
    return stripped;
  } catch {
    engine.cachePage(path, '');
    return '';
  }
}

async function autoSelectCurrentPage() {
  const currentPath = getCurrentPagePath();
  engine.selectPath(currentPath);
  if (!engine.getCachedPage(currentPath)) {
    engine.cachePage(currentPath, getPageContent());
  }
}

// --- Context list refresh ---

function refreshContextList() {
  renderContextList(engine, getCurrentPagePath(), async (path, checked) => {
    if (checked) {
      engine.selectPath(path);
      if (!engine.getCachedPage(path)) {
        await fetchPage(path);
        refreshContextList();
        return;
      }
    } else {
      engine.deselectPath(path);
    }
    updateTokenCounterUI(engine);
  });
  updateTokenCounterUI(engine);
}

// --- Tool executors (Docsify-specific actions) ---

const toolExecutors = {
  export_page: async ({ format }) => {
    const fmtMap = { pdf: 'pdf', 'latex-branded': 'latex-branded', latex: 'latex-branded', markdown: 'markdown' };
    const fmtValue = fmtMap[format] || 'pdf';

    // Trigger export via the DOM export bar (adapter doesn't own the pipeline)
    const select = document.querySelector('.latex-export-select');
    const btn = document.querySelector('.latex-export-btn');
    if (!select || !btn) return { success: false, message: 'Export UI not found — is export enabled?' };

    select.value = fmtValue;
    select.dispatchEvent(new Event('change'));
    btn.click();
    return { success: true, message: `Exporting page as ${format}...` };
  },

  navigate_to_page: async ({ path }) => {
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    location.hash = '#' + cleanPath;
    return { success: true, message: `Navigated to ${cleanPath}` };
  },

  switch_tab: async ({ tab }) => {
    const tabEl = document.querySelector(`[hx-get="/api/switch/${tab}"]`);
    if (tabEl) {
      tabEl.click();
      return { success: true, message: `Switched to ${tab} tab` };
    }
    const target = document.getElementById('tab-content');
    if (target && window.__pageSections && window.__pageSections[tab]) {
      target.innerHTML = window.__pageSections[tab];
      return { success: true, message: `Switched to ${tab} tab` };
    }
    return { success: false, message: 'Tab not found on this page' };
  },

  search_docs: async ({ query }) => {
    const searchInput = document.querySelector('.search input[type="search"]') ||
                        document.querySelector('input.search-input');
    if (!searchInput) return { success: false, message: 'Search not available' };
    searchInput.value = query;
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    searchInput.focus();
    await new Promise(r => setTimeout(r, 500));
    const results = document.querySelectorAll('.matching-post');
    const found = Array.from(results).slice(0, 5).map(el => {
      const title = el.querySelector('h2')?.textContent || el.textContent.slice(0, 60);
      const href = el.querySelector('a')?.getAttribute('href') || '';
      return `- ${title} (${href})`;
    });
    return { success: true, message: `Found ${results.length} results:\n${found.join('\n')}` };
  },

  generate_component: async ({ component, description }) => {
    const yamlExamples = {
      'card-grid': (desc) => `\`\`\`card-grid\n- title: Item 1\n  icon: "1"\n  description: ${desc}\n  href: "#"\n- title: Item 2\n  icon: "2"\n  description: ${desc}\n  href: "#"\n- title: Item 3\n  icon: "3"\n  description: ${desc}\n  href: "#"\n\`\`\``,
      'api-endpoint': (desc) => `\`\`\`api-endpoint\nmethod: GET\npath: /api/example\ndescription: ${desc}\nresponse:\n  type: object\n  properties:\n    id: { type: string }\n    name: { type: string }\n\`\`\``,
      'status-flow': (desc) => `\`\`\`status-flow\ntitle: ${desc}\nstates:\n  - name: Start\n    color: blue\n  - name: Processing\n    color: yellow\n  - name: Complete\n    color: green\n\`\`\``,
      'file-tree': (desc) => `\`\`\`file-tree\nroot: project/\nitems:\n  - name: src/\n    children:\n      - name: index.js\n      - name: utils.js\n  - name: package.json\n  - name: README.md\n\`\`\``,
    };
    const generator = yamlExamples[component];
    if (generator) {
      const yaml = generator(description);
      try {
        await navigator.clipboard.writeText(yaml);
        return { success: true, message: `Generated ${component} and copied to clipboard:\n\n${yaml}` };
      } catch {
        return { success: true, message: `Generated ${component}:\n\n${yaml}\n\n(Copy manually — clipboard not available)` };
      }
    }
    return { success: true, message: `To create a ${component}, use this markdown code fence:\n\n\`\`\`${component}\n# Add YAML content here\n# Description: ${description}\n\`\`\`` };
  },

  scroll_to_section: async ({ heading }) => {
    const headings = document.querySelectorAll('.markdown-section h1, .markdown-section h2, .markdown-section h3, .markdown-section h4');
    const target = Array.from(headings).find(h =>
      h.textContent.toLowerCase().includes(heading.toLowerCase())
    );
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      target.style.transition = 'background 0.3s';
      target.style.background = 'rgb(var(--gc-accent-rgb) / 0.15)';
      setTimeout(() => { target.style.background = ''; }, 2000);
      return { success: true, message: `Scrolled to "${target.textContent}"` };
    }
    return { success: false, message: `Heading "${heading}" not found` };
  },
};

// Map tool names to config keys for gating
const TOOL_CONFIG_MAP = {
  export_page: 'export',
  navigate_to_page: 'navigate',
  switch_tab: 'switchTab',
  search_docs: 'search',
  generate_component: 'generateComponent',
  scroll_to_section: 'scrollToSection',
};

function isToolEnabled(toolName) {
  const configKey = TOOL_CONFIG_MAP[toolName];
  if (!configKey) return true;
  return _config?.features?.chat?.tools?.[configKey] !== false;
}

async function executeToolCalls(calls) {
  console.log('[gemma-chat] tool_calls received:', JSON.stringify(calls));
  for (const call of calls) {
    console.log('[gemma-chat] executing tool:', call.name, 'args:', call.args);
    if (!isToolEnabled(call.name)) {
      appendActionBubble(call.name, call.args || {}, { success: false, message: `Tool "${call.name}" is disabled in config` });
      continue;
    }
    const executor = toolExecutors[call.name];
    if (executor) {
      try {
        const result = await executor(call.args);
        console.log('[gemma-chat] tool result:', call.name, result);
        appendActionBubble(call.name, call.args, result);
      } catch (e) {
        console.error('[gemma-chat] tool error:', call.name, e);
        appendActionBubble(call.name, call.args, { success: false, message: e.toString() });
      }
    } else {
      console.warn('[gemma-chat] unknown tool:', call.name);
      appendActionBubble(call.name, call.args || {}, { success: false, message: `Unknown tool: ${call.name}` });
    }
  }
}

// --- Worker management ---

function getCatalog() {
  return getModelCatalog(_config?.features?.chat?.model || null);
}

function getSelectedModelConfig() {
  const id = getSelectedModelId();
  const catalog = getCatalog();
  return catalog.find(m => m.id === id) || catalog[0];
}

function initWorker() {
  // Terminate old worker if switching models
  if (worker) {
    worker.terminate();
    worker = null;
  }
  worker = new Worker(new URL('../core/worker.js', import.meta.url), {
    type: 'module',
  });
  worker.addEventListener('message', onWorkerMessage);
}

function loadSelectedModel() {
  const config = getSelectedModelConfig();
  initWorker();
  setModelSelectDisabled(true);
  $('gemma-load-btn').disabled = true;
  $('gemma-load-btn').textContent = 'Loading...';
  worker.postMessage({ type: 'load', data: config });
}

function onWorkerMessage(e) {
  const { status, data, output, tps, numTokens } = e.data;

  switch (status) {
    case 'loading':
      engine.setStatus('loading');
      setDot('loading');
      show('gemma-load-status', data);
      break;

    case 'initiate':
      show('gemma-progress-area');
      addProgressItem(e.data.file);
      break;

    case 'progress':
      updateProgressItem(e.data.file, e.data.progress);
      break;

    case 'done':
      removeProgressItem(e.data.file);
      break;

    case 'ready': {
      engine.setStatus('ready');
      setDot('ready');
      hide('gemma-welcome');
      show('gemma-input-area');
      show('gemma-ctx-btn');
      setModelSelectDisabled(false);
      $('gemma-input').focus();
      autoSelectCurrentPage().then(() => updateTokenCounterUI(engine));
      break;
    }

    case 'start':
      engine.addMessage('assistant', '');
      appendBubble('assistant', '');
      break;

    case 'update': {
      const msgs = engine.getMessages();
      const last = msgs[msgs.length - 1];
      last.content += output;
      updateLastBubble(last.content);
      if (tps) setTps(`${tps.toFixed(1)} tok/s`);
      scrollToBottom();
      break;
    }

    case 'tool_calls':
      console.log('[gemma-chat] worker sent tool_calls:', e.data.calls);
      executeToolCalls(e.data.calls);
      break;

    case 'complete':
      engine.setStatus('ready');
      toggleRunningUI(false);
      show('gemma-reset-btn');
      break;

    case 'error':
      engine.setStatus('unloaded');
      show('gemma-load-status', 'Error: ' + data);
      $('gemma-load-btn').disabled = false;
      $('gemma-load-btn').textContent = 'Retry';
      setModelSelectDisabled(false);
      setDot('');
      break;
  }
}

// --- Send message ---

async function sendMessage() {
  const input = $('gemma-input');
  const text = input.value.trim();
  if (!text) return;

  engine.addMessage('user', text);
  appendBubble('user', text);
  input.value = '';
  input.style.height = 'auto';

  engine.setStatus('generating');
  toggleRunningUI(true);
  setTps('');

  const fallback = getPageContent();
  const context = engine.buildContext(fallback);
  const workerMessages = engine.buildWorkerMessages(context);

  worker.postMessage({ type: 'generate', data: workerMessages });
  scrollToBottom();
}

// --- Event binding ---

function bindEvents() {
  $('gemma-fab').addEventListener('click', () => {
    toggle('gemma-panel');
    toggle('gemma-fab');
    if (engine.getStatus() === 'ready') $('gemma-input').focus();
  });

  $('gemma-close-btn').addEventListener('click', () => {
    hide('gemma-panel');
    show('gemma-fab');
  });

  $('gemma-load-btn').addEventListener('click', () => {
    loadSelectedModel();
  });

  // Model picker in header
  $('gemma-model-picker').addEventListener('click', (e) => {
    e.stopPropagation(); // prevent document click from immediately closing
    console.log('[gemma-chat] model picker clicked');
    toggleModelDropdown();
  });

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#gemma-model-dropdown') && !e.target.closest('#gemma-model-picker')) {
      toggleModelDropdown(false);
    }
  });

  $('gemma-reset-btn').addEventListener('click', () => {
    engine.resetMessages();
    clearMessages();
    setTps('');
    hide('gemma-reset-btn');
    worker.postMessage({ type: 'reset' });
  });

  $('gemma-ctx-btn').addEventListener('click', async () => {
    contextPanelOpen = !contextPanelOpen;
    if (contextPanelOpen) {
      show('gemma-ctx-panel');
      if (engine.getSelectedPaths().size === 0) await autoSelectCurrentPage();
      refreshContextList();
    } else {
      hide('gemma-ctx-panel');
    }
  });

  $('gemma-ctx-all').addEventListener('click', async () => {
    const pages = engine.getSidebarPages();
    console.log('[gemma-chat] ctx-all clicked. sidebarPages:', pages.length, pages);
    if (pages.length === 0) {
      console.warn('[gemma-chat] no sidebar pages found — parseSidebar may have failed');
      return;
    }
    for (const page of pages) {
      console.log('[gemma-chat] selecting + fetching:', page.path);
      engine.selectPath(page.path);
      if (!engine.getCachedPage(page.path)) await fetchPage(page.path);
    }
    console.log('[gemma-chat] all pages selected, refreshing list');
    refreshContextList();
  });

  $('gemma-ctx-none').addEventListener('click', () => {
    engine.clearSelection();
    refreshContextList();
  });

  $('gemma-ctx-current').addEventListener('click', async () => {
    engine.clearSelection();
    await autoSelectCurrentPage();
    refreshContextList();
  });

  const input = $('gemma-input');
  const sendBtn = $('gemma-send-btn');

  // --- Autocomplete ---

  let acTrigger = null; // { char: '@'|'/', startPos: number }

  function detectTrigger() {
    const pos = input.selectionStart;
    const text = input.value.slice(0, pos);

    // Find last @ or / that starts a trigger (preceded by start-of-string or space)
    for (let i = pos - 1; i >= 0; i--) {
      const ch = text[i];
      if (ch === ' ' || ch === '\n') break; // hit a space before finding trigger
      if ((ch === '@' || ch === '/') && (i === 0 || text[i - 1] === ' ' || text[i - 1] === '\n')) {
        return { char: ch, startPos: i, query: text.slice(i + 1) };
      }
    }
    return null;
  }

  function handleAutocompleteSelect(value, type) {
    if (!acTrigger) return;
    const before = input.value.slice(0, acTrigger.startPos);
    const after = input.value.slice(input.selectionStart);
    const insert = type === 'page' ? `@${value} ` : `/${value} `;
    input.value = before + insert + after;
    input.selectionStart = input.selectionEnd = before.length + insert.length;
    hideAutocomplete();
    acTrigger = null;
    input.focus();
  }

  function updateAutocomplete() {
    const trigger = detectTrigger();
    if (!trigger) { hideAutocomplete(); acTrigger = null; return; }

    acTrigger = trigger;
    if (trigger.char === '@') {
      const items = engine.getPageCompletions(trigger.query);
      showAutocomplete(items, 'page', handleAutocompleteSelect);
    } else {
      const items = engine.getToolCompletions(trigger.query);
      showAutocomplete(items, 'tool', handleAutocompleteSelect);
    }
  }

  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    sendBtn.disabled = input.value.trim().length === 0 && engine.getStatus() !== 'generating';
    updateAutocomplete();
  });

  input.addEventListener('keydown', (e) => {
    // Autocomplete keyboard navigation
    if (isAutocompleteVisible()) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        autocompleteNavigate('up');
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        autocompleteNavigate('down');
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        const selected = autocompleteSelect();
        if (selected) {
          e.preventDefault();
          handleAutocompleteSelect(selected.value, selected.type);
          return;
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        hideAutocomplete();
        acTrigger = null;
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey && input.value.trim() && engine.getStatus() !== 'generating') {
      e.preventDefault();
      sendMessage();
    }
  });

  input.addEventListener('blur', () => {
    // Small delay to allow click on dropdown items
    setTimeout(hideAutocomplete, 150);
  });

  sendBtn.addEventListener('click', () => {
    if (engine.getStatus() === 'generating') {
      worker.postMessage({ type: 'interrupt' });
    } else if (input.value.trim()) {
      sendMessage();
    }
  });
}

// --- Public API: called by renderer.js via injectDOM ---

export function injectGemmaChat(config = {}) {
  if (document.getElementById('gemma-chat')) return; // already injected

  // Store config for tool gating and model catalog
  _config = config;

  // Initialize engine with config
  engine = createChatEngine({
    tools: config?.features?.chat?.tools || {},
    model: config?.features?.chat?.model || null,
  });

  createWidget();
  populateModelSelect(getCatalog(), (modelId) => {
    // Reload page with selected model — WebGPU can't reliably free VRAM without refresh
    console.log('[gemma-chat] model changed to:', modelId, '— reloading page');
    localStorage.setItem('gemma-selected-model', modelId);
    location.reload();
  });
  // Restore saved model selection
  const savedModel = localStorage.getItem('gemma-selected-model');
  if (savedModel && getCatalog().some(m => m.id === savedModel)) {
    // Update the internal state to match saved selection
    const welcomeSelect = $('gemma-model-select');
    if (welcomeSelect) welcomeSelect.value = savedModel;
    // Trigger the DOM state update
    const event = new Event('change');
    if (welcomeSelect) welcomeSelect.dispatchEvent(event);
  }

  bindEvents();
  parseSidebar();

  // Start loading selected model in background
  loadSelectedModel();
}
