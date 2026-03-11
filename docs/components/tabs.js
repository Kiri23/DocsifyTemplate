// Tabs Component — vanilla JS + HTMX, no Alpine.js
// Registers window.Tabs

window.Tabs = function Tabs(tabs, targetId) {
  targetId = targetId || 'tab-content';

  return `
    <div class="border-b border-gray-200 mb-6">
      <nav class="flex space-x-4" role="tablist">
        ${tabs.map(function(tab) {
          var activeClass = tab.active
            ? 'border-b-3 border-primary text-primary'
            : 'text-gray-600 hover:text-gray-900';

          var htmxAttrs = tab.href
            ? 'hx-get="' + tab.href + '" hx-target="#' + targetId + '" hx-swap="innerHTML"'
            : '';

          return '<button ' +
            'class="tab-btn px-4 md:px-6 py-3 md:py-4 min-h-[44px] text-sm md:text-base font-medium transition-colors duration-200 ' + activeClass + '" ' +
            htmxAttrs + ' ' +
            'onclick="document.querySelectorAll(\'.tab-btn\').forEach(function(b){b.classList.remove(\'border-b-3\',\'border-primary\',\'text-primary\');b.classList.add(\'text-gray-600\')});this.classList.add(\'border-b-3\',\'border-primary\',\'text-primary\');this.classList.remove(\'text-gray-600\');" ' +
            'role="tab" type="button">' +
            tab.label +
            '</button>';
        }).join('')}
      </nav>
    </div>
  `;
};
