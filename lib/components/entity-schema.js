// Entity Schema Component — interactive expandable card for entity fields
// Registers window.EntitySchema

window.EntitySchema = function EntitySchema(data) {
  var U = window.ComponentUtils;
  var name = data.name || 'Entity';
  var parent = data.parent || '';
  var fields = data.fields || [];

  var id = U.generateId('es', name);

  var headerExtra = parent ? ' <span class="text-gray-400 text-sm font-normal">extends <span class="text-cyan-300">' + U.escapeHtml(parent) + '</span></span>' : '';

  var fieldRows = fields.map(function(field, i) {
    var fieldId = id + '-field-' + i;

    var hasDetail = field.description || (field.values && field.values.length > 0);
    var detailHtml = '';
    if (hasDetail) {
      var parts = [];
      if (field.description) {
        parts.push('<p class="text-gray-400 text-sm mb-1 leading-relaxed">' + field.description + '</p>');
      }
      if (field.values && field.values.length > 0) {
        parts.push('<div class="flex flex-wrap gap-1.5 mt-1.5">' +
          field.values.map(function(v) {
            return '<span class="inline-block bg-cyan-900/30 text-cyan-300 text-xs px-2 py-0.5 rounded-md font-mono">' + U.escapeHtml(v) + '</span>';
          }).join('') +
        '</div>');
      }
      detailHtml = '<div id="' + fieldId + '" class="hidden px-4 py-2.5 bg-gray-800/40 border-t border-gray-700/60">' + parts.join('') + '</div>';
    }

    var clickAttr = hasDetail ? U.toggleAttr(fieldId, 'es-chevron') : '';

    var chevronHtml = hasDetail
      ? '<span class="mr-2">' + U.chevron('es-chevron') + '</span>'
      : '<span class="mr-2">' + U.chevronSpacer() + '</span>';

    return '<div class="border-b border-gray-700/50 last:border-b-0">' +
      '<div class="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800/40 transition-colors"' + clickAttr + '>' +
        chevronHtml +
        '<span class="font-mono text-cyan-300 text-sm">' + U.escapeHtml(field.name) + '</span>' +
        '<span class="ml-auto flex items-center gap-2">' + U.typeBadge(field.type || 'any') + (field.required ? ' ' + U.requiredBadge() : '') + '</span>' +
      '</div>' +
      detailHtml +
    '</div>';
  }).join('');

  return U.darkContainer(
    U.headerBar(name, headerExtra) +
    '<div>' + fieldRows + '</div>'
  );
};
