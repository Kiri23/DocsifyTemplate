// Preact renderer — one implementation of the renderer interface.
//
// Renderer interface:
//   createPlaceholder(name, data) → string   insert a div, queue for mount
//   mountAll()                    → void     flush pending mounts into DOM
//   renderToString(name, data)    → Promise<string>
//
// Swap this file for a React, Lit, or string renderer — nothing else changes.

import { getComponent } from '../core/registry.js';

let pendingMounts = [];
let mountCounter = 0;
let activeRoots = [];
let _renderToStringSync = null;

function flushMounts() {
  import('preact').then(({ h, render }) => {
    activeRoots.forEach(info => {
      try { render(null, info.el); } catch(e) {}
    });
    activeRoots = [];

    pendingMounts.forEach(mount => {
      const el = document.getElementById(mount.id);
      const Component = getComponent(mount.component);
      if (!el) return;
      if (!Component) {
        console.warn('[preact-renderer] Component not found:', mount.component);
        return;
      }
      try {
        render(h(Component, { data: mount.data }), el);
        activeRoots.push({ el });
      } catch(e) {
        console.error('[preact-renderer] Error mounting', mount.component, e);
        el.innerHTML = '<div style="color:#f87171;padding:1rem;border:1px solid #f87171;border-radius:0.5rem">' +
          '<strong>Component Error:</strong> ' + mount.component + '<br>' +
          '<code>' + e.message + '</code></div>';
      }
    });
    pendingMounts = [];
  });
}

export const preactRenderer = {
  // Returns an HTML placeholder div — Preact mounts into it later in mountAll()
  createPlaceholder(componentName, data) {
    const id = 'rc-' + (++mountCounter);
    pendingMounts.push({ id, component: componentName, data });
    return '<div id="' + id + '" data-component="' + componentName + '"></div>';
  },

  // Flush all pending mounts into the DOM
  mountAll() {
    import('preact').then(({ render }) => {
      activeRoots.forEach(info => {
        try { render(null, info.el); } catch(e) {}
      });
      activeRoots = [];
    });
    flushMounts();
  },

  renderToString(componentName, data) {
    const Component = getComponent(componentName);
    if (!Component) return Promise.resolve('<!-- component not found: ' + componentName + ' -->');
    return Promise.all([
      import('preact'),
      import('preact-render-to-string')
    ]).then(([{ h }, rtsModule]) => {
      const rts = rtsModule.renderToString || rtsModule.default;
      return rts(h(Component, { data }));
    });
  },

  // Sync version pre-cached at startup (used by string render mode)
  get renderToStringSync() { return _renderToStringSync; },
};

// Pre-cache renderToStringSync
Promise.all([
  import('preact'),
  import('preact-render-to-string')
]).then(([{ h }, rtsModule]) => {
  const rts = rtsModule.renderToString || rtsModule.default;
  _renderToStringSync = function(componentName, data) {
    const Component = getComponent(componentName);
    if (!Component) return '<!-- component not found: ' + componentName + ' -->';
    try {
      return rts(h(Component, { data }));
    } catch(e) {
      console.error('[preact-renderer] renderToString error:', componentName, e);
      return '<!-- render error: ' + componentName + ' -->';
    }
  };
});
