/* latex-export.js — "Export to LaTeX" button for Docsify pages
   Lazy-loads pandoc.wasm (~56MB) only when the user clicks the button.
   Uses the official jgm/pandoc WASI interface (pandoc.js).
*/
(function () {
  var pandocConvert = null;
  var loading = false;

  // Lazy-load pandoc.js only on first click
  async function ensurePandoc(statusEl) {
    if (pandocConvert) return true;
    if (loading) return false;
    loading = true;
    statusEl.textContent = 'Loading pandoc.wasm (~56MB)…';
    statusEl.style.display = '';
    try {
      var mod = await import('./pandoc.js');
      pandocConvert = mod.convert;
      statusEl.textContent = '';
      statusEl.style.display = 'none';
      return true;
    } catch (err) {
      statusEl.textContent = 'Failed to load pandoc: ' + err.message;
      loading = false;
      return false;
    }
  }

  // Get the raw markdown for the current page from Docsify's internal cache
  function getCurrentMarkdown() {
    // Docsify stores the raw markdown in its virtual file system
    // We can re-fetch the current page's .md file
    var path = window.location.hash.replace('#/', '') || 'README';
    if (path.indexOf('?') !== -1) path = path.split('?')[0];
    if (!path.endsWith('.md')) path += '.md';
    return fetch(path).then(function (r) {
      if (!r.ok) throw new Error('Could not fetch ' + path);
      return r.text();
    });
  }

  function createExportUI() {
    var container = document.createElement('div');
    container.className = 'latex-export-bar';

    var btn = document.createElement('button');
    btn.className = 'latex-export-btn';
    btn.textContent = 'Export to LaTeX';
    btn.title = 'Convert this page to LaTeX using Pandoc (runs in browser)';

    var formatSelect = document.createElement('select');
    formatSelect.className = 'latex-export-select';
    var formats = [
      ['latex', 'LaTeX'],
      ['html', 'HTML'],
      ['rst', 'reStructuredText'],
      ['org', 'Org Mode'],
    ];
    formats.forEach(function (f) {
      var opt = document.createElement('option');
      opt.value = f[0];
      opt.textContent = f[1];
      formatSelect.appendChild(opt);
    });

    var status = document.createElement('span');
    status.className = 'latex-export-status';
    status.style.display = 'none';

    container.appendChild(btn);
    container.appendChild(formatSelect);
    container.appendChild(status);

    btn.addEventListener('click', async function () {
      var ready = await ensurePandoc(status);
      if (!ready) return;

      btn.disabled = true;
      btn.textContent = 'Converting…';
      try {
        var md = await getCurrentMarkdown();
        var format = formatSelect.value;
        var result = await pandocConvert(
          { from: 'markdown', to: format, standalone: true },
          md,
          {}
        );
        downloadResult(result.stdout, format);
        btn.textContent = 'Export to LaTeX';
      } catch (err) {
        status.style.display = '';
        status.textContent = 'Error: ' + err.message;
        btn.textContent = 'Export to LaTeX';
      }
      btn.disabled = false;
    });

    return container;
  }

  function downloadResult(text, format) {
    var ext = { latex: '.tex', html: '.html', rst: '.rst', org: '.org' }[format] || '.txt';
    var mime = { latex: 'text/x-tex', html: 'text/html', rst: 'text/plain', org: 'text/plain' }[format] || 'text/plain';
    var blob = new Blob([text], { type: mime });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    // Use page title or path for filename
    var name = (document.querySelector('.markdown-section h1') || {}).textContent || 'document';
    name = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    a.download = name + ext;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // Register as Docsify plugin
  window.$docsify = window.$docsify || {};
  window.$docsify.plugins = (window.$docsify.plugins || []).concat([
    function latexExportPlugin(hook) {
      hook.doneEach(function () {
        // Remove old export bar if present
        var old = document.querySelector('.latex-export-bar');
        if (old) old.remove();

        // Add export bar at the top of the content area
        var section = document.querySelector('.markdown-section');
        if (!section) return;

        var bar = createExportUI();
        section.insertBefore(bar, section.firstChild);
      });
    }
  ]);
})();
