// Copy Button Plugin — adds copy buttons to all code blocks
// Uses MutationObserver to catch dynamically added <pre> elements
// (from Preact components expanding, page navigation, etc.)

function addCopyButton(pre) {
  if (pre.querySelector('.code-copy-btn')) return;
  var code = pre.querySelector('code');
  if (!code) return;
  if (code.classList.contains('lang-mermaid') || code.classList.contains('language-mermaid')) return;

  pre.style.position = 'relative';
  var btn = document.createElement('button');
  btn.className = 'code-copy-btn';
  btn.textContent = 'Copy';
  btn.addEventListener('click', function() {
    var text = code.textContent;
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

function scanAll() {
  document.querySelectorAll('.markdown-section pre').forEach(addCopyButton);
}

// Docsify plugin: scan on each page render
window.$docsify = window.$docsify || {};
window.$docsify.plugins = (window.$docsify.plugins || []).concat([
  function copyButtonPlugin(hook) {
    hook.doneEach(function() {
      scanAll();

      // Watch for dynamically added <pre> elements (Preact expand/collapse, etc.)
      var section = document.querySelector('.markdown-section');
      if (!section) return;
      var observer = new MutationObserver(function(mutations) {
        var needsScan = false;
        mutations.forEach(function(m) {
          m.addedNodes.forEach(function(node) {
            if (node.nodeType === 1 && (node.tagName === 'PRE' || node.querySelector && node.querySelector('pre'))) {
              needsScan = true;
            }
          });
        });
        if (needsScan) scanAll();
      });
      observer.observe(section, { childList: true, subtree: true });
    });
  }
]);
