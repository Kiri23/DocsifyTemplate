// API Endpoint Component — collapsible endpoint card with method badge
// Registers window.ApiEndpoint

window.ApiEndpoint = function ApiEndpoint(data) {
  var U = window.ComponentUtils;
  var method = (data.method || 'GET').toUpperCase();
  var path = data.path || '/';
  var description = data.description || '';
  var params = data.params || [];
  var response = data.response || '';

  var id = U.generateId('api', method + '-' + path);

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
      return '<tr style="border-bottom: 1px solid var(--color-border); background: white">' +
        '<td class="px-3 py-2 font-mono text-sm" style="color: var(--color-primary-text)">' + U.escapeHtml(p.name) + '</td>' +
        '<td class="px-3 py-2 text-sm font-mono" style="color: var(--color-text-secondary)">' + U.escapeHtml(p.type || 'any') + '</td>' +
        '<td class="px-3 py-2">' + reqBadge + '</td>' +
      '</tr>';
    }).join('');

    detailParts.push(
      '<div class="mb-3">' +
        '<div class="text-gray-300 text-sm font-semibold mb-2">Parameters</div>' +
        '<table class="text-left" style="background: white; border-radius: 0.5rem; overflow: hidden; border: 1px solid var(--color-border); width: auto !important; display: table">' +
          '<thead><tr style="border-bottom: 1px solid var(--color-border-strong); background: var(--color-surface-raised)">' +
            '<th class="px-3 py-1.5 text-xs font-medium uppercase tracking-wide" style="color: var(--color-text-tertiary)">Name</th>' +
            '<th class="px-3 py-1.5 text-xs font-medium uppercase tracking-wide" style="color: var(--color-text-tertiary)">Type</th>' +
            '<th class="px-3 py-1.5 text-xs font-medium uppercase tracking-wide" style="color: var(--color-text-tertiary)">Required</th>' +
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
        '<pre class="rounded-lg p-3 pt-10 text-sm overflow-x-auto" style="background: var(--color-code-bg) !important; color: var(--color-code-text) !important; border: 1px solid rgba(255,255,255,0.1) !important; position: relative"><code style="background: transparent !important; color: inherit !important">' + U.escapeHtml(response) + '</code></pre>' +
      '</div>'
    );
  }

  var detailHtml = detailParts.length > 0
    ? '<div id="' + id + '" class="hidden px-4 py-3 bg-gray-800/40 border-t border-gray-700/60">' + detailParts.join('') + '</div>'
    : '';

  var clickAttr = detailParts.length > 0 ? U.toggleAttr(id, 'api-chevron') : '';

  var chevronEl = detailParts.length > 0
    ? '<span class="ml-auto">' + U.chevron('api-chevron') + '</span>'
    : '';

  return U.darkContainer(
    '<div class="flex items-center px-4 py-3 hover:bg-gray-800/40 transition-colors"' + clickAttr + '>' +
      methodBadge +
      '<span class="font-mono text-gray-100 text-sm">' + U.escapeHtml(path) + '</span>' +
      descHtml +
      chevronEl +
    '</div>' +
    detailHtml
  );
};
