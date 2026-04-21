---
name: Mobile touch-first UX
description: User browses DocsifyTemplate on Pixel Chrome — avoid hover-based interactions, prefer tap/footer patterns
type: feedback
originSessionId: 9be6cbbc-acb7-49f6-9563-1bb830e6aedf
---
No hover-only interactions in UI components. User is on Pixel Chrome (mobile) — hover states either don't fire or are hard to trigger.

**Why:** 2026-04-16 feedback on PR 17 backlinks demo — original design used `onMouseEnter` to drive a signal; unusable on touch. User suggested "pon abajo articulos relacionados" (related articles as footer).

**How to apply:**
- Default to tap/click handlers, not hover.
- For "preview on interact" patterns, prefer auto-showing context in a footer/sidebar over hover reveals.
- Any `onMouseEnter`/`:hover` logic must have a touch-equivalent (tap to toggle, or just always-visible).
- For doc-level features like backlinks, default pattern: inject as footer on every page, not a fence component that requires explicit placement.
