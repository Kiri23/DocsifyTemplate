// Component Registry + Preact Bridge
// ES module. The public API for the engine.
//
// Consumers register components:
//   import { register } from '@docsify-template/core/registry.js';
//   register('entity-schema', EntitySchemaComponent);
//
// Adapters use the bridge:
//   import { bridge } from '@docsify-template/core/registry.js';
//   bridge.createPlaceholder('EntitySchema', data);
//
// Two render modes:
//   'interactive' — placeholder divs, mount Preact with full hooks (Docsify)
//   'string'      — renderToString(), returns static HTML (Astro, Kiri)

import { toCamelCase } from './markdown-utils.js';

// --- Internal registry (not exported directly) ---
const _components = {};

// Backwards compat: non-module consumers (Kiri SW, browser console)
if (typeof window !== 'undefined') window.PreactComponents = _components;

// --- Public registration API ---

export function register(fenceName, component) {
  const key = toCamelCase(fenceName);
  if (_components[key]) {
    console.warn(`[registry] Overwriting component: ${key} (fence: ${fenceName})`);
  }
  _components[key] = component;
}

export function registerAll(map) {
  Object.entries(map).forEach(([fenceName, component]) => register(fenceName, component));
}

export function getComponent(name) {
  return _components[name] || _components[toCamelCase(name)];
}

export function getRegisteredNames() {
  return Object.keys(_components);
}

// --- Bridge state ---
let pendingMounts = [];
let mountCounter = 0;
let activeRoots = [];
let _renderMode = 'interactive';
let _renderToStringSync = null;
let _afterMountCallbacks = [];

function flushMounts() {
  import('preact').then(({ h, render }) => {
    activeRoots.forEach(info => {
      try { render(null, info.el); } catch(e) {}
    });
    activeRoots = [];

    pendingMounts.forEach(mount => {
      const el = document.getElementById(mount.id);
      const Component = _components[mount.component];
      if (!el) return;
      if (!Component) {
        console.warn('[bridge] Component not found:', mount.component);
        return;
      }
      try {
        render(h(Component, { data: mount.data }), el);
        activeRoots.push({ el });
      } catch(e) {
        console.error('[bridge] Error mounting', mount.component, e);
        el.innerHTML = '<div style="color:#f87171;padding:1rem;border:1px solid #f87171;border-radius:0.5rem">' +
          '<strong>Component Error:</strong> ' + mount.component + '<br>' +
          '<code>' + e.message + '</code></div>';
      }
    });
    pendingMounts = [];

    // After-mount callbacks. Preact render() is synchronous, so the DOM is ready here.
    // NOTE: components with collapsed sections (useState(false)) won't have their
    // hidden content in the DOM yet — use MutationObserver for dynamically revealed content.
    _afterMountCallbacks.forEach(fn => { try { fn(); } catch(e) { console.error('[bridge] afterMount error:', e); } });
  });
}

// --- Bridge API (imported by adapters) ---
export const bridge = {
  get mode() { return _renderMode; },
  set mode(m) { _renderMode = m; },

  // Interactive mode (Docsify)
  createPlaceholder(componentName, data) {
    const id = 'rc-' + (++mountCounter);
    pendingMounts.push({ id, component: componentName, data });
    return '<div id="' + id + '" data-preact-component="' + componentName + '"></div>';
  },

  mountAll() {
    import('preact').then(({ render }) => {
      activeRoots.forEach(info => {
        try { render(null, info.el); } catch(e) {}
      });
      activeRoots = [];
    });
    flushMounts();
  },

  // String mode (Astro, Kiri)
  renderToString(componentName, data) {
    const Component = _components[componentName];
    if (!Component) return Promise.resolve('<!-- component not found: ' + componentName + ' -->');
    return Promise.all([
      import('preact'),
      import('preact-render-to-string')
    ]).then(([{ h }, rtsModule]) => {
      const rts = rtsModule.renderToString || rtsModule.default;
      return rts(h(Component, { data }));
    });
  },

  get renderToStringSync() { return _renderToStringSync; },

  has(name) {
    return typeof _components[name] === 'function';
  },

  onAfterMount(fn) {
    _afterMountCallbacks.push(fn);
  }
};

// Pre-cache renderToString for sync access
Promise.all([
  import('preact'),
  import('preact-render-to-string')
]).then(([{ h }, rtsModule]) => {
  const rts = rtsModule.renderToString || rtsModule.default;
  _renderToStringSync = function(componentName, data) {
    const Component = _components[componentName];
    if (!Component) return '<!-- component not found: ' + componentName + ' -->';
    try {
      return rts(h(Component, { data }));
    } catch(e) {
      console.error('[bridge] renderToString error:', componentName, e);
      return '<!-- render error: ' + componentName + ' -->';
    }
  };
  console.log('[bridge] renderToString ready');
});
