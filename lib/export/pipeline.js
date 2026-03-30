/* pipeline.js — Export conversion pipeline */

import { ensurePandoc, ensureTypst } from './wasm-loaders.js';
import { captureMermaidSVGs, inlineMermaidSVGs } from './mermaid-capture.js';

// Cache for filter/template files (fetched once)
var fileCache = {};

async function fetchText(path) {
  if (fileCache[path]) return fileCache[path];
  var url = new URL(path, import.meta.url);
  var res = await fetch(url);
  if (!res.ok) throw new Error('Could not fetch ' + path + ' (' + res.status + ')');
  var text = await res.text();
  fileCache[path] = text;
  return text;
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
    if (end !== -1) return md.slice(end + 4).trimStart();
  }
  return md;
}

export function getPageName() {
  var name = (document.querySelector('.markdown-section h1') || {}).textContent || 'document';
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function downloadBlob(blob, filename) {
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// Main export function — orchestrates the full pipeline
export async function runExport(fmt, statusEl) {
  var convert = await ensurePandoc(statusEl);
  if (!convert) throw new Error('Pandoc failed to load');

  var md = await getCurrentMarkdown();
  md = stripFrontmatter(md);

  // Build pandoc options
  var options = { from: 'markdown', to: fmt.to, standalone: true };
  var files = {};

  // Load Lua filter (yaml-parser + format-specific filter)
  if (fmt.filter) {
    statusEl.textContent = 'Loading filter…';
    var parserCode = await fetchText('filters/yaml-parser.lua');
    var filterCode = await fetchText(fmt.filter);
    files['filter.lua'] = new Blob([parserCode + '\n' + filterCode], { type: 'text/plain' });
    options.filters = ['filter.lua'];
  }

  // Load template
  if (fmt.template) {
    statusEl.textContent = 'Loading template…';
    var templateCode = await fetchText(fmt.template);
    var templateName = fmt.template.split('/').pop();
    files[templateName] = new Blob([templateCode], { type: 'text/plain' });
    options.template = templateName;
  }

  // Capture Mermaid SVGs from DOM
  var mermaidSVGs = captureMermaidSVGs();

  // Add title metadata
  var h1 = document.querySelector('.markdown-section h1');
  if (h1) options.metadata = { title: h1.textContent.trim() };

  // Run Pandoc conversion
  statusEl.textContent = 'Converting…';
  var result = await convert(options, md, files);

  if (result.stderr) console.warn('pandoc stderr:', result.stderr);

  var pageName = getPageName();

  // PDF: Pandoc output → Typst source → Typst WASM → PDF
  if (fmt.value === 'pdf') {
    statusEl.textContent = 'Compiling PDF…';
    await ensureTypst(statusEl);

    var typstSource = inlineMermaidSVGs(result.stdout, mermaidSVGs);

    $typst.resetShadow();
    var typstBytes = new TextEncoder().encode(typstSource);
    $typst.mapShadow('/main.typ', typstBytes);
    $typst.mapShadow('main.typ', typstBytes);

    statusEl.textContent = 'Generating PDF…';
    var pdfData;
    try {
      pdfData = await $typst.pdf({ mainFilePath: '/main.typ' });
    } catch (typstErr) {
      var errStr = String(typstErr);
      var msgMatch = errStr.match(/message:\s*"([^"]+)"/);
      var typstMsg = msgMatch ? msgMatch[1] : errStr;
      // Download debug .typ source
      downloadBlob(new Blob([result.stdout], { type: 'text/plain' }), pageName + '-debug.typ');
      throw new Error('Typst: ' + typstMsg);
    }

    if (!pdfData || pdfData.length === 0) throw new Error('Typst produced empty PDF');

    downloadBlob(new Blob([pdfData], { type: 'application/pdf' }), pageName + '.pdf');
  } else {
    // Text formats: download directly
    downloadBlob(new Blob([result.stdout], { type: fmt.mime }), pageName + fmt.ext);
  }
}
