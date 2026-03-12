# DocsifyTemplate Design System

## Intent
A documentation site serving two audiences: developers (precise reference) and non-technical stakeholders (approachable guides). Reading experience — warm and trustworthy, not sterile.

## Palette

### Foundation — Warm Stone
| Token | Value | Usage |
|---|---|---|
| `--surface-page` | `#faf9f7` | Page background |
| `--surface-raised` | `#f5f5f4` | Table headers, code bg, card surfaces |
| `--surface-sunken` | `#efedeb` | Inset areas |
| `--border-subtle` | `#e7e5e4` | Most borders |
| `--border-default` | `#d6d3d1` | Stronger borders (inputs, dividers) |
| `--text-primary` | `#1c1917` | Headings |
| `--text-secondary` | `#44403c` | Body text |
| `--text-tertiary` | `#78716c` | Supporting text |
| `--text-muted` | `#a8a29e` | Sidebar categories, timestamps |

### Accent — Cyan
| Token | Value | Usage |
|---|---|---|
| `--accent` | `#0891b2` | Links, active tabs, primary actions |
| `--accent-light` | `#ecfeff` | Blockquote bg, active tab tint |
| `--accent-text` | `#0e7490` | Inline code text |

### Tailwind Theme Tokens
Defined in `index.html` `@theme` block: `primary`, `primary-light`, `surface`, `surface-raised`, `border`, `border-strong`, `text-primary`, `text-secondary`, `text-muted`.

## Depth
- **Borders over shadows.** Subtle 1px warm borders (`border-subtle`) for structure.
- **Shadows only on hover** for interactive cards: `shadow-[0_2px_12px_rgba(8,145,178,0.08)]`.
- **Technical components** use `shadow-md` as ambient depth on dark containers.

## Surfaces

### Two temperature zones
1. **Getting Started / warm zone:** Cream backgrounds (`bg-surface`), warm borders, stone text.
2. **Technical Reference / dark zone:** `bg-gray-900` containers, `border-gray-700/60` (softened), `text-cyan-300` for code identifiers.

### Component container pattern (dark)
```
rounded-xl overflow-hidden border border-gray-700/60 bg-gray-900 my-5 shadow-md
```

### Header bar pattern (dark)
```
bg-gray-800/80 px-4 py-3 border-b border-gray-700/60
```

## Typography
- **Font:** System stack (via Docsify). Monospace: `'SF Mono', 'Cascadia Code', 'Fira Code', 'JetBrains Mono', ui-monospace, monospace`.
- **Body line-height:** 1.75 (generous for reading).
- **h1:** `font-weight: 800`, `letter-spacing: -0.02em`, `2rem`, bottom border.
- **h2:** `font-weight: 700`, `letter-spacing: -0.01em`, `1.375rem`.
- **h3:** `font-weight: 600`, `1.125rem`.

## Spacing
- Base unit: 4px (Tailwind default).
- Content max-width: `960px`.
- Content padding: `2.5rem 3rem`.
- Component vertical margin: `my-5` (1.25rem).
- Card grid gap: `gap-5`.

## Component Patterns

### Tabs (signature element)
- Rounded-top with `rounded-t-lg`.
- Active: `border-b-[3px] border-primary text-primary bg-primary-light/60`.
- Inactive: `text-text-muted hover:text-text-secondary hover:bg-surface-raised`.
- Font: `font-semibold tracking-wide`.

### Card Grid (warm)
- Surface: `bg-surface rounded-xl border border-border`.
- Hover: `border-primary/40` + cyan shadow.
- Icons: monospace font, `color: #0891b2`, `opacity-70 → 100` on hover.

### Badges
- Type badges: `bg-gray-700 text-gray-300 rounded-md font-mono`.
- Required: `bg-rose-500/20 text-rose-300 rounded-md`.
- Sync: `bg-emerald-500/20 text-emerald-300 border border-emerald-500/30`.
- Async: `bg-blue-500/20 text-blue-300 border border-blue-500/30`.
- API methods: `rounded-md font-mono tracking-wide` — GET blue, POST emerald, PUT amber, PATCH orange, DELETE rose.

### Uppercase labels
- `text-xs font-semibold uppercase tracking-wider text-gray-500`.

### Inline code
- `bg-surface-raised text-accent-text border border-border-subtle rounded-[0.3rem]`.

### Blockquotes
- `border-left: 3px solid accent`, `bg-accent-light`, `rounded: 0 0.5rem 0.5rem 0`.

## Color substitutions from defaults
| Default | Replaced with | Why |
|---|---|---|
| Pure gray body text | Stone-700 (`#44403c`) | Warmer reading experience |
| `bg-red-500/80` required | `bg-rose-500/20 text-rose-300` | Less alarming, still visible |
| `text-cyan-400` field names | `text-cyan-300` | Better contrast on dark bg |
| `bg-yellow-500` state | `bg-amber-500` | Warmer, less harsh |
| `bg-green-500` POST | `bg-emerald-500` | Warmer green |
| `shadow-lg` on dark components | `shadow-md` | Less aggressive |
| `border-gray-700` hard | `border-gray-700/60` | Softer edges |
