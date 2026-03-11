// API Endpoint Component — collapsible endpoint card with method badge
// Registers window.ApiEndpoint

window.ApiEndpoint = function ApiEndpoint(data) {
  var method = (data.method || 'GET').toUpperCase();
  var path = data.path || '/';
  var description = data.description || '';
  var params = data.params || [];
  var response = data.response || '';

  var id = 'api-' + method.toLowerCase() + '-' + path.replace(/[^a-z0-9]/gi, '-') + '-' + Math.random().toString(36).substr(2, 6);

  var methodColors = {
    GET: 'bg-blue-500',
    POST: 'bg-green-500',
    PUT: 'bg-yellow-500 text-black',
    PATCH: 'bg-orange-500',
    DELETE: 'bg-red-500'
  };
  var methodClass = methodColors[method] || 'bg-gray-500';

  var methodBadge = '<span class="inline-block ' + methodClass + ' text-white text-xs font-bold px-2.5 py-1 rounded mr-3">' + method + '</span>';

  var descHtml = description ? '<span class="text-gray-400 text-sm ml-3">' + description + '</span>' : '';

  // Detail panel content
  var detailParts = [];

  if (params.length > 0) {
    var paramRows = params.map(function(p) {
      var reqBadge = p.required ? '<span class="text-red-400 text-xs">required</span>' : '<span class="text-gray-500 text-xs">optional</span>';
      return '<tr class="border-b border-gray-700">' +
        '<td class="px-3 py-2 font-mono text-cyan-400 text-sm">' + p.name + '</td>' +
        '<td class="px-3 py-2 text-gray-400 text-sm">' + (p.type || 'any') + '</td>' +
        '<td class="px-3 py-2">' + reqBadge + '</td>' +
      '</tr>';
    }).join('');

    detailParts.push(
      '<div class="mb-3">' +
        '<div class="text-gray-300 text-sm font-semibold mb-2">Parameters</div>' +
        '<table class="w-full text-left">' +
          '<thead><tr class="border-b border-gray-600">' +
            '<th class="px-3 py-1.5 text-gray-400 text-xs font-medium">Name</th>' +
            '<th class="px-3 py-1.5 text-gray-400 text-xs font-medium">Type</th>' +
            '<th class="px-3 py-1.5 text-gray-400 text-xs font-medium">Required</th>' +
          '</tr></thead>' +
          '<tbody>' + paramRows + '</tbody>' +
        '</table>' +
      '</div>'
    );
  }

  if (response) {
    detailParts.push(
      '<div>' +
        '<div class="text-gray-300 text-sm font-semibold mb-2">Response</div>' +
        '<pre class="bg-gray-800 rounded p-3 text-sm text-gray-300 overflow-x-auto"><code>' + response.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</code></pre>' +
      '</div>'
    );
  }

  var detailHtml = detailParts.length > 0
    ? '<div id="' + id + '" class="hidden px-4 py-3 bg-gray-800/50 border-t border-gray-700">' + detailParts.join('') + '</div>'
    : '';

  var clickAttr = detailParts.length > 0
    ? ' onclick="var el=document.getElementById(\'' + id + '\');el.classList.toggle(\'hidden\');this.querySelector(\'.api-chevron\').classList.toggle(\'rotate-90\')" style="cursor:pointer"'
    : '';

  var chevron = detailParts.length > 0
    ? '<span class="api-chevron text-gray-500 text-xs transition-transform duration-200 ml-auto">&#9654;</span>'
    : '';

  return '<div class="rounded-lg overflow-hidden border border-gray-700 bg-gray-900 my-4 shadow-lg">' +
    '<div class="flex items-center px-4 py-3 hover:bg-gray-800/50 transition-colors"' + clickAttr + '>' +
      methodBadge +
      '<span class="font-mono text-white text-sm">' + path + '</span>' +
      descHtml +
      chevron +
    '</div>' +
    detailHtml +
  '</div>';
};
