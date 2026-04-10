---
status: done
order: 2
slug: extract-howto
---

# Task 2: Extract How-To Guides

## Objective
Create standalone how-to guide pages for common user tasks, pulled from Technical Reference tab snippets currently buried in other pages.

## Scope
- Create `docs/content/howto/` directory (or `docs/content/guide/howto-*.md` files)
- Minimum 3 guides:
  - **Change brand colors** — from getting-started.md TR (Brand Colors section)
  - **Add a Prism language** — from architecture.md TR (Adding a New Prism Language section)
  - **Create a tabbed page** — from getting-started.md QS (Add a Tabbed Page section)
- Update `docs/_sidebar.md` with new How-To section
- Each guide: goal-oriented, conditional imperative voice, no teaching, no explaining

## Acceptance Criteria
- [x] At least 3 standalone how-to pages exist
- [x] Each page addresses exactly one user goal
- [x] No tutorial language ("let's learn", "we will understand")
- [x] No explanation language ("the reason is", "this works because")
- [x] Sidebar updated with How-To section
- [x] Source content removed or reduced in original pages to avoid duplication

## Session Log
<!-- append-only: each session adds an entry -->
- 2026-03-30: Started extraction of how-to guides from existing docs.
- 2026-03-30: Completed. Created 3 how-to guides (change-brand-colors, add-prism-language, create-tabbed-page), updated sidebar, replaced source content with cross-links. Commit 580d92d.
