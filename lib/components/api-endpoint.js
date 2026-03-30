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
    GET: 'bg-blue-500/90',
    POST: 'bg-emerald-500/90',
    PUT: 'bg-amber-500/90 text-black',
    PATCH: 'bg-orange-500/90',
    DELETE: 'bg-rose-500/90'
  };
  var methodClass = methodColors[method] || 'bg-gray-500';

  var methodBadge = '<span class="inline-block ' + methodClass + ' text-white text-xs font-bold px-2.5 py-1 rounded-md mr-3 font-mono tracking-wide">' + method + '</span>';

  var descHtml = description ? '<span class="text-gray-400 text-sm ml-3">' + description + '</span>' : '';

  var detailParts = [];

  if (params.length > 0) {
    var paramRows = params.map(function(p) {
      var reqBadge = p.required
        ? '<span class="text-rose-300 text-xs font-medium">required</span>'
        : '<span class="text-gray-500 text-xs">optional</span>';
      return '<tr class="border-b border-gray-700/50">' +
        '<td class="px-3 py-2 font-mono text-cyan-300 text-sm">' + p.name + '</td>' +
        '<td class="px-3 py-2 text-gray-400 text-sm font-mono">' + (p.type || 'any') + '</td>' +
        '<td class="px-3 py-2">' + reqBadge + '</td>' +
      '</tr>';
    }).join('');

    detailParts.push(
      '<div class="mb-3">' +
        '<div class="text-gray-300 text-sm font-semibold mb-2">Parameters</div>' +
        '<table class="w-full text-left">' +
          '<thead><tr class="border-b border-gray-600/60">' +
            '<th class="px-3 py-1.5 text-gray-500 text-xs font-medium uppercase tracking-wide">Name</th>' +
            '<th class="px-3 py-1.5 text-gray-500 text-xs font-medium uppercase tracking-wide">Type</th>' +
            '<th class="px-3 py-1.5 text-gray-500 text-xs font-medium uppercase tracking-wide">Required</th>' +
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
        '<pre class="bg-gray-800 rounded-lg p-3 text-sm text-gray-300 overflow-x-auto border border-gray-700/50"><code>' + response.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</code></pre>' +
      '</div>'
    );
  }

  var detailHtml = detailParts.length > 0
    ? '<div id="' + id + '" class="hidden px-4 py-3 bg-gray-800/40 border-t border-gray-700/60">' + detailParts.join('') + '</div>'
    : '';

  var clickAttr = detailParts.length > 0
    ? ' onclick="var el=document.getElementById(\'' + id + '\');el.classList.toggle(\'hidden\');this.querySelector(\'.api-chevron\').classList.toggle(\'rotate-90\')" style="cursor:pointer"'
    : '';

  var chevron = detailParts.length > 0
    ? '<span class="api-chevron text-gray-500 text-xs transition-transform duration-200 ml-auto">&#9654;</span>'
    : '';

  return '<div class="rounded-xl overflow-hidden border border-gray-700/60 bg-gray-900 my-5 shadow-md">' +
    '<div class="flex items-center px-4 py-3 hover:bg-gray-800/40 transition-colors"' + clickAttr + '>' +
      methodBadge +
      '<span class="font-mono text-gray-100 text-sm">' + path + '</span>' +
      descHtml +
      chevron +
    '</div>' +
    detailHtml +
  '</div>';
};
