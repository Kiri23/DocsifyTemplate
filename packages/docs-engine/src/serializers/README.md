# serializers/

Serializers convert structured YAML component data to text formats.

**They do not render anything.** They produce a string that a separate tool must process to produce visible output.

## Difference from renderers/

| | renderers/preact.js | serializers/* |
|---|---|---|
| Input | YAML data object | YAML data object |
| Output | DOM nodes (live UI) | Plain text string |
| Renders itself? | Yes — Preact mounts into the DOM | No — needs an external tool |
| External tool needed | None | LaTeX engine, Typst WASM, markdown parser |

## The two-step reality

```
YAML data
  ↓ serializer (this folder)
text string   ← what you have here
  ↓ external tool (NOT in this folder)
visible output
```

- `latex.js`    → `\commands`   → Pandoc WASM → PDF
- `typst.js`    → `#functions`  → Typst WASM  → PDF
- `markdown.js` → markdown text → Docsify/unified → HTML

## Usage

These are `transforms` maps — pass them directly to the `yamlComponents` unified plugin:

```js
import { yamlComponents } from '../core/markdown-transform.js';
import { latexRenderers } from './latex.js';

unified()
  .use(remarkParse)
  .use(yamlComponents, { parseYaml, transforms: latexRenderers })
  .process(markdown)
```

The plugin replaces YAML code fences with the serialized text. What happens after that is up to the consumer.
