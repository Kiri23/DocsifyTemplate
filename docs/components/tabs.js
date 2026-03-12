// Tabs Component — distinct visual modes for Quick Start vs Technical Reference
// Registers window.Tabs

window.Tabs = function Tabs(tabs, targetId) {
  targetId = targetId || 'tab-content';

  // Determine initial active tab for zone class
  var initialZone = 'quick-start';
  tabs.forEach(function(tab) {
    if (tab.active && tab.href && tab.href.indexOf('technical') !== -1) {
      initialZone = 'technical';
    }
  });

  return `
    <div class="tab-bar mb-0 border-b-2 border-border" style="background: var(--surface-raised); margin: -2.5rem -3rem 0 -3rem; padding: 0 3rem;">
      <nav class="flex gap-0" role="tablist">
        ${tabs.map(function(tab) {
          var isActive = tab.active;
          var isTechnical = tab.href && tab.href.indexOf('technical') !== -1;

          var activeClass = isActive
            ? (isTechnical
                ? 'border-b-[3px] border-[#6366f1] text-[#6366f1] bg-white font-bold'
                : 'border-b-[3px] border-[#0891b2] text-[#0891b2] bg-white font-bold')
            : 'text-[#78716c] hover:text-[#44403c] hover:bg-[#efedeb] font-medium';

          var htmxAttrs = tab.href
            ? 'hx-get="' + tab.href + '" hx-target="#' + targetId + '" hx-swap="innerHTML"'
            : '';

          // Icon for each tab
          var icon = isTechnical
            ? '<svg class="inline-block w-4 h-4 mr-1.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>'
            : '<svg class="inline-block w-4 h-4 mr-1.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>';

          return '<button ' +
            'class="tab-btn relative px-6 py-3.5 text-sm tracking-wide transition-all duration-200 ' + activeClass + '" ' +
            'data-tab-type="' + (isTechnical ? 'technical' : 'quick-start') + '" ' +
            htmxAttrs + ' ' +
            'onclick="' +
              'var zone=this.getAttribute(\'data-tab-type\');' +
              'var content=document.getElementById(\'' + targetId + '\');' +
              'if(content){content.className=\'tab-zone-\'+zone;}' +
              'document.querySelectorAll(\'.tab-btn\').forEach(function(b){' +
                'b.className=\'tab-btn relative px-6 py-3.5 text-sm tracking-wide transition-all duration-200 text-[#78716c] hover:text-[#44403c] hover:bg-[#efedeb] font-medium\';' +
              '});' +
              'var isTech=zone===\'technical\';' +
              'this.className=\'tab-btn relative px-6 py-3.5 text-sm tracking-wide transition-all duration-200 \'+(isTech?\'border-b-[3px] border-[#6366f1] text-[#6366f1] bg-white font-bold\':\'border-b-[3px] border-[#0891b2] text-[#0891b2] bg-white font-bold\');' +
            '" ' +
            'role="tab" type="button">' +
            icon + tab.label +
            '</button>';
        }).join('')}
      </nav>
    </div>
    <style>
      /* Quick Start zone — warm, spacious, approachable */
      .tab-zone-quick-start {
        background: #faf9f7;
        padding: 2rem 0;
        font-size: 1rem;
        line-height: 1.8;
      }
      .tab-zone-quick-start h2 { color: #1c1917; font-size: 1.5rem; }
      .tab-zone-quick-start h3 { color: #1c1917; font-size: 1.2rem; }
      .tab-zone-quick-start p { color: #44403c; }

      /* Technical Reference zone — cool, dense, precise */
      .tab-zone-technical {
        background: #f8fafc;
        padding: 1.5rem 0;
        font-size: 0.9rem;
        line-height: 1.65;
        border-left: 3px solid #6366f1;
        padding-left: 1.5rem;
        margin-left: -0.5rem;
      }
      .tab-zone-technical h2 { color: #1e293b; font-size: 1.25rem; letter-spacing: -0.01em; }
      .tab-zone-technical h3 { color: #334155; font-size: 1.05rem; }
      .tab-zone-technical p { color: #475569; font-size: 0.9rem; }
      .tab-zone-technical table { font-size: 0.825rem; }
      .tab-zone-technical code { font-size: 0.8rem; }
    </style>
  `;
};
