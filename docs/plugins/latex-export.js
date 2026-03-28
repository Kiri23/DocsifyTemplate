/* latex-export.js — Export button for Docsify pages
   Supports: PDF (via Typst WASM), LaTeX (branded), LLM Text, plain formats.
   Lazy-loads pandoc.wasm (~56MB) and typst.wasm (~5MB) only on first use.
   Lua filters transform YAML code fence components into proper output.
*/
(function () {
  var pandocConvert = null;
  var pandocLoading = false;
  var typstLoaded = false;

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
    if (pandocLoading) return false;
    pandocLoading = true;
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
      pandocLoading = false;
      return false;
    }
  }

  async function ensureTypst(statusEl) {
    if (typstLoaded && typeof $typst !== 'undefined') return true;
    statusEl.textContent = 'Loading Typst compiler…';
    statusEl.style.display = '';
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.type = 'module';
      script.src = 'https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-all-in-one.ts@0.7.0-rc2/dist/esm/index.js';
      script.onload = function () {
        var check = function () {
          if (typeof $typst !== 'undefined') {
            typstLoaded = true;
            resolve(true);
          } else {
            setTimeout(check, 100);
          }
        };
        check();
      };
      script.onerror = function () {
        statusEl.textContent = 'Failed to load Typst compiler';
        reject(new Error('Failed to load Typst WASM'));
      };
      document.head.appendChild(script);
    });
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

  function stripFrontmatter(md) {
    if (md.trimStart().startsWith('---')) {
      var end = md.indexOf('\n---', 4);
      if (end !== -1) {
        return md.slice(end + 4).trimStart();
      }
    }
    return md;
  }

  function getPageName() {
    var name = (document.querySelector('.markdown-section h1') || {}).textContent || 'document';
    return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  // Capture rendered Mermaid SVGs from the DOM.
  // Cleans foreignObject → native SVG <text> so Typst can render text.
  function captureMermaidSVGs() {
    var svgs = [];
    var svgElements = document.querySelectorAll('.markdown-section .mermaid svg');
    svgElements.forEach(function (svg) {
      // Clone to avoid modifying the DOM
      var clone = svg.cloneNode(true);
      // Replace foreignObject (HTML text) with SVG <text> elements
      clone.querySelectorAll('foreignObject').forEach(function (fo) {
        var textContent = fo.textContent.trim();
        var svgText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        var x = parseFloat(fo.getAttribute('x') || '0');
        var y = parseFloat(fo.getAttribute('y') || '0');
        var w = parseFloat(fo.getAttribute('width') || '100');
        var h = parseFloat(fo.getAttribute('height') || '20');
        svgText.setAttribute('x', String(x + w / 2));
        svgText.setAttribute('y', String(y + h / 2 + 5));
        svgText.setAttribute('text-anchor', 'middle');
        svgText.setAttribute('dominant-baseline', 'middle');
        svgText.setAttribute('font-size', '14');
        svgText.setAttribute('font-family', 'sans-serif');
        svgText.textContent = textContent;
        fo.parentNode.replaceChild(svgText, fo);
      });
      var svgStr = new XMLSerializer().serializeToString(clone);
      svgs.push(svgStr);
    });
    return svgs;
  }

  // Replace %%MERMAID_SVG_N%% placeholders in Typst source with image.decode
  function inlineMermaidSVGs(typstSource, svgs) {
    return typstSource.replace(/%%MERMAID_SVG_(\d+)%%/g, function (match, idx) {
      var i = parseInt(idx);
      if (i >= svgs.length) return '';
      // Escape the SVG string for Typst: backslashes and quotes
      var escaped = svgs[i].replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      return '#image.decode("' + escaped + '", width: 80%)';
    });
  }

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
          var templateName = fmt.template.split('/').pop();
          files[templateName] = new Blob([templateCode], { type: 'text/plain' });
          options.template = templateName;
        }

        // Capture rendered Mermaid SVGs from the DOM
        var mermaidSVGs = captureMermaidSVGs();

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

        // PDF: compile Typst source → PDF via Typst WASM
        if (fmt.value === 'pdf') {
          console.log('--- Typst source ---');
          console.log(result.stdout);
          console.log('--- Files ---');
          console.log(Object.keys(files));
          status.textContent = 'Compiling PDF…';
          await ensureTypst(status);

          // Inline Mermaid SVGs into Typst source (replaces %%MERMAID_SVG_N%% placeholders)
          var typstSource = inlineMermaidSVGs(result.stdout, mermaidSVGs);

          $typst.resetShadow();
          var typstBytes = new TextEncoder().encode(typstSource);
          $typst.mapShadow('/main.typ', typstBytes);
          $typst.mapShadow('main.typ', typstBytes);

          status.textContent = 'Generating PDF…';
          var pdfData;
          try {
            pdfData = await $typst.pdf({ mainFilePath: '/main.typ' });
          } catch (typstErr) {
            var errStr = String(typstErr);
            var msgMatch = errStr.match(/message:\s*"([^"]+)"/);
            var typstMsg = msgMatch ? msgMatch[1] : errStr;
            // Download the .typ source for debugging
            var debugBlob = new Blob([result.stdout], { type: 'text/plain' });
            var debugA = document.createElement('a');
            debugA.href = URL.createObjectURL(debugBlob);
            debugA.download = getPageName() + '-debug.typ';
            debugA.click();
            throw new Error('Typst: ' + typstMsg + ' | SVGs: ' + mermaidSVGs.length);
          }

          if (!pdfData || pdfData.length === 0) {
            throw new Error('Typst produced empty PDF output');
          }

          var pdfBlob = new Blob([pdfData], { type: 'application/pdf' });
          var a = document.createElement('a');
          a.href = URL.createObjectURL(pdfBlob);
          a.download = getPageName() + '.pdf';
          a.click();
          URL.revokeObjectURL(a.href);
        } else {
          // Text-based formats: download directly
          downloadResult(result.stdout, fmt);
        }

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
    a.download = getPageName() + fmt.ext;
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
