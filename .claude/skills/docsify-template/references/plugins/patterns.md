# Plugins — Patterns

## Creating a New Docsify Plugin

Docsify plugins are functions that receive `hook` and `vm` parameters:

```javascript
window.$docsify = window.$docsify || {};
window.$docsify.plugins = (window.$docsify.plugins || []).concat([
  function myPlugin(hook, vm) {
    // hook.init()        — called once when Docsify starts
    // hook.beforeEach()  — receives raw markdown, returns modified markdown
    // hook.afterEach()   — receives rendered HTML, returns modified HTML
    // hook.doneEach()    — called after DOM update, no return
    // hook.mounted()     — called once after initial DOM load
    // hook.ready()       — called once when everything is ready

    hook.afterEach(function(html) {
      // Modify HTML
      return html + '<div>Added by my plugin</div>';
    });

    hook.doneEach(function() {
      // DOM manipulation
      document.querySelectorAll('.my-class').forEach(el => {
        // ...
      });
    });
  }
]);
```

### Alternative: Standalone plugin file

If the plugin is complex, keep it in its own file and register in the plugins array:

```javascript
// plugins/my-plugin.js
function myPlugin(hook, vm) {
  hook.doneEach(function() {
    // ...
  });
}

// In index.html, add to plugins array:
// plugins: [componentRenderer, myPlugin]
```

## Extending the Component Pipeline

### Adding post-render processing

If you need to process rendered component HTML (e.g., add event listeners, modify DOM):

```javascript
hook.doneEach(function() {
  // Runs AFTER component-renderer's doneEach
  // All components are already in the DOM
  document.querySelectorAll('.my-component').forEach(el => {
    el.addEventListener('click', handleClick);
  });
});
```

**Important:** Plugin order in the `plugins` array determines execution order. Add yours after component-renderer.

### Adding a new content transformation

If you want to transform markdown before component rendering:

```javascript
hook.beforeEach(function(content) {
  // Runs BEFORE component-renderer's beforeEach
  // Transform raw markdown
  return content.replace(/:::note\n([\s\S]*?)\n:::/g, '<div class="note">$1</div>');
});
```

## Integrating with Tab Switching

If your plugin creates content that needs to re-initialize after tab switches, hook into the htmx-virtual flow:

```javascript
// Listen for HTMX swap events
document.body.addEventListener('htmx:afterSwap', function(evt) {
  if (evt.detail.target.id === 'tab-content') {
    // Re-initialize your plugin's DOM elements
    myPlugin.reinitialize();
  }
});
```

## Copy Button Pattern (from built-in plugin)

The copy button is a good example of a doneEach plugin:

```javascript
hook.doneEach(function() {
  document.querySelectorAll('pre:not(.processed)').forEach(pre => {
    // Skip special blocks
    if (pre.querySelector('.mermaid')) return;

    const btn = document.createElement('button');
    btn.className = 'code-copy-btn';
    btn.textContent = 'Copy';
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(pre.textContent);
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = 'Copy', 2000);
    });

    pre.style.position = 'relative';
    pre.appendChild(btn);
    pre.classList.add('processed');
  });
});
```

Key pattern: mark processed elements to avoid duplicate processing on re-renders.

## Scroll-Reveal Pattern

The scroll-reveal in component-renderer's doneEach is a good animation pattern:

1. Wrap sections in `.scroll-reveal` containers
2. Start with `opacity: 0; transform: translateY(16px)`
3. Use `IntersectionObserver` to add `.is-visible` class
4. CSS transition handles the animation
5. Check `prefers-reduced-motion` before animating

## See Also

- `references/plugins/api.md` — hook details and global variables
- `references/plugins/gotchas.md` — timing and ordering issues
