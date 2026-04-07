// Step Type — Preact + HTM
import { html } from 'htm/preact';
import { useState } from 'preact/hooks';
import { DarkContainer, TypeBadge, RequiredBadge, SectionLabel, Chevron } from './shared.js';

const StepType = ({ data }) => {
  const [exampleOpen, setExampleOpen] = useState(false);
  const name = data.name || 'Step';
  const category = data.category || 'sync';
  const description = data.description || '';
  const properties = data.properties || [];
  const example = data.example || '';

  const badgeClass = category === 'async'
    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';

  return html`
    <${DarkContainer}>
      <div class="bg-gray-800/80 px-4 py-3 border-b border-gray-700/60 flex items-center gap-3">
        <span class="font-bold text-gray-100 text-base">${name}</span>
        <span class="inline-block text-xs px-2.5 py-0.5 rounded-md font-medium ${badgeClass}">
          ${category === 'async' ? 'async' : 'sync'}
        </span>
      </div>
      ${description && html`<div class="px-4 py-3 text-gray-300 text-sm leading-relaxed">${description}</div>`}
      ${properties.length > 0 && html`
        <div class="border-t border-gray-700/60">
          <div class="px-4 py-2 bg-gray-800/40"><${SectionLabel} text="Properties" /></div>
          ${properties.map(prop => html`
            <div class="flex items-center gap-3 px-4 py-2 border-b border-gray-700/50 last:border-b-0">
              <span class="font-mono text-cyan-300 text-sm whitespace-nowrap">${prop.name || ''}</span>
              <span class="text-gray-400 text-sm flex-1">${prop.description || ''}</span>
              <span class="ml-auto flex items-center gap-2 flex-shrink-0">
                <${TypeBadge} type=${prop.type} />
                ${prop.required && html`<${RequiredBadge} />`}
              </span>
            </div>
          `)}
        </div>
      `}
      ${example && html`
        <div class="border-t border-gray-700/60">
          <div class="px-4 py-2 bg-gray-800/40 cursor-pointer flex items-center gap-2"
               onClick=${() => setExampleOpen(!exampleOpen)}>
            <${Chevron} open=${exampleOpen} />
            <${SectionLabel} text="Config Example" />
          </div>
          ${exampleOpen && html`
            <div class="px-4 py-3 bg-gray-950/40">
              <pre class="!mt-0 !mb-0 rounded-lg bg-gray-950 border border-gray-700/50">
                <code class="language-json text-xs">${example}</code>
              </pre>
            </div>
          `}
        </div>
      `}
    <//>
  `;
};

export { StepType };
