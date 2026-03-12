// Entity Schema Component — interactive expandable card for entity fields
// Registers window.EntitySchema

window.EntitySchema = function EntitySchema(data) {
  var name = data.name || 'Entity';
  var parent = data.parent || '';
  var fields = data.fields || [];

  var id = 'es-' + name.toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).substr(2, 6);

  var headerExtra = parent ? ' <span class="text-gray-400 text-sm font-normal">extends <span class="text-cyan-300">' + parent + '</span></span>' : '';

  var fieldRows = fields.map(function(field, i) {
    var fieldId = id + '-field-' + i;
    var typeBadge = '<span class="inline-block bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded-md font-mono">' + (field.type || 'any') + '</span>';
    var requiredBadge = field.required ? ' <span class="inline-block bg-rose-500/20 text-rose-300 text-xs px-2 py-0.5 rounded-md font-medium">required</span>' : '';

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
            return '<span class="inline-block bg-cyan-900/30 text-cyan-300 text-xs px-2 py-0.5 rounded-md font-mono">' + v + '</span>';
          }).join('') +
        '</div>');
      }
      detailHtml = '<div id="' + fieldId + '" class="hidden px-4 py-2.5 bg-gray-800/40 border-t border-gray-700/60">' + parts.join('') + '</div>';
    }

    var clickAttr = hasDetail
      ? ' onclick="var el=document.getElementById(\'' + fieldId + '\');el.classList.toggle(\'hidden\');this.querySelector(\'.es-chevron\').classList.toggle(\'rotate-90\')" style="cursor:pointer"'
      : '';

    var chevron = hasDetail
      ? '<span class="es-chevron text-gray-500 text-xs transition-transform duration-200 mr-2">&#9654;</span>'
      : '<span class="mr-2 w-2 inline-block"></span>';

    return '<div class="border-b border-gray-700/50 last:border-b-0">' +
      '<div class="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800/40 transition-colors"' + clickAttr + '>' +
        chevron +
        '<span class="font-mono text-cyan-300 text-sm">' + field.name + '</span>' +
        '<span class="ml-auto flex items-center gap-2">' + typeBadge + requiredBadge + '</span>' +
      '</div>' +
      detailHtml +
    '</div>';
  }).join('');

  return '<div class="rounded-xl overflow-hidden border border-gray-700/60 bg-gray-900 my-5 shadow-md">' +
    '<div class="bg-gray-800/80 px-4 py-3 border-b border-gray-700/60">' +
      '<span class="font-bold text-gray-100 text-base">' + name + '</span>' + headerExtra +
    '</div>' +
    '<div>' + fieldRows + '</div>' +
  '</div>';
};
