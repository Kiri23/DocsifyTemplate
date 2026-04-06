// File Tree Component — renders nested tree structures with connectors
// Registers window.FileTree

window.FileTree = function FileTree(data) {
  var U = window.ComponentUtils;
  var title = data.title || '';
  var root = data.root || '';
  var items = data.items || [];

  function renderItems(nodes, prefix) {
    var html = '';
    nodes.forEach(function(node, i) {
      var isLast = i === nodes.length - 1;
      var connector = isLast ? '\u2514\u2500\u2500 ' : '\u251C\u2500\u2500 ';
      var childPrefix = prefix + (isLast ? '    ' : '\u2502   ');

      var name = node.name || '';
      var desc = node.description || '';

      html += '<div class="flex items-baseline leading-relaxed">' +
        '<span class="text-gray-600 select-none whitespace-pre" style="font-family: var(--font-mono)">' + prefix + connector + '</span>' +
        '<span class="font-mono text-cyan-300 text-sm">' + U.escapeHtml(name) + '</span>' +
        (desc ? '<span class="text-gray-500 mx-1.5">\u2014</span><span class="text-gray-400 text-sm">' + U.escapeHtml(desc) + '</span>' : '') +
      '</div>';

      if (node.children && node.children.length > 0) {
        html += renderItems(node.children, childPrefix);
      }
    });
    return html;
  }

  var titleHtml = title ? U.headerBar(title) : '';

  var rootHtml = root
    ? '<div class="text-gray-300 font-semibold text-sm mb-1">' + U.escapeHtml(root) + '</div>'
    : '';

  return U.darkContainer(
    titleHtml +
    '<div class="px-4 py-3 font-mono text-sm overflow-x-auto">' +
      rootHtml +
      renderItems(items, '') +
    '</div>'
  );
};
