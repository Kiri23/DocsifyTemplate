// Core public API — framework-agnostic, no DOM, no Docsify.
// For the Docsify adapter: import from './adapters/docsify/index.js'

export { yamlComponents, preactTransforms, latexTransforms, typstTransforms, markdownTransforms } from './core/yaml-components.js';
export { defaultComponents } from './components/index.js';
export { preactRenderer } from './renderers/preact.js';
export { register, registerAll, getComponent } from './core/registry.js';
