---
type: guide
category: core
tags: [configuration, reference, theme]
---

# Configuration

## Quick Start

DocsifyTemplate reads configuration from a global object you set before the framework loads. Add a `<script>` block in `docs/index.html` before any framework scripts:

```html
<script>
  window.__docsifyTemplateConfig = {
    title: 'My Docs',
    description: 'Internal API documentation',
    theme: {
      primary: '#7c3aed',
      brand: '#f59e0b',
    },
    features: {
      chat: { enabled: false },
      mermaid: { enabled: true },
    },
  };
</script>
```

You only need to specify the values you want to change. Everything else falls back to defaults. The config is deep-merged, so setting `theme.primary` does not erase the other theme colors.

### Reading config from your own code

```javascript
import { getConfig, isFeatureEnabled } from '/packages/docs-engine/src/core/config.js';

const config = getConfig();
console.log(config.title); // 'My Docs'

if (isFeatureEnabled('chat')) {
  // load the chat widget
}
```

`getConfig()` auto-initializes from `window.__docsifyTemplateConfig` on first call. You can also call `initConfig(obj)` explicitly if you need to set config before anything reads it.

### Applying theme colors as CSS

```javascript
import { getThemeCSS } from '/packages/docs-engine/src/core/config.js';

document.documentElement.style.cssText += getThemeCSS();
```

This generates CSS custom properties (`--color-primary`, `--color-brand`, etc.) from your theme config and applies them to `:root`.

---

## Technical Reference

### Config API

| Function | Signature | Description |
|---|---|---|
| `initConfig` | `initConfig(userConfig?: object): object` | Merges `userConfig` over defaults, validates, freezes, and returns the result. Call once at startup. |
| `getConfig` | `getConfig(): object` | Returns the frozen config. Auto-initializes from `window.__docsifyTemplateConfig` if `initConfig` was not called. |
| `isFeatureEnabled` | `isFeatureEnabled(path: string): boolean` | Checks if a feature is enabled. Accepts dot paths like `'chat'` or `'chat.tools.export'`. |
| `getThemeCSS` | `getThemeCSS(): string` | Returns a string of CSS custom property declarations from `config.theme`. |
| `getDocsifyConfig` | `getDocsifyConfig(): object` | Returns the Docsify config object (merges `config.title` as `name` with `config.docsify`). |
| `getPrismLanguages` | `getPrismLanguages(): string[]` | Returns the list of Prism languages from `config.prism.languages`. |
| `DEFAULTS` | Named export | The full default config object, exported for reference. |

### Config options

#### Site

| Key | Type | Default | Description |
|---|---|---|---|
| `title` | `string` | `'DocsifyTemplate'` | Site title. Must be a string. Also used as the Docsify `name`. |
| `description` | `string` | `''` | Site description. |
| `tagline` | `string` | `''` | Tagline displayed on the landing page. |

#### Theme

All theme values are hex color strings. Validation rejects anything that does not match `#` followed by 3–8 hex characters.

| Key | Default | CSS Variable | Purpose |
|---|---|---|---|
| `theme.primary` | `#0891b2` | `--color-primary` | Primary brand color |
| `theme.primaryLight` | `#ecfeff` | `--color-primary-light` | Light variant of primary |
| `theme.primaryText` | `#0e7490` | `--color-primary-text` | Text on primary backgrounds |
| `theme.brand` | `#95c22f` | `--color-brand` | Secondary brand color |
| `theme.surface` | `#faf9f7` | `--color-surface` | Default background |
| `theme.surfaceRaised` | `#f5f5f4` | `--color-surface-raised` | Elevated surface (cards) |
| `theme.surfaceSunken` | `#efedeb` | `--color-surface-sunken` | Recessed surface |
| `theme.border` | `#e7e5e4` | `--color-border` | Default border |
| `theme.borderStrong` | `#d6d3d1` | `--color-border-strong` | Emphasized border |
| `theme.textPrimary` | `#1c1917` | `--color-text-primary` | Body text |
| `theme.textSecondary` | `#44403c` | `--color-text-secondary` | Secondary text |
| `theme.textTertiary` | `#78716c` | `--color-text-tertiary` | Tertiary text |
| `theme.textMuted` | `#a8a29e` | `--color-text-muted` | Muted/disabled text |
| `theme.techSurface` | `#f8fafc` | `--color-tech-surface` | Technical section background |
| `theme.techAccent` | `#6366f1` | `--color-tech-accent` | Technical accent color |
| `theme.techHeading` | `#1e293b` | `--color-tech-heading` | Technical heading color |
| `theme.techSubheading` | `#334155` | `--color-tech-subheading` | Technical subheading color |
| `theme.techText` | `#475569` | `--color-tech-text` | Technical body text |
| `theme.codeBg` | `#1e1e2e` | `--color-code-bg` | Code block background |
| `theme.codeText` | `#cdd6f4` | `--color-code-text` | Code block text |
| `theme.success` | `#34d399` | `--color-success` | Success/positive color |

#### Docsify

Passed directly to Docsify’s `window.$docsify` (merged with `name` from `config.title`).

