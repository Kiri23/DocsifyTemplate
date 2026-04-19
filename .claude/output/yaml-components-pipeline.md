---
title: YAML Components — unified pipeline diagram
date: 2026-04-19
branch: explore/unified-yaml-components
---

# YAML in Markdown → unified → output

The core insight: **YAML is the stable input. The AST is where you intervene. The output is whatever you want.**

## Pipeline

```
Markdown string
    ↓ remark-parse
MDAST (árbol)
    ├── heading
    ├── paragraph
    ├── code { lang: 'entity-schema', value: 'name: User\n...' }  ← YAML aquí
    └── paragraph

    ↓ yamlComponents plugin
    visits 'code' nodes
    parseYaml(node.value) → { name: 'User', fields: [...] }
    transforms['entity-schema'](data) → "<div id='rc-1'></div>"

MDAST modificado
    ├── heading
    ├── paragraph
    ├── html { value: "<div id='rc-1'></div>" }  ← reemplazado
    └── paragraph

    ↓ serializeToMarkdown → string
    ↓ Docsify renderiza el string a DOM
```

## Output is decided by the transforms map

```
transforms: preactTransforms   → "<div id='rc-1'></div>"   (placeholder, Preact hydrata después)
transforms: latexTransforms    → "\entitybegin{User}..."
transforms: typstTransforms    → "#entitybegin("User")..."
transforms: markdownTransforms → "### Entity: User\n| Field |..."
```

## Public API

```js
import { yamlComponents, preactTransforms, latexTransforms } from './core/yaml-components.js';

// HTML (browser, Preact)
unified().use(remarkParse).use(yamlComponents, { parseYaml, transforms: preactTransforms })

// LaTeX
unified().use(remarkParse).use(yamlComponents, { parseYaml, transforms: latexTransforms })

// Typst → PDF
unified().use(remarkParse).use(yamlComponents, { parseYaml, transforms: typstTransforms })

// Markdown / LLM
unified().use(remarkParse).use(yamlComponents, { parseYaml, transforms: markdownTransforms })
```

## Key files

- `packages/docsify-plugin/src/core/markdown-transform.js` — `yamlComponents` unified plugin
- `packages/docsify-plugin/src/core/yaml-components.js` — public re-export + 4 transform maps
- `packages/docsify-plugin/src/core/export-renderers.js` — latex/typst/markdown renderers
- `packages/docsify-plugin/src/renderers/preact.js` — `buildTransforms()` lazy Proxy
