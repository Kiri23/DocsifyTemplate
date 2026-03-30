// Status Flow Component — clickable state nodes with transitions and side effects
// Registers window.StatusFlow

window.StatusFlow = function StatusFlow(data) {
  var states = data.states || [];
  if (states.length === 0) return '<p class="text-text-muted">No states defined</p>';

  var id = 'sf-' + Math.random().toString(36).substr(2, 6);

  var stateColors = [
    { bg: 'bg-blue-500/15', border: 'border-blue-500/50', text: 'text-blue-400', activeBg: 'bg-blue-500', activeText: 'text-white' },
    { bg: 'bg-amber-500/15', border: 'border-amber-500/50', text: 'text-amber-400', activeBg: 'bg-amber-500', activeText: 'text-black' },
    { bg: 'bg-emerald-500/15', border: 'border-emerald-500/50', text: 'text-emerald-400', activeBg: 'bg-emerald-500', activeText: 'text-white' },
    { bg: 'bg-rose-500/15', border: 'border-rose-500/50', text: 'text-rose-400', activeBg: 'bg-rose-500', activeText: 'text-white' },
    { bg: 'bg-purple-500/15', border: 'border-purple-500/50', text: 'text-purple-400', activeBg: 'bg-purple-500', activeText: 'text-white' },
    { bg: 'bg-cyan-500/15', border: 'border-cyan-500/50', text: 'text-cyan-400', activeBg: 'bg-cyan-500', activeText: 'text-white' }
  ];

  var buttons = states.map(function(state, i) {
    var color = stateColors[i % stateColors.length];
    var btnId = id + '-btn-' + i;
    var arrow = i < states.length - 1
      ? '<span class="text-gray-600 mx-1.5 flex-shrink-0">&#8594;</span>'
      : '';

    return '<button id="' + btnId + '" ' +
      'class="sf-btn ' + color.bg + ' border ' + color.border + ' ' + color.text + ' text-sm font-medium px-3.5 py-1.5 rounded-lg transition-all duration-200 hover:opacity-80 whitespace-nowrap" ' +
      'data-sf-group="' + id + '" data-sf-index="' + i + '" ' +
      'data-active-bg="' + color.activeBg + '" data-active-text="' + color.activeText + '" ' +
      'data-idle-bg="' + color.bg + '" data-idle-text="' + color.text + '" ' +
      'onclick="window._sfToggle(\'' + id + '\', ' + i + ')">' +
      (state.label || state.id) +
    '</button>' + arrow;
  }).join('');

  var panels = states.map(function(state, i) {
    var panelId = id + '-panel-' + i;
    var parts = [];

    if (state.trigger) {
      parts.push('<div class="mb-2"><span class="text-gray-500 text-xs font-semibold uppercase tracking-wider">Trigger:</span> <span class="text-gray-300 text-sm">' + state.trigger + '</span></div>');
    }

    if (state.next && state.next.length > 0) {
      parts.push(
        '<div class="mb-2"><span class="text-gray-500 text-xs font-semibold uppercase tracking-wider">Next states:</span> ' +
        '<span class="text-sm">' + state.next.map(function(n) {
          return '<span class="inline-block bg-gray-700/60 text-gray-300 text-xs px-2 py-0.5 rounded-md mr-1 font-mono">' + n + '</span>';
        }).join('') + '</span></div>'
      );
    }

    if (state.effects && state.effects.length > 0) {
      parts.push(
        '<div><span class="text-gray-500 text-xs font-semibold uppercase tracking-wider">Side effects:</span> ' +
        '<span class="text-sm">' + state.effects.map(function(e) {
          return '<span class="inline-block bg-cyan-900/25 text-cyan-300 text-xs px-2 py-0.5 rounded-md mr-1">' + e + '</span>';
        }).join('') + '</span></div>'
      );
    }

    return '<div id="' + panelId + '" class="sf-panel hidden mt-3 px-4 py-3 bg-gray-800/40 rounded-lg border border-gray-700/50">' +
      parts.join('') +
    '</div>';
  }).join('');

  return '<div class="rounded-xl overflow-hidden border border-gray-700/60 bg-gray-900 my-5 shadow-md p-4">' +
    '<div class="flex flex-wrap items-center gap-2 mb-1">' + buttons + '</div>' +
    '<div id="' + id + '-panels">' + panels + '</div>' +
  '</div>';
};

// Global toggle handler for status flow
window._sfToggle = function(groupId, index) {
  var panelsContainer = document.getElementById(groupId + '-panels');
  if (!panelsContainer) return;
  var panels = panelsContainer.querySelectorAll('.sf-panel');
  var targetPanel = document.getElementById(groupId + '-panel-' + index);

  var isVisible = targetPanel && !targetPanel.classList.contains('hidden');

  panels.forEach(function(p) { p.classList.add('hidden'); });

  var buttons = document.querySelectorAll('[data-sf-group="' + groupId + '"]');
  buttons.forEach(function(btn) {
    var idleBg = btn.getAttribute('data-idle-bg');
    var idleText = btn.getAttribute('data-idle-text');
    var activeBg = btn.getAttribute('data-active-bg');
    var activeText = btn.getAttribute('data-active-text');
    activeBg.split(' ').forEach(function(c) { btn.classList.remove(c); });
    activeText.split(' ').forEach(function(c) { btn.classList.remove(c); });
    idleBg.split(' ').forEach(function(c) { btn.classList.add(c); });
    idleText.split(' ').forEach(function(c) { btn.classList.add(c); });
  });

  if (!isVisible && targetPanel) {
    targetPanel.classList.remove('hidden');

    var activeBtn = document.getElementById(groupId + '-btn-' + index);
    if (activeBtn) {
      var idleBg = activeBtn.getAttribute('data-idle-bg');
      var idleText = activeBtn.getAttribute('data-idle-text');
      var activeBg = activeBtn.getAttribute('data-active-bg');
      var activeText = activeBtn.getAttribute('data-active-text');
      idleBg.split(' ').forEach(function(c) { activeBtn.classList.remove(c); });
      idleText.split(' ').forEach(function(c) { activeBtn.classList.remove(c); });
      activeBg.split(' ').forEach(function(c) { activeBtn.classList.add(c); });
      activeText.split(' ').forEach(function(c) { activeBtn.classList.add(c); });
    }
  }
};
