// Step Type Component — workflow step type documentation card
// Registers window.StepType

window.StepType = function StepType(data) {
  var name = data.name || 'Step';
  var category = data.category || 'sync';
  var description = data.description || '';
  var properties = data.properties || [];
  var example = data.example || '';

  var id = 'st-' + name.toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).substr(2, 6);

  var badgeColor = category === 'async'
    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
  var badgeLabel = category === 'async' ? 'async' : 'sync';
  var badge = '<span class="inline-block text-xs px-2.5 py-0.5 rounded-md font-medium ' + badgeColor + '">' + badgeLabel + '</span>';

  var propsHtml = '';
  if (properties.length > 0) {
    var propRows = properties.map(function(prop) {
      var typeBadge = prop.type
        ? '<span class="inline-block bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded-md font-mono">' + prop.type + '</span>'
        : '';
      var requiredBadge = prop.required
        ? ' <span class="inline-block bg-rose-500/20 text-rose-300 text-xs px-2 py-0.5 rounded-md font-medium">required</span>'
        : '';

      return '<div class="flex items-center gap-3 px-4 py-2 border-b border-gray-700/50 last:border-b-0">' +
        '<span class="font-mono text-cyan-300 text-sm whitespace-nowrap">' + (prop.name || '') + '</span>' +
        '<span class="text-gray-400 text-sm flex-1">' + (prop.description || '') + '</span>' +
        '<span class="ml-auto flex items-center gap-2 flex-shrink-0">' + typeBadge + requiredBadge + '</span>' +
      '</div>';
    }).join('');

    propsHtml = '<div class="border-t border-gray-700/60">' +
      '<div class="px-4 py-2 bg-gray-800/40">' +
        '<span class="text-gray-500 text-xs font-semibold uppercase tracking-wider">Properties</span>' +
      '</div>' +
      propRows +
    '</div>';
  }

  var exampleHtml = '';
  if (example) {
    exampleHtml = '<div class="border-t border-gray-700/60">' +
      '<div class="px-4 py-2 bg-gray-800/40 cursor-pointer flex items-center gap-2" ' +
        'onclick="var el=document.getElementById(\'' + id + '-example\');el.classList.toggle(\'hidden\');this.querySelector(\'.st-chevron\').classList.toggle(\'rotate-90\')">' +
        '<span class="st-chevron text-gray-500 text-xs transition-transform duration-200">&#9654;</span>' +
        '<span class="text-gray-500 text-xs font-semibold uppercase tracking-wider">Config Example</span>' +
      '</div>' +
      '<div id="' + id + '-example" class="hidden px-4 py-3 bg-gray-950/40">' +
        '<pre class="!mt-0 !mb-0 rounded-lg bg-gray-950 border border-gray-700/50"><code class="language-json text-xs">' +
        example.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') +
        '</code></pre>' +
      '</div>' +
    '</div>';
  }

  return '<div class="rounded-xl overflow-hidden border border-gray-700/60 bg-gray-900 my-5 shadow-md">' +
    '<div class="bg-gray-800/80 px-4 py-3 border-b border-gray-700/60 flex items-center gap-3">' +
      '<span class="font-bold text-gray-100 text-base">' + name + '</span>' +
      badge +
    '</div>' +
    (description ? '<div class="px-4 py-3 text-gray-300 text-sm leading-relaxed">' + description + '</div>' : '') +
    propsHtml +
    exampleHtml +
  '</div>';
};
