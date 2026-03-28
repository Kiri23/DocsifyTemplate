# Styling — Reference

Two-temperature design system with all colors in CSS custom properties. The goal: duplicate the project, change only `:root`, get a different brand.

## Two Temperature Zones

### Warm Zone (Quick Start tab, general content)
- Background: `--surface-page` (#faf9f7) — warm off-white
- Borders: `--border-subtle` (#e7e5e4) — warm stone
- Text: stone scale (`--text-primary` through `--text-muted`)
- Accent: cyan (`--accent` #0891b2)
- Feel: editorial, approachable, "explaining over coffee"

### Cool Zone (Technical Reference tab)
- Background: `--tech-surface` (#f8fafc) — cool blue-white
- Borders: 3px solid indigo left border (`--tech-accent` #6366f1)
- Text: slate scale (`--tech-heading`, `--tech-text`)
- Feel: precise, reference-style, factual

### Dark Zone (Components)
- All data components render as dark cards: `bg-gray-900`, `border-gray-700/60`
- Consistent regardless of which tab they appear in
- Uses Tailwind utilities directly (no CSS variables for dark surfaces)

## Design System Source of Truth

`.interface-design/system.md` — ALWAYS read this before modifying styles.

Contains: color tokens, typography stacks, spacing scale, border radius scale, component patterns, accessibility rules, transition values.

## Reading Order

1. This file (overview)
2. `api.md` — all CSS custom properties, typography stacks, spacing values
3. `patterns.md` — rebranding checklist, responsive patterns, print styles
4. `configuration.md` — where styles are defined, Tailwind integration
5. `gotchas.md` — hardcoded values, z-index conflicts, mobile issues

## See Also

- `.interface-design/system.md` — the authoritative design spec
- `references/components/api.md` — HTML/Tailwind patterns in component markup
- `docs/styles/theme.css` — the actual stylesheet
