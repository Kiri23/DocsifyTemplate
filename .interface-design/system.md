# DocsifyTemplate Design System

## Intent
A documentation site serving two audiences: developers (precise reference) and non-technical stakeholders (approachable guides). Reading experience — warm and trustworthy, not sterile. Editorial typography with Newsreader serif for prose warmth.

## Palette

### Foundation — Warm Stone
| Token | Value | Usage |
|---|---|---|
| `--surface-page` | `#faf9f7` | Page background |
| `--surface-raised` | `#f5f5f4` | Table headers, code bg, card surfaces |
| `--surface-sunken` | `#efedeb` | Inset areas, inactive hover |
| `--border-subtle` | `#e7e5e4` | Most borders (60+ instances) |
| `--border-default` | `#d6d3d1` | Stronger borders (inputs, h1 divider) |
| `--text-primary` | `#1c1917` | Headings, strong text |
| `--text-secondary` | `#44403c` | Body text, table cells |
| `--text-tertiary` | `#78716c` | Supporting text, table headers |
| `--text-muted` | `#a8a29e` | Sidebar categories, list markers |

### Accent — Cyan
| Token | Value | Usage |
|---|---|---|
| `--accent` | `#0891b2` | Links, active tabs, sidebar active bar, icons |
| `--accent-light` | `#ecfeff` | Blockquote bg, active sidebar bg, tab tint |
| `--accent-text` | `#0e7490` | Inline code text, link hover |
| `--accent-rgb` | `8 145 178` | Alpha variants via `rgb(var(--accent-rgb) / alpha)` — link underlines, focus rings, blockquote code |

### Technical Zone — Cool Slate
| Token | Value | Usage |
|---|---|---|
| `--tech-surface` | `#f8fafc` | Technical tab background |
| `--tech-accent` | `#6366f1` | Technical tab accent (indigo border-left) |
| `--tech-heading` | `#1e293b` | Technical zone h2 (serif, 1.3rem) |
| `--tech-subheading` | `#334155` | Technical zone h3 (serif, 1.1rem) |
| `--tech-text` | `#475569` | Technical zone body text (serif, 0.95rem) |

### Dark Component Palette
| Token | Value | Usage |
|---|---|---|
| `bg-gray-900` | — | Container background |
| `bg-gray-800/80` | — | Header bar background |
| `bg-gray-800/40` | — | Detail/expand sections |
| `bg-gray-800/60` | — | Category headers, search |
| `border-gray-700/60` | — | Container + header borders |
| `border-gray-700/50` | — | Row dividers |
| `text-gray-100` | — | Entity/component names |
| `text-gray-300` | — | Detail text, descriptions |
| `text-gray-400` | — | Secondary descriptions |
| `text-gray-500` | — | Uppercase labels, chevrons |
| `text-cyan-300` | — | Field names, code identifiers |

### Code Block
| Token | Value | Usage |
|---|---|---|
| `--code-bg` | `#1e1e2e` | Code block background (Catppuccin-like) |
| `--code-overlay-rgb` | `255 255 255` | Copy button + scrollbar overlays (used with `rgb(var(--code-overlay-rgb) / alpha)`) |
| `--success` | `#34d399` | Copy success color (emerald) |
| `--success-rgb` | `52 211 153` | Copy success alpha variants |

### Tailwind Theme Tokens
Defined in `index.html` `@theme` block: `primary`, `primary-light`, `brand`, `surface`, `surface-raised`, `border`, `border-strong`, `text-primary`, `text-secondary`, `text-muted`.

### Hero Section
| Token | Value | Usage |
|---|---|---|
| `.hero-tagline` | Newsreader `1.65rem`, weight 600, `-0.02em` | Landing page value prop |
| `.hero-subtext` | UI font `1.05rem`, `--text-tertiary`, max-width 640px | Supporting description |

## Typography

