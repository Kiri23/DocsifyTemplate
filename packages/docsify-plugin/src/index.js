// Public API — assembles core + renderers. No DOM, no Docsify.
// For the Docsify adapter: import from './adapters/docsify/index.js'

export { yamlComponents } from './core/markdown-transform.js';
export { defaultComponents } from './components/index.js';
export { register, registerAll, getComponent } from './core/registry.js';

// Renderer-specific transform maps — same YAML, different outputs
export { preactRenderer, buildTransforms } from './renderers/preact.js';
export { latexRenderers as latexTransforms } from './renderers/latex.js';
export { typstRenderers as typstTransforms } from './renderers/typst.js';
export { markdownRenderers as markdownTransforms } from './renderers/markdown.js';
