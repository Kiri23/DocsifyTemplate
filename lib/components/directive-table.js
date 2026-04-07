// Directive Table — Preact + HTM
// No more window._dtSearch / _dtToggleAll — all state managed internally.
import { html } from 'htm/preact';
import { useState } from 'preact/hooks';
import { DarkContainer, HeaderBar, TypeBadge, Chevron } from './shared.js';

const DirectiveRow = ({ dir }) => {
  const [open, setOpen] = useState(false);
  const hasDetail = dir.example || dir.details;

  return html`
    <div class="dt-directive border-b border-gray-700/50 last:border-b-0">
      <div class="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800/40 transition-colors ${hasDetail ? 'cursor-pointer' : ''}"
           onClick=${() => hasDetail && setOpen(!open)}>
        <span class="mr-2">
          ${hasDetail ? html`<${Chevron} open=${open} />` : html`<span class="w-2 inline-block" />`}
        </span>
        <span class="font-mono text-cyan-300 text-sm whitespace-nowrap">${dir.name || ''}</span>
        <span class="text-gray-400 text-sm flex-1 truncate">${dir.description || ''}</span>
        <span class="ml-auto flex items-center gap-2 flex-shrink-0">
          <${TypeBadge} type=${dir.type} />
          ${dir.default !== undefined && html`
            <span class="inline-block bg-gray-700/60 text-gray-400 text-xs px-2 py-0.5 rounded-md">default: ${dir.default}</span>
          `}
        </span>
      </div>
      ${open && hasDetail && html`
        <div class="px-4 py-3 bg-gray-800/40 border-t border-gray-700/50">
          ${dir.details && html`<p class="text-gray-400 text-sm mb-2 leading-relaxed">${dir.details}</p>`}
          ${dir.example && html`
            <pre class="!mt-0 !mb-0 rounded-lg bg-gray-950 border border-gray-700/50">
              <code class="language-json text-xs">${dir.example}</code>
            </pre>
          `}
        </div>
      `}
    </div>
  `;
};

const CategorySection = ({ cat }) => {
  const [open, setOpen] = useState(true);
  const directives = cat.directives || [];

  return html`
    <div class="dt-category">
      <div class="bg-gray-800/60 px-4 py-2.5 border-b border-gray-700/60 flex items-center gap-2 cursor-pointer"
           onClick=${() => setOpen(!open)}>
        <${Chevron} open=${open} />
        <span class="font-semibold text-gray-200 text-sm">${cat.name || 'Uncategorized'}</span>
        <span class="text-gray-500 text-xs ml-auto">${directives.length}</span>
      </div>
      ${open && html`
        <div>${directives.map(dir => html`<${DirectiveRow} dir=${dir} />`)}</div>
      `}
    </div>
  `;
};

const DirectiveTable = ({ data }) => {
  const [query, setQuery] = useState('');
  const title = data.title || 'Directives';
  const searchable = data.searchable !== false;
  const categories = data.categories || [];

  const totalCount = categories.reduce((sum, cat) => sum + (cat.directives || []).length, 0);

  // Filter directives by search query
  const filteredCategories = categories.map(cat => ({
    ...cat,
    directives: (cat.directives || []).filter(dir => {
      if (!query) return true;
      const q = query.toLowerCase();
      return (dir.name || '').toLowerCase().includes(q) || (dir.description || '').toLowerCase().includes(q);
    })
  })).filter(cat => cat.directives.length > 0);

  const visibleCount = filteredCategories.reduce((sum, cat) => sum + cat.directives.length, 0);

  return html`
    <${DarkContainer}>
      <${HeaderBar} title=${title} />
      ${searchable && html`
        <div class="px-4 py-3 border-b border-gray-700/60">
          <div class="relative">
            <input type="text" placeholder="Search directives..."
                   class="w-full bg-gray-800/60 text-gray-200 text-sm px-3 py-2 pl-8 rounded-lg border border-gray-600/60 focus:border-cyan-500 focus:outline-none transition-colors"
                   value=${query}
                   onInput=${(e) => setQuery(e.target.value)} />
            <span class="absolute left-2.5 top-2.5 text-gray-500 text-sm">🔍</span>
          </div>
          <div class="mt-2">
            <span class="text-gray-500 text-xs">${visibleCount} of ${totalCount} directives</span>
          </div>
        </div>
      `}
      <div class="max-h-[600px] overflow-y-auto">
        ${filteredCategories.map(cat => html`<${CategorySection} cat=${cat} />`)}
      </div>
    <//>
  `;
};

export { DirectiveTable };
