// Side-by-Side Component — two-panel comparison layout
// Registers window.SideBySide
//
// Panel modes:
//   1. Plain text:  { title, content }
//   2. Code block:  { title, content, language }
//   3. Live render: { title, component, data }

window.SideBySide = function SideBySide(data) {
  var U = window.ComponentUtils;
  var left = data.left || {};
  var right = data.right || {};

  // "entity-schema" → "EntitySchema"
  function toCamelCase(name) {
    return name.split('-').map(function(part) {
      return part.charAt(0).toUpperCase() + part.slice(1);
    }).join('');
  }

  function renderPanel(panel) {
    var title = panel.title || '';
    var content = panel.content || '';
    var language = panel.language || '';
    var component = panel.component || '';
    var panelData = panel.data != null ? panel.data : null;

    var titleHtml = title
      ? '<div class="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2 pb-2 border-b border-border">' + title + '</div>'
      : '';

    var bodyHtml;

    if (component && panelData != null) {
      // Mode 3: live component render
      var fn = window[toCamelCase(component)];
      if (typeof fn === 'function') {
        bodyHtml = '<div class="overflow-auto">' + fn(panelData) + '</div>';
      } else {
        bodyHtml = '<div class="text-red-500 text-sm">Component not found: ' + component + '</div>';
      }
    } else if (language) {
      // Mode 2: syntax-highlighted code block
      bodyHtml = '<pre class="!m-0 !rounded-md !bg-gray-900"><code class="language-' + language + '">' + U.escapeHtml(content) + '</code></pre>';
    } else {
      // Mode 1: plain text
      bodyHtml = '<div class="text-sm text-text-secondary whitespace-pre-wrap break-words">' + content + '</div>';
    }

    return '<div class="flex-1 min-w-0">' +
      '<div class="bg-surface border border-border rounded-lg p-4 h-full">' +
        titleHtml +
        bodyHtml +
      '</div>' +
    '</div>';
  }

  return '<div class="flex flex-col md:flex-row gap-4 my-4">' +
    renderPanel(left) +
    renderPanel(right) +
  '</div>';
};
