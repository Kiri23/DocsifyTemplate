// Tabs Component — distinct visual modes for Quick Start vs Technical Reference
// No utils dependency — pure standalone.

export function Tabs(tabs, targetId) {
  targetId = targetId || 'tab-content';

  var colors = {
    quickStart: 'var(--color-primary)',
    technical: 'var(--color-tech-accent)',
    inactive: 'var(--color-text-tertiary)',
    inactiveHover: 'var(--color-text-secondary)',
    hoverBg: 'var(--color-surface-sunken)'
  };

  return '<div class="tab-bar mb-0 border-b-2 border-border" style="background: var(--color-surface-raised); margin: -2.5rem -3rem 0 -3rem; padding: 0 3rem;">' +
    '<nav class="flex gap-0" role="tablist">' +
      tabs.map(function(tab) {
        var isActive = tab.active;
        var isTechnical = tab.href && tab.href.indexOf('technical') !== -1;
        var accentVar = isTechnical ? colors.technical : colors.quickStart;
        var activeStyle = isActive
          ? 'border-bottom: 3px solid ' + accentVar + '; color: ' + accentVar + '; background: white; font-weight: bold;'
          : 'color: ' + colors.inactive + '; font-weight: 500;';
        var htmxAttrs = tab.href
          ? 'hx-get="' + tab.href + '" hx-target="#' + targetId + '" hx-swap="innerHTML"'
          : '';
        var icon = isTechnical
          ? '<svg class="inline-block w-4 h-4 mr-1.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>'
          : '<svg class="inline-block w-4 h-4 mr-1.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>';

        return '<button ' +
          'class="tab-btn relative px-6 py-3.5 text-sm tracking-wide transition-all duration-200" ' +
          'style="' + activeStyle + '" ' +
          'data-tab-type="' + (isTechnical ? 'technical' : 'quick-start') + '" ' +
          'data-accent="' + accentVar + '" ' +
          htmxAttrs + ' ' +
          'onclick="' +
            'var zone=this.getAttribute(\'data-tab-type\');' +
            'var content=document.getElementById(\'' + targetId + '\');' +
            'if(content){content.className=\'tab-zone-\'+zone;}' +
            'var accent=this.getAttribute(\'data-accent\');' +
            'document.querySelectorAll(\'.tab-btn\').forEach(function(b){' +
              'b.style.borderBottom=\'none\';' +
              'b.style.color=\'' + colors.inactive + '\';' +
              'b.style.background=\'transparent\';' +
              'b.style.fontWeight=\'500\';' +
              'b.setAttribute(\'aria-selected\',\'false\');' +
            '});' +
            'this.style.borderBottom=\'3px solid \'+accent;' +
            'this.style.color=accent;' +
            'this.style.background=\'white\';' +
            'this.style.fontWeight=\'bold\';' +
            'this.setAttribute(\'aria-selected\',\'true\');' +
          '" ' +
          'role="tab" aria-selected="' + (isActive ? 'true' : 'false') + '" type="button">' +
          icon + tab.label +
          '</button>';
      }).join('') +
    '</nav>' +
  '</div>';
};
