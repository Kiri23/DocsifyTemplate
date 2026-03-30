/* wasm-loaders.js — Lazy loaders for Pandoc and Typst WASM compilers */

var pandocConvert = null;
var pandocLoading = false;
var typstLoaded = false;

export async function ensurePandoc(statusEl) {
  if (pandocConvert) return pandocConvert;
  if (pandocLoading) return null;
  pandocLoading = true;
  statusEl.textContent = 'Loading pandoc.wasm (~56MB)…';
  statusEl.style.display = '';
  try {
    var mod = await import('./pandoc.js');
    pandocConvert = mod.convert;
    statusEl.textContent = '';
    statusEl.style.display = 'none';
    return pandocConvert;
  } catch (err) {
    statusEl.textContent = 'Failed to load pandoc: ' + err.message;
    pandocLoading = false;
    return null;
  }
}

export async function ensureTypst(statusEl) {
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
