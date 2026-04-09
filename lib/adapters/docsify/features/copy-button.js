// Copy Button — adds copy buttons to code blocks.
// Exports functions for use by renderer.js (no standalone plugin registration).

export function addCopyButton(codeEl) {
  var pre = codeEl.closest('pre');
  if (!pre || pre.querySelector('.code-copy-btn')) return;
  if (codeEl.classList.contains('lang-mermaid') || codeEl.classList.contains('language-mermaid')) return;

  pre.style.position = 'relative';
  var btn = document.createElement('button');
  btn.className = 'code-copy-btn';
  btn.textContent = 'Copy';
  btn.addEventListener('click', function() {
    var text = codeEl.textContent;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function() {
        btn.textContent = '\u2713 Copied';
        btn.classList.add('copied');
        setTimeout(function() { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
      }, function() {
        btn.textContent = 'Failed';
        setTimeout(function() { btn.textContent = 'Copy'; }, 1500);
      });
    } else {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        btn.textContent = '\u2713 Copied';
        btn.classList.add('copied');
        setTimeout(function() { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
      } catch(e) {
        btn.textContent = 'Failed';
        setTimeout(function() { btn.textContent = 'Copy'; }, 1500);
      }
      document.body.removeChild(ta);
    }
  });
  pre.appendChild(btn);
}

// observeDOM callback: watches for dynamically added <pre> elements.
// Returns cleanup function.
export function observeCopyButtons(root) {
  var observer = new MutationObserver(function(mutations) {
    var needsScan = false;
    mutations.forEach(function(m) {
      m.addedNodes.forEach(function(node) {
        if (node.nodeType === 1 && (node.tagName === 'PRE' || node.querySelector && node.querySelector('pre'))) {
          needsScan = true;
        }
      });
    });
    if (needsScan) {
      root.querySelectorAll('pre > code').forEach(addCopyButton);
    }
  });
  observer.observe(root, { childList: true, subtree: true });
  return function() { observer.disconnect(); };
}
