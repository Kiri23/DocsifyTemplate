/* latex-export.js — Export button for Docsify pages
   Supports: LaTeX (branded), LLM Text, plain LaTeX/HTML/RST/Org.
   Lazy-loads pandoc.wasm (~56MB) only on first click.
   Lua filters transform YAML code fence components into proper output.
*/
(function () {
  var pandocConvert = null;
  var loading = false;

  // Cache for filter/template files (fetched once)
  var filterCache = {};

  async function fetchText(path) {
    if (filterCache[path]) return filterCache[path];
    var res = await fetch(path);
    if (!res.ok) throw new Error('Could not fetch ' + path + ' (' + res.status + ')');
    var text = await res.text();
    filterCache[path] = text;
    return text;
  }

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

  function getCurrentMarkdown() {
    var path = window.location.hash.replace('#/', '') || 'README';
    if (path.indexOf('?') !== -1) path = path.split('?')[0];
    if (!path.endsWith('.md')) path += '.md';
    return fetch(path).then(function (r) {
      if (!r.ok) throw new Error('Could not fetch ' + path);
      return r.text();
    });
  }

  // Strip Docsify-specific YAML frontmatter (---\n...\n---)
  function stripFrontmatter(md) {
    if (md.trimStart().startsWith('---')) {
      var end = md.indexOf('\n---', 4);
      if (end !== -1) {
        return md.slice(end + 4).trimStart();
      }
    }
    return md;
  }

  // Format definitions: [value, label, pandocFormat, filterPath, templatePath, ext, mime]
  var FORMAT_DEFS = [
    { value: 'latex-branded', label: 'LaTeX (Branded)',       to: 'latex',    filter: 'filters/latex-components.lua', template: 'templates/branded.tex', ext: '.tex',  mime: 'text/x-tex' },
    { value: 'llm',           label: 'LLM Text',              to: 'markdown', filter: 'filters/llm-components.lua',   template: null,                    ext: '.md',   mime: 'text/markdown' },
    { value: 'latex',         label: 'LaTeX (plain)',          to: 'latex',    filter: null,                           template: null,                    ext: '.tex',  mime: 'text/x-tex' },
    { value: 'html',          label: 'HTML',                   to: 'html',    filter: null,                           template: null,                    ext: '.html', mime: 'text/html' },
    { value: 'rst',           label: 'reStructuredText',       to: 'rst',     filter: null,                           template: null,                    ext: '.rst',  mime: 'text/plain' },
    { value: 'org',           label: 'Org Mode',               to: 'org',     filter: null,                           template: null,                    ext: '.org',  mime: 'text/plain' },
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
      var ready = await ensurePandoc(status);
      if (!ready) return;

      var fmt = FORMAT_DEFS.find(function (f) { return f.value === formatSelect.value; });
      if (!fmt) return;

      btn.disabled = true;
      btn.textContent = 'Converting…';
      status.style.display = '';
      status.textContent = '';

      try {
        var md = await getCurrentMarkdown();
        md = stripFrontmatter(md);

        // Build pandoc options
        var options = { from: 'markdown', to: fmt.to, standalone: true };
        var files = {};

        // Load and attach Lua filter if needed
        // Concatenates shared yaml-parser.lua + filter-specific code
        if (fmt.filter) {
          status.textContent = 'Loading filter…';
          var parserCode = await fetchText('filters/yaml-parser.lua');
          var filterCode = await fetchText(fmt.filter);
          var combined = parserCode + '\n' + filterCode;
          files['filter.lua'] = new Blob([combined], { type: 'text/plain' });
          options.filters = ['filter.lua'];
        }

        // Load and attach template if needed
        if (fmt.template) {
          status.textContent = 'Loading template…';
          var templateCode = await fetchText(fmt.template);
          files['branded.tex'] = new Blob([templateCode], { type: 'text/plain' });
          options.template = 'branded.tex';
        }

        // Add title metadata from the page
        var h1 = document.querySelector('.markdown-section h1');
        if (h1) {
          options['metadata'] = { title: h1.textContent.trim() };
        }

        status.textContent = 'Converting…';
        var result = await pandocConvert(options, md, files);

        if (result.stderr) console.warn('pandoc stderr:', result.stderr);
        if (result.warnings && result.warnings.length) {
          console.warn('pandoc warnings:', result.warnings);
        }

        downloadResult(result.stdout, fmt);
        status.textContent = '';
        status.style.display = 'none';
        btn.textContent = 'Export';
      } catch (err) {
        status.style.display = '';
        status.textContent = 'Error: ' + err.message;
        console.error('Export error:', err);
        btn.textContent = 'Export';
      }
      btn.disabled = false;
    });

    return container;
  }

  function downloadResult(text, fmt) {
    var blob = new Blob([text], { type: fmt.mime });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    var name = (document.querySelector('.markdown-section h1') || {}).textContent || 'document';
    name = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    a.download = name + fmt.ext;
    a.click();
    URL.revokeObjectURL(a.href);
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

        var bar = createExportUI();
        section.insertBefore(bar, section.firstChild);
      });
    }
  ]);
})();
