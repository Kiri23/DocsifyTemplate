// Step Type Component — workflow step type documentation card
// Registers window.StepType

window.StepType = function StepType(data) {
  var U = window.ComponentUtils;
  var name = data.name || 'Step';
  var category = data.category || 'sync';
  var description = data.description || '';
  var properties = data.properties || [];
  var example = data.example || '';

  var id = U.generateId('st', name);

  var badgeColor = category === 'async'
    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
  var badgeLabel = category === 'async' ? 'async' : 'sync';
  var badge = '<span class="inline-block text-xs px-2.5 py-0.5 rounded-md font-medium ' + badgeColor + '">' + badgeLabel + '</span>';

  var propsHtml = '';
  if (properties.length > 0) {
    var propRows = properties.map(function(prop) {
      return '<div class="flex items-center gap-3 px-4 py-2 border-b border-gray-700/50 last:border-b-0">' +
        '<span class="font-mono text-cyan-300 text-sm whitespace-nowrap">' + U.escapeHtml(prop.name || '') + '</span>' +
        '<span class="text-gray-400 text-sm flex-1">' + (prop.description || '') + '</span>' +
        '<span class="ml-auto flex items-center gap-2 flex-shrink-0">' + U.typeBadge(prop.type) + (prop.required ? ' ' + U.requiredBadge() : '') + '</span>' +
      '</div>';
    }).join('');

    propsHtml = '<div class="border-t border-gray-700/60">' +
      '<div class="px-4 py-2 bg-gray-800/40">' +
        U.sectionLabel('Properties') +
      '</div>' +
      propRows +
    '</div>';
  }

  var exampleHtml = '';
  if (example) {
    var exampleId = id + '-example';
    exampleHtml = '<div class="border-t border-gray-700/60">' +
      '<div class="px-4 py-2 bg-gray-800/40 cursor-pointer flex items-center gap-2"' +
        U.toggleAttr(exampleId, 'st-chevron') + '>' +
        U.chevron('st-chevron') +
        U.sectionLabel('Config Example') +
      '</div>' +
      '<div id="' + exampleId + '" class="hidden px-4 py-3 bg-gray-950/40">' +
        '<pre class="!mt-0 !mb-0 rounded-lg bg-gray-950 border border-gray-700/50"><code class="language-json text-xs">' +
        U.escapeHtml(example) +
        '</code></pre>' +
      '</div>' +
    '</div>';
  }

  return U.darkContainer(
    '<div class="bg-gray-800/80 px-4 py-3 border-b border-gray-700/60 flex items-center gap-3">' +
      '<span class="font-bold text-gray-100 text-base">' + U.escapeHtml(name) + '</span>' +
      badge +
    '</div>' +
    (description ? '<div class="px-4 py-3 text-gray-300 text-sm leading-relaxed">' + description + '</div>' : '') +
    propsHtml +
    exampleHtml
  );
};
