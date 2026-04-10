---
status: done
order: 4
slug: consolidate-ref
---

# Task 4: Consolidate Reference

## Objective
Create a single "Framework Reference" page that contains all non-component reference material currently scattered across getting-started.md and architecture.md Technical Reference tabs.

## Scope
- Create `docs/content/guide/framework-reference.md`
- Move into it:
  - Project structure tree (from getting-started.md TR)
  - Component registration process (from getting-started.md TR)
  - CDN dependencies table (from getting-started.md TR)
  - Frontmatter limitations (from getting-started.md TR)
  - Brand color locations (from getting-started.md TR — if not fully moved to how-to in task-2)
  - Plugin lifecycle (from architecture.md TR)
  - HTMX virtual routing details (from architecture.md TR)
  - Global variables table (from architecture.md TR)
  - Prism language addition (from architecture.md TR — if not fully moved to how-to in task-2)
- Update `docs/_sidebar.md`
- Clean up getting-started.md and architecture.md TR tabs (remove moved content)

## Acceptance Criteria
- [ ] `framework-reference.md` exists with all non-component reference material
- [ ] No duplicate reference content across pages
- [ ] getting-started.md TR tab is either removed or contains only tutorial-relevant reference
- [ ] architecture.md TR tab is either removed or contains only explanation-relevant reference
- [ ] Sidebar lists Framework Reference alongside Components Reference

## Session Log
<!-- append-only: each session adds an entry -->
- 2026-03-30: Started — consolidating scattered reference material into framework-reference.md
- 2026-03-30: Done — created framework-reference.md (project structure, component registration, plugin lifecycle, HTMX routing, global variables, frontmatter, CDN deps, brand colors). Rewrote architecture.md as pure explanation (removed TR tab, frontmatter, added design discussion). Updated sidebar. Writing voice audit fixed 3 issues (anthropomorphism, excessive claim). Commit f2c231a.
