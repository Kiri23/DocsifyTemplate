# Styling — Gotchas

## Hardcoded Hex Values Outside `:root`

The #1 rule violation. Every color MUST come from a CSS variable.

```css
/* Wrong */
.my-element {
  color: #0891b2;
  background: rgba(8, 145, 178, 0.3);
}

/* Right */
.my-element {
  color: var(--accent);
  background: rgb(var(--accent-rgb) / 0.3);
}
```

**Check:** Search theme.css for hex values — they should ONLY appear inside `:root`.

## Tailwind Classes in Components Are NOT Themeable

Dark component styling uses Tailwind grays directly:
```html
<div class="bg-gray-900 border-gray-700/60">
```

These won't change when you rebrand `:root`. This is intentional — dark components stay dark regardless of brand color. If you need a themed component, use CSS variables instead of Tailwind color utilities.

## `:root` vs Tailwind `@theme` Sync

The `:root` block in theme.css and the `@theme` block in index.html define overlapping color spaces. They MUST stay in sync when rebranding:

```css
/* theme.css */
:root {
  --accent: #0891b2;
}

/* index.html */
@theme {
  --color-primary: #0891b2;  /* Must match */
}
```

If they diverge, CSS-variable-based styles and Tailwind-class-based styles will use different colors.

## z-index Conflicts

The LaTeX export bar, copy buttons, and Docsify sidebar all compete for z-index space. Current stack:

| Element | z-index | Notes |
|---------|---------|-------|
| Docsify sidebar | 20+ | Managed by Docsify |
| `.latex-export-bar` | 10 | Floating bottom bar |
| `.code-copy-btn` | 1 | Relative to `<pre>` |

Don't set z-index above 20 or you'll fight with the sidebar.

## Docsify Overrides Need `!important`

Docsify injects its own styles with medium specificity. To override reliably:

```css
/* May not work */
.markdown-section h1 {
  color: var(--text-primary);
}

/* Works */
.markdown-section h1 {
  color: var(--text-primary) !important;
}
```

Use `!important` sparingly but accept it's necessary for Docsify overrides.

## Mobile Sidebar Overlap

On mobile, Docsify's sidebar overlays content. If you add fixed/sticky elements, they may be hidden behind the sidebar. Test on mobile-width viewports.

## Font Loading Flash

Newsreader is loaded via Google Fonts CDN. On slow connections, there's a flash of fallback font (Georgia). The `font-display: swap` behavior is controlled by the CDN link. No local fix — accept the flash or self-host the font.

## Scroll-Reveal + Tab Switch

When switching tabs, new content starts hidden (opacity 0). The `IntersectionObserver` fires immediately for visible elements, but there can be a brief flash. The current code handles this by running reveal setup in the htmx afterSwap handler.

## Print Styles Hide Interactive Elements

The `@media print` block hides sidebar, tabs, copy buttons, and export bar. If users print from a specific tab, only that tab's content prints. There's no "print all tabs" option.

## Limits

| Item | Guidance |
|------|----------|
| CSS variables in `:root` | Keep under 50 — too many becomes unmaintainable |
| `!important` usage | Only for Docsify overrides, document why |
| Custom animations | Use `--ease-out-quart` and `prefers-reduced-motion` |
| Font weight range | 400-800 (Newsreader supports it) |

## See Also

- `references/styling/api.md` — complete variable reference
- `references/styling/configuration.md` — where styles are defined
