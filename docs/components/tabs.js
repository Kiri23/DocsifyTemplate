// Tabs Component — warm/cool split for Getting Started vs Technical Reference
// Registers window.Tabs

window.Tabs = function Tabs(tabs, targetId) {
  targetId = targetId || 'tab-content';

  return `
    <div class="mb-8 border-b-2 border-border">
      <nav class="flex gap-1" role="tablist">
        ${tabs.map(function(tab) {
          var isActive = tab.active;
          var activeClass = isActive
            ? 'border-b-[3px] border-primary text-primary bg-primary-light/60'
            : 'text-text-muted hover:text-text-secondary hover:bg-surface-raised';

          var htmxAttrs = tab.href
            ? 'hx-get="' + tab.href + '" hx-target="#' + targetId + '" hx-swap="innerHTML"'
            : '';

          return '<button ' +
            'class="tab-btn relative px-5 md:px-7 py-3 md:py-3.5 min-h-[44px] text-sm font-semibold tracking-wide transition-all duration-200 rounded-t-lg ' + activeClass + '" ' +
            htmxAttrs + ' ' +
            'onclick="document.querySelectorAll(\'.tab-btn\').forEach(function(b){b.classList.remove(\'border-b-[3px]\',\'border-primary\',\'text-primary\',\'bg-primary-light/60\');b.classList.add(\'text-text-muted\')});this.classList.add(\'border-b-[3px]\',\'border-primary\',\'text-primary\',\'bg-primary-light/60\');this.classList.remove(\'text-text-muted\');" ' +
            'role="tab" type="button">' +
            tab.label +
            '</button>';
        }).join('')}
      </nav>
    </div>
  `;
};
