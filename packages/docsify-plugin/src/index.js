// Public API — assembles core + renderers + serializers. No DOM, no Docsify.
// For the Docsify adapter: import from './adapters/docsify/index.js'

export { yamlComponents } from './core/markdown-transform.js';
export { defaultComponents } from './components/index.js';
export { register, registerAll, getComponent } from './core/registry.js';

// Renderer — outputs to DOM (Preact)
export { preactRenderer, buildTransforms } from './renderers/preact.js';

// Serializers — output text strings (need external tool to render)
export { latexRenderers as latexTransforms } from './serializers/latex.js';
export { typstRenderers as typstTransforms } from './serializers/typst.js';
export { markdownRenderers as markdownTransforms } from './serializers/markdown.js';
