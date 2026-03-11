// Card Grid Component — responsive cards for home page
// Registers window.CardGrid

window.CardGrid = function CardGrid(cards) {
  if (!cards || cards.length === 0) {
    return '<p class="text-gray-500 text-center">No cards available</p>';
  }

  return '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">' +
    cards.map(function(card) {
      var title = card.title || 'Untitled';
      var description = card.description || '';
      var icon = card.icon || '';
      var href = card.href || '#';

      return '<a href="' + href + '" class="block bg-white border border-gray-200 rounded-lg p-4 md:p-6 min-h-[120px] hover:border-primary hover:shadow-lg transition-all duration-200 group">' +
        '<div class="text-3xl md:text-4xl mb-2 md:mb-3">' + icon + '</div>' +
        '<h3 class="text-lg md:text-xl font-bold text-gray-900 mb-1 md:mb-2 group-hover:text-primary transition-colors">' + title + '</h3>' +
        '<p class="text-sm md:text-base text-gray-600">' + description + '</p>' +
      '</a>';
    }).join('') +
  '</div>';
};
