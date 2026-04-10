---
status: done
order: 3
slug: rewrite-tutorial
---

# Task 3: Rewrite Getting Started as a Tutorial

## Objective
Transform getting-started.md into a proper Diataxis tutorial with a concrete learning outcome — the user builds something tangible by the end.

## Scope
- `docs/content/guide/getting-started.md` — full rewrite of Quick Start tab
- Proposed outcome: "Build a mini API reference page using 3 components" (entity-schema, api-endpoint, status-flow)
- Changes:
  - Remove "What You Get" card-grid (marketing, not teaching)
  - Remove cross-links mid-flow (keep learner focused)
  - Use collaborative "we" voice ("Let's create...", "Now we'll add...")
  - Add a meaningful conclusion showing what was built
  - Keep Technical Reference tab as-is (or remove if reference is consolidated in task-4)

## Acceptance Criteria
- [x] Page reads as a single learning journey start-to-finish
- [x] User builds a tangible result (multi-component page)
- [x] No feature-card interruptions mid-flow
- [x] No "see also" or cross-links that pull the learner away before finishing
- [x] Uses "we" voice throughout
- [x] Ends with a "what you built" summary and natural next steps

## Session Log
<!-- append-only: each session adds an entry -->
- 2026-03-30: Started tutorial rewrite session.
- 2026-03-30: Done. Rewrote Quick Start as 5-step Diataxis tutorial (build Task API page with 3 components). Removed tabs and Technical Reference section (will consolidate in task-4). Added tutorial-header.js plugin for breadcrumbs, time estimate, difficulty, and outcome. Writing voice audit applied (killed "should", shortened sentences, front-loaded list items).
