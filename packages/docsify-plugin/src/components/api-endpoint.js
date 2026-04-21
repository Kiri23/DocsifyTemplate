// API Endpoint — Preact + HTM
import { html } from 'htm/preact';
import { useState } from 'preact/hooks';
import { DarkContainer, Chevron } from './shared.js';

const methodColors = {
  GET: 'bg-blue-500/90',
  POST: 'bg-emerald-500/90',
  PUT: 'bg-amber-500/90 text-black',
  PATCH: 'bg-orange-500/90',
  DELETE: 'bg-rose-500/90'
};

const ApiEndpoint = ({ data }) => {
  const [open, setOpen] = useState(false);
  const method = (data.method || 'GET').toUpperCase();
  const path = data.path || '/';
  const description = data.description || '';
  const params = data.params || [];
  const response = data.response || '';
  const hasDetail = params.length > 0 || response;

  return html`
    <${DarkContainer}>
      <div class="flex items-center px-4 py-3 hover:bg-gray-800/40 transition-colors ${hasDetail ? 'cursor-pointer' : ''}"
           onClick=${() => hasDetail && setOpen(!open)}>
        <span class="inline-block ${methodColors[method] || 'bg-gray-500'} text-white text-xs font-bold px-2.5 py-1 rounded-md mr-3 font-mono tracking-wide">
          ${method}
        </span>
        <span class="font-mono text-gray-100 text-sm">${path}</span>
        ${description && html`<span class="text-gray-400 text-sm ml-3">${description}</span>`}
        ${hasDetail && html`<span class="ml-auto"><${Chevron} open=${open} /></span>`}
      </div>
      ${open && hasDetail && html`
        <div class="px-4 py-3 bg-gray-800/40 border-t border-gray-700/60">
          ${params.length > 0 && html`
            <div class="mb-3">
              <div class="text-gray-300 text-sm font-semibold mb-2">Parameters</div>
              <table class="text-left" style="background: white; border-radius: 0.5rem; overflow: hidden; border: 1px solid var(--color-border); width: auto !important; display: table">
                <thead>
                  <tr style="border-bottom: 1px solid var(--color-border-strong); background: var(--color-surface-raised)">
                    <th class="px-3 py-1.5 text-xs font-medium uppercase tracking-wide" style="color: var(--color-text-tertiary)">Name</th>
                    <th class="px-3 py-1.5 text-xs font-medium uppercase tracking-wide" style="color: var(--color-text-tertiary)">Type</th>
                    <th class="px-3 py-1.5 text-xs font-medium uppercase tracking-wide" style="color: var(--color-text-tertiary)">Required</th>
                  </tr>
                </thead>
                <tbody>
                  ${params.map(p => html`
                    <tr style="border-bottom: 1px solid var(--color-border); background: white">
                      <td class="px-3 py-2 font-mono text-sm" style="color: var(--color-primary-text)">${p.name}</td>
                      <td class="px-3 py-2 text-sm font-mono" style="color: var(--color-text-secondary)">${p.type || 'any'}</td>
                      <td class="px-3 py-2">
                        ${p.required
                          ? html`<span class="text-rose-300 text-xs font-medium">required</span>`
                          : html`<span class="text-gray-500 text-xs">optional</span>`}
                      </td>
                    </tr>
                  `)}
                </tbody>
              </table>
            </div>
          `}
          ${response && html`
            <div>
              <div class="text-gray-300 text-sm font-semibold mb-2">Response</div>
              <pre class="rounded-lg p-3 pt-10 text-sm overflow-x-auto"
                   style="background: var(--color-code-bg) !important; color: var(--color-code-text) !important; border: 1px solid rgba(255,255,255,0.1) !important; position: relative">
                <code style="background: transparent !important; color: inherit !important">${response}</code>
              </pre>
            </div>
          `}
        </div>
      `}
    <//>
  `;
};

export { ApiEndpoint };
