// Component Registry — framework-agnostic.
// Stores a map of fence-name → component function.
// Has zero knowledge of how components are rendered (Preact, React, strings, etc.)

import { toCamelCase } from './markdown-utils.js';

const _components = {};

// Backwards compat: non-module consumers (browser console)
if (typeof window !== 'undefined') window.PreactComponents = _components;

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
