// Card Grid — Preact + HTM version
// Simple component, no state needed. Clean HTM vs string concat.

import { html } from 'htm/preact';

const CardGrid = ({ data }) => {
  const cards = Array.isArray(data) ? data : (data.items || data.cards || []);

  if (!cards || cards.length === 0) {
    return html`<p class="text-text-muted text-center">No cards available</p>`;
  }

  return html`
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 my-2">
      ${cards.map((card, i) => html`
        <a
          key=${i}
          href=${card.href || '#'}
          class="block bg-surface rounded-xl p-5 md:p-6 min-h-[120px] border border-border hover:border-primary/40 hover:shadow-[0_2px_12px_rgba(8,145,178,0.08)] hover:-translate-y-0.5 transition-all duration-200 group no-underline"
          style="text-decoration: none"
        >
          <div class="text-2xl md:text-3xl mb-2 md:mb-3 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200 origin-left font-mono text-primary">
            ${card.icon}
          </div>
          <h3
            class="text-base md:text-lg font-bold text-text-primary mb-1 md:mb-1.5 group-hover:text-primary transition-colors"
            style="border: none; margin-top: 0; padding: 0;"
          >
            ${card.title || 'Untitled'}
          </h3>
          <p class="text-sm text-text-muted leading-relaxed" style="margin: 0;">
            ${card.description || ''}
          </p>
        </a>
      `)}
    </div>
  `;
};

export { CardGrid };
