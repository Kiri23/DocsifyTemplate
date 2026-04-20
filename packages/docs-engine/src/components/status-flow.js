// Status Flow — Preact + HTM
// No more window._sfToggle — state lives in the component.
import { html } from 'htm/preact';
import { useState } from 'preact/hooks';
import { DarkContainer, TypeBadge, SectionLabel } from './shared.js';

const stateColors = [
  { bg: 'bg-blue-500/15', border: 'border-blue-500/50', text: 'text-blue-400', activeBg: 'bg-blue-500', activeText: 'text-white' },
  { bg: 'bg-amber-500/15', border: 'border-amber-500/50', text: 'text-amber-400', activeBg: 'bg-amber-500', activeText: 'text-black' },
  { bg: 'bg-emerald-500/15', border: 'border-emerald-500/50', text: 'text-emerald-400', activeBg: 'bg-emerald-500', activeText: 'text-white' },
  { bg: 'bg-rose-500/15', border: 'border-rose-500/50', text: 'text-rose-400', activeBg: 'bg-rose-500', activeText: 'text-white' },
  { bg: 'bg-purple-500/15', border: 'border-purple-500/50', text: 'text-purple-400', activeBg: 'bg-purple-500', activeText: 'text-white' },
  { bg: 'bg-cyan-500/15', border: 'border-cyan-500/50', text: 'text-cyan-400', activeBg: 'bg-cyan-500', activeText: 'text-white' }
];

const StatusFlow = ({ data }) => {
  const [activeIndex, setActiveIndex] = useState(null);
  const states = data.states || [];
  if (states.length === 0) return html`<p class="text-text-muted">No states defined</p>`;

  return html`
    <${DarkContainer}>
      <div class="flex flex-wrap items-center gap-2 mb-1 p-4">
        ${states.map((state, i) => {
          const color = stateColors[i % stateColors.length];
          const isActive = activeIndex === i;
          const btnClass = isActive
            ? `sf-btn ${color.activeBg} border ${color.border} ${color.activeText}`
            : `sf-btn ${color.bg} border ${color.border} ${color.text}`;
          return html`
            <button class="${btnClass} text-sm font-medium px-3.5 py-1.5 rounded-lg transition-all duration-200 hover:opacity-80 whitespace-nowrap"
                    onClick=${() => setActiveIndex(isActive ? null : i)}>
              ${state.label || state.id}
            </button>
            ${i < states.length - 1 && html`<span class="text-gray-600 mx-1.5 flex-shrink-0">→</span>`}
          `;
        })}
      </div>
      ${activeIndex !== null && html`
        <div class="mt-3 px-4 py-3 bg-gray-800/40 rounded-lg border border-gray-700/50 mx-4 mb-4">
          ${states[activeIndex].trigger && html`
            <div class="mb-2"><${SectionLabel} text="Trigger:" /> <span class="text-gray-300 text-sm">${states[activeIndex].trigger}</span></div>
          `}
          ${states[activeIndex].next && states[activeIndex].next.length > 0 && html`
            <div class="mb-2"><${SectionLabel} text="Next states:" />${' '}
              <span class="text-sm">${states[activeIndex].next.map(n => html`<${TypeBadge} type=${n} />`)}</span>
            </div>
          `}
          ${states[activeIndex].effects && states[activeIndex].effects.length > 0 && html`
            <div><${SectionLabel} text="Side effects:" />${' '}
              <span class="text-sm">${states[activeIndex].effects.map(e => html`
                <span class="inline-block bg-cyan-900/25 text-cyan-300 text-xs px-2 py-0.5 rounded-md mr-1">${e}</span>
              `)}</span>
            </div>
          `}
        </div>
      `}
    <//>
  `;
};

export { StatusFlow };