### Font Stacks (3 tiers)
```
--font-prose: 'Newsreader', Georgia, 'Times New Roman', serif
--font-ui:    -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif
--font-mono:  'SF Mono', 'Cascadia Code', 'Fira Code', 'JetBrains Mono', ui-monospace, monospace
```

### Usage
| Element | Font | Size | Weight | Spacing |
|---|---|---|---|---|
| h1 | prose | `2.25rem` | 800 | `-0.025em` |
| h2 | prose | `1.5rem` | 700 | `-0.015em` |
| h3 | prose | `1.2rem` | 600 | `-0.01em` |
| h4 | ui | `1.05rem` | 600 | `0` |
| Body | prose | `1.05rem` | normal | — |
| Sidebar links | ui | `0.875rem` | normal | — |
| Sidebar categories | ui | `0.65rem` | 700 | `0.1em`, uppercase |
| App name | prose | `1.1rem` | 800 | `-0.02em` |
| Tables | ui | `0.875rem` | — | — |
| Table headers | ui | `0.75rem` | 600 | `0.05em`, uppercase |
| Inline code | mono | `0.82em` | — | — |
| Code blocks | mono | `0.8rem` | — | — |
| Tabs | ui | `text-sm` | semibold/bold | `tracking-wide` |
| Dark component text | — | `text-sm` (28x) | — | — |
| Dark component labels | — | `text-xs` (14x) | — | — |

### Line Heights
- Body prose: `1.8`
- Quick Start zone: `1.85`
- Technical zone body: `1.7`
- Technical zone lists: `1.65`
- Sidebar: `1.7`
- Code blocks: `1.65`
- h1: `1.15`

## Spacing

### Scale (Tailwind 4px base)
Most frequent values: `px-4` (8x), `py-2.5` (5x), `py-2` (5x), `px-2.5` (6x), `gap-2` (4x).

| Token | Value | Usage |
|---|---|---|
| Component margin | `my-5` (1.25rem) | Vertical spacing between dark components |
| Content padding | `2.5rem 3rem` | Main content area |
| Content max-width | `960px` | Reading width |
| Card grid gap | `gap-5` | Between card items |
| Dark header padding | `px-4 py-3` | Component header bars |
| Dark row padding | `px-4 py-2.5` | Expandable rows |
| Badge padding | `px-2.5 py-0.5` | Inline badges |
| Tab button padding | `px-6 py-3.5` | Tab buttons |
| Sidebar link padding | `0.15rem 0.75rem` | Sidebar nav items |
| Section gap (h2) | `3rem` top margin | Between major sections |
| Paragraph gap | `1.15rem` | Between paragraphs |

### Mobile Breakpoints
| Breakpoint | Content Padding | h1 Size | Notes |
|---|---|---|---|
| Desktop | `2.5rem 3rem` | `2.25rem` | Full experience |
| `≤768px` | `1.5rem 1.25rem` | `1.75rem` | Copy btn always visible |
| `≤480px` | `1.25rem 1rem` | `1.5rem` | Compact tabs |

## Depth
- **Borders over shadows** — 60+ border instances, 3 shadow instances.
- **`shadow-md`** on dark component containers only (ambient depth).
- **Single hover shadow** on card-grid: `shadow-[0_2px_12px_rgba(8,145,178,0.08)]` (Tailwind inline, uses accent).
- **Focus ring** on search: `box-shadow: 0 0 0 3px rgb(var(--accent-rgb) / 0.12)`.
- **No shadows** on warm zone elements.

## Border Radius Scale
| Token | CSS | Tailwind | Usage (count) |
|---|---|---|---|
| Container | `0.75rem` | `rounded-xl` | Dark components, cards (8x) |
| Inner | `0.5rem` | `rounded-lg` | Code blocks, mermaid, inner panels (5x) |
| Badge | `0.375rem` | `rounded-md` | Badges, sidebar links (7x) |
| Inline | `0.3rem` | — | Inline code |
| Button | `0.35rem` | — | Copy button |
| Tab focus | `0.25rem` | — | Focus outline |

