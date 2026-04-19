/* latex-export.js — Export button UI.
   Exports createExportUI and injectExportBar for use by renderer.js.
   Reads enabled formats from config.features.export.
*/

import { getConfig } from '../../../core/config.js';

// All available format definitions — config.features.export.formats filters which ones appear.
const ALL_FORMAT_DEFS = [
  {
    value: 'pdf', label: 'PDF', to: 'typst', rendererKey: 'typst',
    template: 'templates/branded.typ', ext: '.pdf', mime: 'application/pdf',
    mermaid: function (idx) { return '\n```{=typst}\n%%MERMAID_SVG_' + idx + '%%\n```\n'; },
    image: function (src, alt, idx) { return '\n```{=typst}\n%%IMAGE_' + idx + '%%' + src + '%%IMAGEEND%%\n```\n'; },
    hr: function () { return '\n```{=typst}\n#line(length: 100%, stroke: 0.5pt + luma(200))\n```\n'; },
  },
  {
    value: 'latex-branded', label: 'LaTeX (Branded)', to: 'latex', rendererKey: 'latex',
    template: 'templates/branded.tex', ext: '.tex', mime: 'text/x-tex',
    mermaid: function (idx) { return '\n```{=latex}\n\\includegraphics[width=\\textwidth]{mermaid-' + idx + '.svg}\n```\n'; },
    image: null,
    hr: null,
  },
  {
    value: 'markdown', label: 'Markdown', to: 'markdown', rendererKey: 'markdown',
    template: null, ext: '.md', mime: 'text/markdown',
    mermaid: null,
    image: null,
    hr: null,
  },
];

// Filter to only config-enabled formats
function getEnabledFormats() {
  let cfg;
  try { cfg = getConfig(); } catch { return ALL_FORMAT_DEFS; }
  const enabledValues = cfg?.features?.export?.formats;
  if (!enabledValues || !Array.isArray(enabledValues)) return ALL_FORMAT_DEFS;
  return ALL_FORMAT_DEFS.filter(f => enabledValues.includes(f.value));
}

export const FORMAT_DEFS = getEnabledFormats();

export function createExportUI() {
  var container = document.createElement('div');
  container.className = 'latex-export-bar';

  var btn = document.createElement('button');
  btn.className = 'latex-export-btn';
  btn.textContent = 'Export';
  btn.title = 'Convert this page using Pandoc (runs in browser)';

  var formatSelect = document.createElement('select');
  formatSelect.className = 'latex-export-select';
  FORMAT_DEFS.forEach(function (f) {
    var opt = document.createElement('option');
    opt.value = f.value;
    opt.textContent = f.label;
    formatSelect.appendChild(opt);
  });

  var status = document.createElement('span');
  status.className = 'latex-export-status';
  status.style.display = 'none';

  var btnAll = document.createElement('button');
  btnAll.className = 'latex-export-btn';
  btnAll.textContent = 'Export All';
  btnAll.title = 'Export all pages as a single file';
  btnAll.style.marginLeft = '0.25rem';

  // Config-gated: hide "Export All" if disabled
  var cfg;
  try { cfg = getConfig(); } catch { cfg = null; }
  var showExportAll = cfg?.features?.export?.exportAll !== false;

  container.appendChild(btn);
  if (showExportAll) container.appendChild(btnAll);
  container.appendChild(formatSelect);
  container.appendChild(status);

  // Set default format from config
  var defaultFmt = cfg?.features?.export?.defaultFormat;
  if (defaultFmt && formatSelect.querySelector('option[value="' + defaultFmt + '"]')) {
    formatSelect.value = defaultFmt;
  }

  async function doExport(exportFn, label) {
    var fmt = FORMAT_DEFS.find(function (f) { return f.value === formatSelect.value; });
    if (!fmt) return;

    btn.disabled = true;
    btnAll.disabled = true;
    btn.textContent = label;
    status.style.display = '';
    status.textContent = '';

    try {
      var pipeline = await import('/packages/docsify-plugin/src/adapters/docsify/export/pipeline.js');
      var ok = await pipeline[exportFn](fmt, status);
      if (ok !== false) {
        status.textContent = '';
        status.style.display = 'none';
      }
    } catch (err) {
      if (!status.hasChildNodes()) {
        status.style.display = '';
        status.textContent = 'Error: ' + err.message;
      }
      console.error('Export error:', err);
    }
    btn.textContent = 'Export';
    btn.disabled = false;
    btnAll.disabled = false;
  }

  btn.addEventListener('click', function () { doExport('runExport', 'Converting\u2026'); });
  btnAll.addEventListener('click', function () {
    if (!confirm('This will export all documentation pages into a single file.\nThis may take a while depending on the number of pages.\n\nContinue?')) return;
    doExport('runExportAll', 'Exporting all\u2026');
  });

  return container;
}

// injectDOM callback: removes old bar and inserts fresh one.
export function injectExportBar(root) {
  var old = root.querySelector('.latex-export-bar');
  if (old) old.remove();
  root.insertBefore(createExportUI(), root.firstChild);
}
