// Config Example Component — annotated code block with numbered callouts
// Registers window.ConfigExample

window.ConfigExample = function ConfigExample(data) {
  var title = data.title || '';
  var language = data.language || 'json';
  var code = data.code || '';
  var annotations = data.annotations || [];

  var id = 'ce-' + Math.random().toString(36).substr(2, 6);

  var lines = code.split('\n');

  var annotationMap = {};
  annotations.forEach(function(ann, idx) {
    annotationMap[ann.line] = { index: idx + 1, text: ann.text };
  });

  var codeLines = lines.map(function(line, i) {
    var lineNum = i + 1;
    var ann = annotationMap[lineNum];
    var escapedLine = line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    var marker = '';
    if (ann) {
      marker = '<span class="ce-marker absolute -right-1 top-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500 text-white text-xs font-bold cursor-pointer hover:bg-cyan-400 transition-colors" ' +
        'onclick="event.stopPropagation();window._ceToggle(\'' + id + '\',' + ann.index + ')" ' +
        'title="Click for annotation">' +
        ann.index +
      '</span>';
    }

    return '<div class="ce-line relative pr-8 ' + (ann ? 'bg-cyan-500/5' : '') + '">' +
      '<span class="text-gray-600 select-none inline-block w-8 text-right mr-3 text-xs">' + lineNum + '</span>' +
      '<span>' + escapedLine + '</span>' +
      marker +
    '</div>';
  }).join('');

  var annotationPanels = annotations.map(function(ann, idx) {
    var panelId = id + '-ann-' + (idx + 1);
    return '<div id="' + panelId + '" class="hidden px-4 py-3 bg-gray-800/60 border-l-2 border-cyan-500 mx-4 my-2 rounded-r-lg">' +
      '<div class="flex items-start gap-2">' +
        '<span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500 text-white text-xs font-bold flex-shrink-0 mt-0.5">' + (idx + 1) + '</span>' +
        '<span class="text-gray-300 text-sm leading-relaxed">' + ann.text + '</span>' +
      '</div>' +
    '</div>';
  }).join('');

  var titleHtml = title
    ? '<div class="bg-gray-800/80 px-4 py-2.5 border-b border-gray-700/60 flex items-center justify-between">' +
        '<span class="font-semibold text-gray-200 text-sm">' + title + '</span>' +
        '<span class="text-gray-500 text-xs">' + annotations.length + ' annotation' + (annotations.length !== 1 ? 's' : '') + '</span>' +
      '</div>'
    : '';

  return '<div class="rounded-xl overflow-hidden border border-gray-700/60 bg-gray-900 my-5 shadow-md" id="' + id + '">' +
    titleHtml +
    '<div class="py-3 font-mono text-sm leading-relaxed overflow-x-auto">' +
      codeLines +
    '</div>' +
    '<div id="' + id + '-annotations">' + annotationPanels + '</div>' +
  '</div>';
};

// Toggle annotation panel
window._ceToggle = function(containerId, annotationIndex) {
  var panel = document.getElementById(containerId + '-ann-' + annotationIndex);
  if (!panel) return;

  var container = document.getElementById(containerId + '-annotations');
  if (container) {
    var panels = container.querySelectorAll('[id^="' + containerId + '-ann-"]');
    panels.forEach(function(p) {
      if (p !== panel) p.classList.add('hidden');
    });
  }

  panel.classList.toggle('hidden');
};
