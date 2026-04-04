// Card Grid Component — renders a responsive grid of linked cards
// Registers window.CardGrid

window.CardGrid = function CardGrid(data) {
  var cards = Array.isArray(data) ? data : (data.items || []);
  var columns = (data.columns && data.columns >= 1 && data.columns <= 4) ? data.columns : 3;

  if (!cards || cards.length === 0) {
    return '<p class="text-text-muted text-center">No cards available</p>';
  }

  var colClass = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-' + columns + ' gap-5 my-2';

  return '<div class="' + colClass + '" role="navigation" aria-label="Card grid">' +
    cards.map(function(card) {
      var title = card.title || 'Untitled';
      var description = card.description || '';
      var icon = card.icon || '';
      var href = card.href || '#';

      return '<a href="' + href + '" class="block bg-surface rounded-xl p-5 md:p-6 min-h-[120px] border border-border hover:border-primary/40 hover:shadow-[0_2px_12px_rgba(8,145,178,0.08)] hover:-translate-y-0.5 transition-all duration-200 group no-underline" style="text-decoration:none">' +
        '<div class="text-2xl md:text-3xl mb-2 md:mb-3 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200 origin-left" style="font-family: ui-monospace, monospace; color: #0891b2;">' + icon + '</div>' +
        '<h3 class="text-base md:text-lg font-bold text-text-primary mb-1 md:mb-1.5 group-hover:text-primary transition-colors" style="border: none; margin-top: 0; padding: 0;">' + title + '</h3>' +
        '<p class="text-sm text-text-muted leading-relaxed" style="margin: 0;">' + description + '</p>' +
      '</a>';
    }).join('') +
  '</div>';
};