| Key | Type | Default | Description |
|---|---|---|---|
| `docsify.loadSidebar` | `boolean` | `true` | Load `_sidebar.md` for navigation |
| `docsify.subMaxLevel` | `number` | `3` | Max heading depth in sidebar |
| `docsify.auto2top` | `boolean` | `true` | Scroll to top on page change |
| `docsify.search.placeholder` | `string` | `'Search...'` | Search input placeholder |
| `docsify.search.noData` | `string` | `'No results.'` | Shown when search returns nothing |
| `docsify.search.depth` | `number` | `6` | Heading depth for search indexing |

#### Features

Each feature has an `enabled` boolean. Use `isFeatureEnabled('featureName')` to check at runtime.

##### chat

In-browser AI chat powered by Gemma 4 E2B via WebGPU.

| Key | Type | Default | Description |
|---|---|---|---|
| `features.chat.enabled` | `boolean` | `true` | Enable AI chat |
| `features.chat.model.id` | `string` | `'onnx-community/gemma-4-E2B-it-ONNX'` | ONNX model ID. Required when chat is enabled. |
| `features.chat.model.label` | `string` | `'Gemma 4 E2B'` | Display name |
| `features.chat.model.architecture` | `string` | `'gemma4'` | Model architecture |
| `features.chat.model.dtype` | `string` | `'q4f16'` | Quantization type |
| `features.chat.model.nativeToolCalling` | `boolean` | `true` | Enable native tool calling |
| `features.chat.model.maxNewTokens` | `number` | `1024` | Max tokens per response |
| `features.chat.tools.*` | `boolean` | `true` | Enable/disable individual chat tools: `export`, `navigate`, `switchTab`, `search`, `generateComponent`, `scrollToSection` |

##### export

PDF / LaTeX / Markdown export via Pandoc WASM.

| Key | Type | Default | Description |
|---|---|---|---|
| `features.export.enabled` | `boolean` | `true` | Enable export |
| `features.export.formats` | `string[]` | `['pdf', 'latex-branded', 'markdown']` | Available formats. Valid values: `pdf`, `latex-branded`, `markdown`. |
| `features.export.defaultFormat` | `string` | `'pdf'` | Pre-selected format in the UI |
| `features.export.exportAll` | `boolean` | `true` | Show "Export All" button |

##### tabs

Tabbed layout for Quick Start / Technical Reference splits.

| Key | Type | Default | Description |
|---|---|---|---|
| `features.tabs.enabled` | `boolean` | `true` | Enable tab splitting |
| `features.tabs.labels` | `object` | `{'quick-start': 'Quick Start', 'technical': 'Technical Reference'}` | Tab label text |
| `features.tabs.triggerType` | `string` | `'guide'` | Frontmatter `type` value that activates tabs |

##### Other features

| Key | Type | Default | Description |
|---|---|---|---|
| `features.copyButton.enabled` | `boolean` | `true` | Copy button on code blocks |
| `features.tutorialHeader.enabled` | `boolean` | `true` | Tutorial step indicator |
| `features.mermaid.enabled` | `boolean` | `true` | Mermaid diagram rendering |
| `features.mermaid.theme` | `string` | `'default'` | Mermaid theme |
| `features.mermaid.startOnLoad` | `boolean` | `false` | Whether Mermaid renders on load (framework handles rendering manually) |
| `features.devTools.enabled` | `boolean` | `false` | Eruda dev console (off by default) |

#### Components

Override default components with custom implementations. Keys are component names, values are paths to JS modules.

```javascript
window.__docsifyTemplateConfig = {
  components: {
    'card-grid': '/my-components/custom-card-grid.js',
  },
};
```

#### Sidebar

| Key | Type | Default | Description |
|---|---|---|---|
| `sidebar.items` | `array \| null` | `null` | Programmatic sidebar items. `null` means Docsify uses `_sidebar.md`. |

#### Prism

| Key | Type | Default | Description |
|---|---|---|---|
| `prism.languages` | `string[]` | `['javascript', 'json', 'yaml', 'bash', 'csharp', 'markdown']` | Syntax highlighting languages |

#### Head

| Key | Type | Default | Description |
|---|---|---|---|
| `head` | `array` | `[]` | Extra tags to inject into `<head>` |

### Validation

`initConfig` runs validation and logs errors to the console. It does not throw. Validation checks:

- `title` must be a string (if provided)
- All `theme.*` values must be valid hex colors (`#` + 3–8 hex characters)
- `features.chat.model.id` is required when chat is enabled
- `features.export.formats` entries must be one of: `pdf`, `latex-branded`, `markdown`

### Deep merge behavior

Config uses recursive deep merge. Objects are merged key-by-key. Arrays and primitives are replaced entirely.

```javascript
// Default
{ theme: { primary: '#0891b2', brand: '#95c22f' } }

// Your config
{ theme: { primary: '#7c3aed' } }

// Result
{ theme: { primary: '#7c3aed', brand: '#95c22f' } }
```

Arrays are not merged. If you set `features.export.formats: ['pdf']`, you get only `['pdf']`, not the defaults plus your value.

### Config lifecycle

1. You set `window.__docsifyTemplateConfig` in a `<script>` tag
2. First call to `getConfig()` (or explicit `initConfig()`) deep-merges your values over `DEFAULTS`
3. Validation runs and logs any errors
4. The merged config is frozen with `Object.freeze()` — no further mutations
5. All subsequent `getConfig()` calls return the same frozen object

