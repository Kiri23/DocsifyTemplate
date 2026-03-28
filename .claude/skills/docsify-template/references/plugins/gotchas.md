# Plugins — Gotchas

## Hook Execution Order Matters

Hooks run in the order plugins are registered in the `plugins` array. If your plugin needs components to be rendered first, add it AFTER component-renderer.

```javascript
plugins: [
  componentRenderer,  // Must be first — renders components
  myPlugin,           // Can now query rendered component DOM
]
```

## Mermaid Timing Issues

Mermaid renders in `doneEach`, which runs after DOM update. If mermaid diagrams appear as raw text:

**Cause 1:** Mermaid CDN hasn't loaded yet. Check network tab.

**Cause 2:** Mermaid `.run()` is called before the elements are in DOM. Ensure it's called AFTER `innerHTML` is set, not before.

**Cause 3:** After tab switch, mermaid needs to re-render. `htmx-virtual.js` handles this, but if you modify the tab switching logic, ensure `mermaid.run()` is called after content swap.

## doneEach Runs on EVERY Navigation

`doneEach` fires every time Docsify loads a new page. If you add event listeners or create DOM elements, you'll get duplicates.

```javascript
// Wrong — duplicates on every navigation
hook.doneEach(function() {
  document.body.appendChild(createButton());
});

// Right — check first, or use mounted() for one-time setup
hook.doneEach(function() {
  if (!document.getElementById('my-button')) {
    document.body.appendChild(createButton());
  }
});
```

## beforeEach Returns Markdown, afterEach Returns HTML

Don't try to parse HTML in beforeEach or inject markdown in afterEach.

```javascript
// Wrong — HTML in beforeEach (markdown context)
hook.beforeEach(function(content) {
  return content + '<div class="footer">Footer</div>';  // Won't be processed by markdown parser correctly
});

// Right — markdown in beforeEach
hook.beforeEach(function(content) {
  return content + '\n\n---\n*Footer*';
});
```

## HTMX configRequest vs afterSwap

For intercepting tab switches:
- `htmx:configRequest` — fires BEFORE the swap (cancel here to prevent)
- `htmx:afterSwap` — fires AFTER content is in the DOM (initialize here)

If you need to do DOM work after a tab switch, use `afterSwap`, not `configRequest`.

## Prism.highlightAll() is Expensive

Called on every page load and tab switch. If you're adding code blocks dynamically, prefer `Prism.highlightElement(element)` for targeted highlighting instead of `highlightAll()`.

## window.__pageSections Resets Per Page

`window.__pageSections` is set during `afterEach` and cleared/reset on every page navigation. Don't cache references to it across navigations.

## LaTeX Export: WASM Load Failure

If the pandoc.wasm file is an LFS pointer (not the actual binary), the WASM module will fail to load. Symptoms:
- Button appears but nothing happens on click
- Console error: `CompileError: WebAssembly.instantiate()`
- Fix: download the actual binary (see `references/plugins/configuration.md`)

## Region Directives Must Be in DOM

`processRegionDirectives()` operates on the live DOM, not on HTML strings. It must run in `doneEach` (after DOM update), not in `afterEach` (which works with HTML strings).

## Plugin File Missing from index.html

If a plugin file isn't loaded via `<script>` tag, it silently doesn't exist. No error — the hooks just don't fire. Check the Network tab if a plugin isn't working.

## Limits

| Item | Limit | Why |
|------|-------|-----|
| Plugins in array | No hard limit | But each adds latency to page render |
| doneEach processing time | Keep < 100ms | Blocks visible page render |
| WASM file size | ~56MB | One-time lazy load, but slow on first click |
| Tab sections | 2 (Quick Start + Technical) | Hardcoded in component-renderer split logic |

## See Also

- `references/plugins/api.md` — hook signatures and timing
- `references/components/gotchas.md` — component-level rendering issues
