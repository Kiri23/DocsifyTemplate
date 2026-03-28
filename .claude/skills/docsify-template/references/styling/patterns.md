# Styling — Patterns

## Rebranding Checklist

To rebrand the entire site (different project, different colors):

### Step 1: Edit `:root` in `docs/styles/theme.css`

Change the accent/primary colors:
```css
:root {
  --accent: #new-color;
  --accent-light: #lightest-variant;
  --accent-text: #darker-variant;
  --accent-rgb: R G B;  /* For alpha */
}
```

### Step 2: Update Tailwind `@theme` in `docs/index.html`

```html
<style type="text/tailwindcss">
  @theme {
    --color-primary: #new-color;
  }
</style>
```

### Step 3: Optionally change surface/text colors

For a different "temperature" (cool vs warm):
- Change `--surface-page`, `--surface-raised`, `--surface-sunken`
- Change `--text-primary` through `--text-muted`
- Change `--border-subtle`, `--border-default`

### Step 4: Verify

- Check sidebar highlight color
- Check link colors
- Check tab active borders
- Check code block styling (usually unchanged)
- Check dark components (usually unchanged — Tailwind gray scale)

## Responsive Patterns

### Mobile breakpoints

```css
/* Tablet */
@media (max-width: 768px) {
  .markdown-section {
    padding: 1.5rem 1.25rem;
  }
}

/* Mobile */
@media (max-width: 480px) {
  .markdown-section {
    padding: 1.25rem 1rem;
  }
}
```

### Mobile-specific component adjustments

Components use Tailwind responsive utilities where needed:
```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
```

### Copy button visibility

```css
/* Desktop: show on hover */
.code-copy-btn { opacity: 0; }
pre:hover .code-copy-btn { opacity: 1; }

/* Mobile: always visible */
@media (max-width: 768px) {
  .code-copy-btn { opacity: 0.7; }
}
```

## Print Styles

```css
@media print {
  .sidebar, .tab-bar, .code-copy-btn, .latex-export-bar {
    display: none !important;
  }
  .markdown-section {
    max-width: 100%;
    padding: 0;
  }
}
```

## Scroll-Reveal Animation

CSS setup:
```css
.scroll-reveal {
  opacity: 0;
  transform: translateY(16px);
  transition: opacity 0.6s var(--ease-out-quart),
              transform 0.6s var(--ease-out-quart);
}

.scroll-reveal.is-visible {
  opacity: 1;
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  .scroll-reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
```

## Tab Zone Styling

```css
/* Quick Start tab — warm zone accent */
.tab-zone-quick-start {
  border-left: 3px solid var(--accent);
  /* warm background inherits from page */
}

/* Technical Reference tab — cool zone */
.tab-zone-technical {
  border-left: 3px solid var(--tech-accent);
  background: var(--tech-surface);
}
```

## Adding a New Color Token

1. Choose a semantic name (not the color itself): `--warning`, not `--orange`
2. Add hex value to `:root` in theme.css
3. Add `-rgb` variant if alpha will be needed
4. Document in `.interface-design/system.md`
5. Use via `var(--warning)` or `rgb(var(--warning-rgb) / 0.5)`

## See Also

- `references/styling/api.md` — all current tokens
- `references/styling/gotchas.md` — common visual bugs
