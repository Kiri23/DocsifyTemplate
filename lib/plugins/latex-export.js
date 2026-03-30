P/* latex-export.js — Docsify plugin: Export button UI
   Delegates to export/ modules for WASM loading, pipeline, and SVG capture.
*/
(function () {
  // Format definitions
  var FORMAT_DEFS = [
    { value: 'pdf',           label: 'PDF',                    to: 'typst',    filter: 'filters/typst-components.lua', template: 'templates/branded.typ', ext: '.pdf',  mime: 'application/pdf' },
    { value: 'latex-branded', label: 'LaTeX (Branded)',         to: 'latex',    filter: 'filters/latex-components.lua', template: 'templates/branded.tex', ext: '.tex',  mime: 'text/x-tex' },
    { value: 'llm',           label: 'LLM Text',               to: 'markdown', filter: 'filters/llm-components.lua',   template: null,                    ext: '.md',   mime: 'text/markdown' },
    { value: 'latex',         label: 'LaTeX (plain)',           to: 'latex',    filter: null,                           template: null,                    ext: '.tex',  mime: 'text/x-tex' },
    { value: 'html',          label: 'HTML',                    to: 'html',     filter: null,                           template: null,                    ext: '.html', mime: 'text/html' },
    { value: 'rst',           label: 'reStructuredText',        to: 'rst',      filter: null,                           template: null,                    ext: '.rst',  mime: 'text/plain' },
    { value: 'org',           label: 'Org Mode',                to: 'org',      filter: null,                           template: null,                    ext: '.org',  mime: 'text/plain' },
  ];

  function createExportUI() {
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

    container.appendChild(btn);
    container.appendChild(formatSelect);
    container.appendChild(status);

    btn.addEventListener('click', async function () {
      var fmt = FORMAT_DEFS.find(function (f) { return f.value === formatSelect.value; });
      if (!fmt) return;

      btn.disabled = true;
      btn.textContent = 'Converting…';
      status.style.display = '';
      status.textContent = '';

      try {
        var { runExport } = await import('../export/pipeline.js');
        await runExport(fmt, status);
        status.textContent = '';
        status.style.display = 'none';
      } catch (err) {
        status.style.display = '';
        status.textContent = 'Error: ' + err.message;
        console.error('Export error:', err);
      }
      btn.textContent = 'Export';
      btn.disabled = false;
    });

    return container;
  }

  // Register as Docsify plugin
  window.$docsify = window.$docsify || {};
  window.$docsify.plugins = (window.$docsify.plugins || []).concat([
    function latexExportPlugin(hook) {
      hook.doneEach(function () {
        var old = document.querySelector('.latex-export-bar');
        if (old) old.remove();

        var section = document.querySelector('.markdown-section');
        if (!section) return;

        section.insertBefore(createExportUI(), section.firstChild);
      });
    }
  ]);
})();