> **Known inconsistency:** Light-mode radius has 7 distinct values (0.25–0.75rem). Dark-mode is consistent (`rounded-xl`/`rounded-lg`/`rounded-md`). Consider consolidating light-mode to the same 3-tier scale.

## Surfaces

### Two Temperature Zones
1. **Quick Start / warm zone:** `--surface-page` background, warm borders, stone text, serif prose, generous spacing.
2. **Technical Reference / cool zone:** `--tech-surface` background, `3px solid var(--tech-accent)` left border, serif prose (same Newsreader family), tighter spacing, slightly smaller headings. Same site at different densities.

### Component Container Pattern (dark) — 5 identical instances
```
rounded-xl overflow-hidden border border-gray-700/60 bg-gray-900 my-5 shadow-md
```

### Header Bar Pattern (dark) — 5 instances
```
bg-gray-800/80 px-4 py-3 border-b border-gray-700/60
```

### Detail Section Pattern (dark)
```
hidden px-4 py-2.5 bg-gray-800/40 border-t border-gray-700/60
```

### Category Header Pattern (dark)
```
bg-gray-800/60 px-4 py-2.5 border-b border-gray-700/60
```

## Transitions
- **Default:** `0.15s ease` — used for all color, border, background, opacity transitions.
- **Chevron rotation:** `transition-transform duration-200` with `rotate-90` toggle.
- **Hover states:** `transition-all duration-200` for multi-property changes.
- **Copy button reset:** `2000ms` setTimeout.
- **No bounce/elastic easing.** Smooth ease only.

## Component Patterns

### Tabs (signature element)
- Bar: `bg-surface-raised`, negative margin to bleed edge-to-edge.
- Quick Start active: `border-b-[3px] border-[#0891b2] text-[#0891b2] bg-white font-bold`.
- Technical active: `border-b-[3px] border-[#6366f1] text-[#6366f1] bg-white font-bold`.
- Inactive: `text-[#78716c] hover:text-[#44403c] hover:bg-[#efedeb] font-medium`.
- Icons: inline SVG, `w-4 h-4 mr-1.5 -mt-0.5`.
- Font: `var(--font-ui)`, `text-sm tracking-wide`.

### Sidebar
- Active: `bg-accent-light` + `box-shadow: inset 3px 0 0 var(--accent)` left bar.
- Hover: `bg-accent-light`, `color: accent`.
- Categories: `uppercase 0.65rem 700 tracking-0.1em text-muted`.
- Links: `0.875rem`, padded with `border-radius: 0.375rem`.

### Card Grid (warm)
- Surface: `bg-surface rounded-xl p-5 md:p-6 min-h-[120px] border border-border`.
- Hover: `border-primary/40` + `shadow-[0_2px_12px_rgba(8,145,178,0.08)]`.
- Icons: monospace, `color: #0891b2`, `opacity-70 → 100` on hover.
- Title: `text-base md:text-lg font-bold`, hover → `text-primary`.

### Code Blocks
- Background: `var(--code-bg)` (`#1e1e2e`, Catppuccin-like).
- Border: `1px solid var(--border-subtle)`, `rounded-[0.625rem]`.
- Copy button: appears on hover (desktop), always visible (mobile).
- Copy states: default transparent → hover brighter → `.copied` emerald.
- Custom scrollbar: thin, translucent white thumb.

### Inline Code
- `bg-surface-raised text-accent-text border border-border-subtle rounded-[0.3rem]`.
- Padding: `0.2em 0.45em`.
- Font size: `0.82em` relative.

### Badges
- Type: `bg-gray-700 text-gray-300 rounded-md font-mono text-xs px-2 py-0.5`.
- Required: `bg-rose-500/20 text-rose-300 rounded-md font-medium`.
- Sync: `bg-emerald-500/20 text-emerald-300 border border-emerald-500/30`.
- Async: `bg-blue-500/20 text-blue-300 border border-blue-500/30`.
- API methods: `rounded-md font-mono tracking-wide text-xs font-bold px-2.5 py-1`.
  - GET: `bg-blue-500/90`, POST: `bg-emerald-500/90`, PUT: `bg-amber-500/90 text-black`, PATCH: `bg-orange-500/90`, DELETE: `bg-rose-500/90`.
