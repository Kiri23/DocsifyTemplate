// Side-by-Side — Preact + HTM
// Supports 3 panel modes: plain text, code block, and live component render.
import { html } from 'htm/preact';
import { getComponent } from '../core/registry.js';

function Panel({ panel }) {
  const title = panel.title || '';
  const content = panel.content || '';
  const language = panel.language || '';
  const component = panel.component || '';
  const panelData = panel.data != null ? panel.data : null;

  let body;
  if (component && panelData != null) {
    // Mode 3: live component render — look up from registry
    const Component = getComponent(component);
    if (Component) {
      body = html`<div class="overflow-auto"><${Component} data=${panelData} /></div>`;
    } else {
      body = html`<div class="text-red-500 text-sm">Component not found: ${component}</div>`;
    }
  } else if (language) {
    // Mode 2: syntax-highlighted code block
    body = html`<pre class="!m-0 !rounded-md !bg-gray-900"><code class="language-${language}">${content}</code></pre>`;
  } else {
    // Mode 1: plain text
    body = html`<div class="text-sm text-text-secondary whitespace-pre-wrap break-words">${content}</div>`;
  }

  return html`
    <div class="flex-1 min-w-0">
      <div class="bg-surface border border-border rounded-lg p-4 h-full">
        ${title && html`
          <div class="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2 pb-2 border-b border-border">${title}</div>
        `}
        ${body}
      </div>
    </div>
  `;
}

const SideBySide = ({ data }) => {
  return html`
    <div class="flex flex-col md:flex-row gap-4 my-4">
      <${Panel} panel=${data.left || {}} />
      <${Panel} panel=${data.right || {}} />
    </div>
  `;
};

export { SideBySide };
