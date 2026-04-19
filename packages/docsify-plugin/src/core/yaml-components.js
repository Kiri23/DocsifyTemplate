// yaml-components — public re-export + four ready-made transform maps.
//
// This is the composable API. Four consumers, same plugin:
//
//   import { yamlComponents } from './yaml-components.js';
//   import { preactTransforms, latexTransforms, typstTransforms, markdownTransforms } from './yaml-components.js';
//
//   unified().use(remarkParse).use(yamlComponents, { parseYaml, transforms: preactTransforms })
//   unified().use(remarkParse).use(yamlComponents, { parseYaml, transforms: latexTransforms })
//   unified().use(remarkParse).use(yamlComponents, { parseYaml, transforms: typstTransforms })
//   unified().use(remarkParse).use(yamlComponents, { parseYaml, transforms: markdownTransforms })

export { yamlComponents } from './markdown-transform.js';

import { exportFormats } from './export-renderers.js';
import { buildTransforms } from '../renderers/preact.js';

// HTML — mounts Preact components (interactive, browser)
// Lazy proxy: reflects registry state at call time
export const preactTransforms = buildTransforms();

// LaTeX/DATES — same YAML, outputs \commands
export const latexTransforms = exportFormats.latex;

// Typst — same YAML, outputs #functions
export const typstTransforms = exportFormats.typst;

// Markdown/LLM — same YAML, outputs readable markdown
export const markdownTransforms = exportFormats.markdown;