- Value pills: `bg-cyan-900/30 text-cyan-300 rounded-md font-mono`.
- Side effects: `bg-cyan-900/25 text-cyan-300 rounded-md`.

### Uppercase Labels
- `text-xs font-semibold uppercase tracking-wider text-gray-500`.

### Side-by-Side
- Two-panel flex layout: `flex-col md:flex-row gap-4`.
- Panel: `bg-surface border border-border rounded-lg p-4`.
- Three modes: plain text, syntax-highlighted code, live component render.
- Used on landing page for YAML-input → rendered-output demo.

### Blockquotes
- `border-left: 3px solid accent`, `bg-accent-light`.
- `rounded: 0 0.5rem 0.5rem 0`.
- `font-style: italic`, `0.95rem`.

### Expandable Rows (dark)
- Chevron: `text-gray-500 text-xs`, toggles `rotate-90`.
- Click handler: toggle `hidden` class on detail div.
- Hover: `hover:bg-gray-800/40 transition-colors`.
- Field names: `font-mono text-cyan-300 text-sm`.

### Status Flow
- State buttons: colored `bg-*/15 border-*/50 text-*-400 rounded-lg px-3.5 py-1.5`.
- Active state: replaces idle bg/text with solid `bg-*-500 text-white`.
- Arrows between states: `text-gray-600 mx-1.5` → `&#8594;`.
- Detail panels: `bg-gray-800/40 rounded-lg border border-gray-700/50 mt-3`.

## Accessibility
- **Focus:** `outline: 2px solid var(--accent)`, `outline-offset: -2px` on tabs.
- **Search focus:** `border-color: accent` + `3px` cyan ring.
- **Links:** visible underline by default (`text-decoration-color: rgb(var(--accent-rgb) / 0.3)`).
- **Print:** sidebar, tabs, copy buttons hidden; content full-width.

## Color Substitutions from Defaults
| Default | Replaced with | Why |
|---|---|---|
| Pure gray body text | Stone-700 (`#44403c`) | Warmer reading experience |
| System font stack | Newsreader serif (prose) | Editorial warmth |
| `bg-red-500/80` required | `bg-rose-500/20 text-rose-300` | Less alarming, still visible |
| `text-cyan-400` field names | `text-cyan-300` | Better contrast on dark bg |
| `bg-yellow-500` state | `bg-amber-500` | Warmer, less harsh |
| `bg-green-500` POST | `bg-emerald-500` | Warmer green |
| `shadow-lg` on dark components | `shadow-md` | Less aggressive |
| `border-gray-700` hard | `border-gray-700/60` | Softer edges |
| Transparent link underline | `rgb(var(--accent-rgb) / 0.3)` underline | Links always distinguishable |

## Rebranding

All color values live exclusively in `:root` of `theme.css`. To rebrand:

1. **Edit `:root` only** — no hardcoded hex/rgba values exist outside `:root`
2. **RGB decomposition pattern** — tokens ending in `-rgb` (e.g. `--accent-rgb: 8 145 178`) enable alpha variants via `rgb(var(--accent-rgb) / 0.3)` without duplicating hex values
3. **What to change:**
   - Warm palette (`--surface-*`, `--border-*`, `--text-*`) — page warmth/coolness
   - Accent (`--accent`, `--accent-light`, `--accent-text`, `--accent-rgb`) — brand color
   - Tech zone (`--tech-*`) — technical tab personality
   - Code block (`--code-bg`, `--code-overlay-rgb`) — code aesthetic
   - Success (`--success`, `--success-rgb`) — confirmation color
4. **Also update** `index.html` Tailwind `@theme` block to match (Tailwind classes in components use those tokens)
