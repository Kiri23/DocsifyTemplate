# Styling — Configuration

## Where Styles Are Defined

### 1. `docs/styles/theme.css` — Primary stylesheet

- `:root` block: all CSS custom properties (colors, transitions)
- Docsify overrides: sidebar, markdown-section, headings, links, tables, code
- Component classes: `.code-copy-btn`, `.tab-btn`, `.tab-bar`, `.tab-zone-*`
- Animations: `.scroll-reveal`, `.is-visible`
- Print styles: `@media print`
- Responsive: `@media (max-width: 768px)` and `@media (max-width: 480px)`

### 2. `docs/index.html` — Tailwind theme

```html
<style type="text/tailwindcss">
  @theme {
    --color-primary: #0891b2;
    --color-brand: #secondary-color;
  }
</style>
```

This configures Tailwind's color system. Must stay in sync with `:root` in theme.css.

### 3. Component JS files — Inline Tailwind classes

Components use Tailwind utility classes directly in template literals:
```javascript
return `<div class="rounded-xl bg-gray-900 border border-gray-700/60">...</div>`;
```

Dark component styling is Tailwind-based, not CSS variable-based.

## Tailwind CSS v4 (Browser)

Using the browser build — no build step, no PostCSS, no config file. The `<script>` tag in index.html loads the Tailwind runtime which processes `class="..."` attributes on the fly.

Supports: all standard utilities, `@theme` for custom colors, `@apply` in style tags.

Does NOT support: `@config`, `tailwind.config.js`, JIT arbitrary values with brackets (limited).

## Adding New CSS Variables

1. Add to `:root` in `docs/styles/theme.css`
2. If it's a color that needs alpha variants, also add an `-rgb` version:
   ```css
   --my-color: #hex;
   --my-color-rgb: R G B;  /* space-separated, no commas */
   ```
3. Use in CSS: `color: var(--my-color)` or `background: rgb(var(--my-color-rgb) / 0.5)`
4. If it's a brand color, also update `@theme` in index.html

## Docsify Theme Overrides

theme.css overrides Docsify's default styling. Key selectors:

```css
.sidebar { /* Navigation panel */ }
.markdown-section { /* Main content area */ }
.markdown-section h1, h2, h3 { /* Heading styles */ }
.markdown-section a { /* Link styles */ }
.markdown-section table { /* Table styles */ }
.markdown-section code { /* Inline code */ }
.markdown-section pre { /* Code blocks */ }
```

These use `!important` where needed to override Docsify defaults.

## See Also

- `references/styling/api.md` — complete variable reference
- `references/styling/patterns.md` — rebranding workflow
