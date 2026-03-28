# Styling — API

All CSS custom properties defined in `:root` of `docs/styles/theme.css`.

## Surface Colors

| Variable | Value | Usage |
|----------|-------|-------|
| `--surface-page` | #faf9f7 | Main background (warm off-white) |
| `--surface-raised` | #f5f5f4 | Cards, elevated elements |
| `--surface-sunken` | #efedeb | Inset areas, wells |

## Border Colors

| Variable | Value | Usage |
|----------|-------|-------|
| `--border-subtle` | #e7e5e4 | Light dividers |
| `--border-default` | #d6d3d1 | Standard borders |

## Text Colors (Warm Zone)

| Variable | Value | Usage |
|----------|-------|-------|
| `--text-primary` | #1c1917 | Headings, main text |
| `--text-secondary` | #44403c | Subheadings, body |
| `--text-tertiary` | #78716c | Captions, labels |
| `--text-muted` | #a8a29e | Placeholders, disabled |

## Accent Colors

| Variable | Value | Usage |
|----------|-------|-------|
| `--accent` | #0891b2 | Links, buttons, highlights |
| `--accent-light` | #ecfeff | Accent backgrounds |
| `--accent-text` | #0e7490 | Accent on light bg |
| `--accent-rgb` | 8 145 178 | For alpha: `rgb(var(--accent-rgb) / 0.3)` |

## Tech Zone Colors (Technical Reference)

| Variable | Value | Usage |
|----------|-------|-------|
| `--tech-surface` | #f8fafc | Cool background |
| `--tech-accent` | #6366f1 | Indigo left border, highlights |
| `--tech-heading` | #1e293b | Dark slate headings |
| `--tech-subheading` | #334155 | Medium slate subheads |
| `--tech-text` | #475569 | Body text in tech zone |

## Code Colors

| Variable | Value | Usage |
|----------|-------|-------|
| `--code-bg` | #1e1e2e | Code block background |
| `--code-overlay-rgb` | 255 255 255 | For overlays on code |

## Status Colors

| Variable | Value | Usage |
|----------|-------|-------|
| `--success` | #34d399 | Success indicators |
| `--success-rgb` | 52 211 153 | For alpha variants |

## Typography Stacks

```css
/* Prose (body text, headings) */
font-family: 'Newsreader', Georgia, 'Times New Roman', serif;

/* UI (buttons, labels, navigation) */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;

/* Mono (code, technical values) */
font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'JetBrains Mono', ui-monospace, monospace;
```

## Typography Scale

| Element | Size | Weight | Line-height |
|---------|------|--------|-------------|
| h1 | 2.25rem | 800 | 1.15 |
| h2 | 1.5rem | 700 | varies |
| h3 | 1.2rem | 600 | varies |
| body | 1.05rem | normal | 1.8 |

## Spacing

| Context | Value |
|---------|-------|
| Content padding (desktop) | 2.5rem 3rem |
| Content padding (tablet ≤768px) | 1.5rem 1.25rem |
| Content padding (mobile ≤480px) | 1.25rem 1rem |
| Component margin | my-5 (1.25rem) |
| Card grid gap | gap-5 (1.25rem) |
| Badge padding | px-2.5 py-0.5 |

## Border Radius Scale

| Context | Value | Tailwind |
|---------|-------|----------|
| Container | 0.75rem | rounded-xl |
| Inner card | 0.5rem | rounded-lg |
| Badge | 0.375rem | rounded-md |
| Inline code | 0.3rem | — |

## Transitions

```css
--ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
/* Used for scroll-reveal animations */
/* Duration: 0.6s for reveals, 0.2s for hovers */
```

## Alpha Variant Pattern

Never use raw `rgba()`. Always use the `-rgb` token:

```css
/* Wrong */
rgba(8, 145, 178, 0.3)

/* Right */
rgb(var(--accent-rgb) / 0.3)
```

## See Also

- `.interface-design/system.md` — full design spec with rationale
- `references/styling/patterns.md` — how to apply these tokens
