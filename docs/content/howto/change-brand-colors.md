# How to change brand colors

This guide shows you how to replace the default brand colors with your own.

## Prerequisites

- A running DocsifyTemplate project

## Steps

### Option A: Use the config module

Set theme colors in your `docs/config.js` config object:

```html
<script>
  window.__docsifyTemplateConfig = {
    theme: {
      primary: '#7c3aed',
      primaryLight: '#ede9fe',
      primaryText: '#6d28d9',
      brand: '#f59e0b',
    },
  };
</script>
```

Then apply the generated CSS variables:

```javascript
import { getThemeCSS } from '/packages/docsify-plugin/src/core/config.js';
document.documentElement.style.cssText += getThemeCSS();
```

This sets all `--color-*` custom properties from your config. See [Configuration](/content/guide/configuration) for every available theme key.

### Option B: Edit CSS directly

#### 1. Update the Tailwind theme

Open `docs/index.html` and find the `<style type="text/tailwindcss">` block. Change the color values:

```html
<style type="text/tailwindcss">
  @theme {
    --color-primary: #your-primary-color;
    --color-brand: #your-brand-color;
  }
</style>
```

### 2. Update the Docsify theme

Open `lib/styles/theme.css` and change `--theme-color` in `:root`:

```css
:root {
  --theme-color: #your-primary-color;
}
```

Use the same value as `--color-primary` from step 1.

### 3. Update any additional CSS variables

If your project uses other color variables in `lib/styles/theme.css`, update those too. Check `:root` for all available variables.

## Verification

Refresh the browser. Sidebar links, active states, and component accents now reflect your new colors.

## See also

- [Components Reference](/content/guide/components-reference) — component styling details
- [Architecture](/content/guide/architecture) — how the theme system works
