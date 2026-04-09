// Gemma Chat — Orchestrator.
// Bridges chat engine ↔ Web Worker ↔ DOM shell.
// Knows about Docsify (sidebar discovery, hash routing). No rendering logic.

import { createChatEngine } from '../../../core/chat-engine.js';
import {
  createWidget, $, show, hide, toggle, setDot,
  appendBubble, updateLastBubble, clearMessages, scrollToBottom,
  setTps, toggleRunningUI,
  addProgressItem, updateProgressItem, removeProgressItem,
  renderContextList, updateTokenCounterUI
} from '../dom-helpers/gemma-dom.js';

const engine = createChatEngine();
let worker = null;
let contextPanelOpen = false;

// --- Docsify integration: sidebar parsing ---

async function parseSidebar() {
  try {
    const res = await fetch('/_sidebar.md');
    if (!res.ok) return;
    const text = await res.text();

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

    engine.setSidebarPages(pages);
  } catch (e) {
    // Sidebar not available
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

// --- Worker management ---

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

    case 'ready':
      engine.setStatus('ready');
      setDot('ready');
      hide('gemma-welcome');
      show('gemma-input-area');
      show('gemma-ctx-btn');
      $('gemma-input').focus();
      autoSelectCurrentPage().then(() => updateTokenCounterUI(engine));
      break;

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
    $('gemma-load-btn').disabled = true;
    $('gemma-load-btn').textContent = 'Loading...';
    initWorker();
    worker.postMessage({ type: 'load' });
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
    for (const page of engine.getSidebarPages()) {
      engine.selectPath(page.path);
      if (!engine.getCachedPage(page.path)) await fetchPage(page.path);
    }
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

  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    sendBtn.disabled = input.value.trim().length === 0 && engine.getStatus() !== 'generating';
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && input.value.trim() && engine.getStatus() !== 'generating') {
      e.preventDefault();
      sendMessage();
    }
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

export function injectGemmaChat() {
  if (document.getElementById('gemma-chat')) return; // already injected
  createWidget();
  bindEvents();
  parseSidebar();
}
