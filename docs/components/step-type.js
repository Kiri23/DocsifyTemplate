// Step Type Component — workflow step type documentation card with sync/async badge
// Registers window.StepType

window.StepType = function StepType(data) {
  var name = data.name || 'Step';
  var category = data.category || 'sync';
  var description = data.description || '';
  var properties = data.properties || [];
  var example = data.example || '';

  var id = 'st-' + name.toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).substr(2, 6);

  // Sync/Async badge
  var badgeColor = category === 'async'
    ? 'bg-blue-500/80 text-white'
    : 'bg-green-500/80 text-white';
  var badgeLabel = category === 'async' ? 'async' : 'sync';
  var badge = '<span class="inline-block text-xs px-2 py-0.5 rounded-full ' + badgeColor + '">' + badgeLabel + '</span>';

  // Properties table
  var propsHtml = '';
  if (properties.length > 0) {
    var propRows = properties.map(function(prop) {
      var typeBadge = prop.type
        ? '<span class="inline-block bg-gray-600 text-gray-200 text-xs px-2 py-0.5 rounded-full">' + prop.type + '</span>'
        : '';
      var requiredBadge = prop.required
        ? ' <span class="inline-block bg-red-500/80 text-white text-xs px-2 py-0.5 rounded-full">required</span>'
        : '';

      return '<div class="flex items-center gap-3 px-4 py-2 border-b border-gray-700 last:border-b-0">' +
        '<span class="font-mono text-cyan-400 text-sm whitespace-nowrap">' + (prop.name || '') + '</span>' +
        '<span class="text-gray-400 text-sm flex-1">' + (prop.description || '') + '</span>' +
        '<span class="ml-auto flex items-center gap-2 flex-shrink-0">' + typeBadge + requiredBadge + '</span>' +
      '</div>';
    }).join('');

    propsHtml = '<div class="border-t border-gray-700">' +
      '<div class="px-4 py-2 bg-gray-800/50">' +
        '<span class="text-gray-400 text-xs font-semibold uppercase tracking-wide">Properties</span>' +
      '</div>' +
      propRows +
    '</div>';
  }

  // Collapsible example
  var exampleHtml = '';
  if (example) {
    exampleHtml = '<div class="border-t border-gray-700">' +
      '<div class="px-4 py-2 bg-gray-800/50 cursor-pointer flex items-center gap-2" ' +
        'onclick="var el=document.getElementById(\'' + id + '-example\');el.classList.toggle(\'hidden\');this.querySelector(\'.st-chevron\').classList.toggle(\'rotate-90\')">' +
        '<span class="st-chevron text-gray-500 text-xs transition-transform duration-200">&#9654;</span>' +
        '<span class="text-gray-400 text-xs font-semibold uppercase tracking-wide">Config Example</span>' +
      '</div>' +
      '<div id="' + id + '-example" class="hidden px-4 py-3 bg-gray-950/50">' +
        '<pre class="!mt-0 !mb-0 rounded bg-gray-950 border border-gray-700"><code class="language-json text-xs">' +
        example.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') +
        '</code></pre>' +
      '</div>' +
    '</div>';
  }

  return '<div class="rounded-lg overflow-hidden border border-gray-700 bg-gray-900 my-4 shadow-lg">' +
    '<div class="bg-gray-800 px-4 py-3 border-b border-gray-700 flex items-center gap-3">' +
      '<span class="font-bold text-white text-base">' + name + '</span>' +
      badge +
    '</div>' +
    (description ? '<div class="px-4 py-3 text-gray-300 text-sm">' + description + '</div>' : '') +
    propsHtml +
    exampleHtml +
  '</div>';
};
