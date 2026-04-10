---
status: done
order: 1
slug: fix-accuracy
---

# Task 1: Fix Accuracy

## Objective
Update all file paths in documentation from old `docs/` locations to current `lib/` locations after the code restructure.

## Scope
- `docs/content/guide/getting-started.md` — project structure tree, component registration paths, script tags
- `docs/content/guide/components-reference.md` — component file references
- `docs/content/guide/creating-components.md` — file creation paths, registration paths
- `docs/content/guide/architecture.md` — plugin file references
- `docs/content/examples/component-showcase.md` — any file path references
- `docs/README.md` — if any paths referenced

Path changes:
- `docs/components/` → `lib/components/`
- `docs/plugins/` → `lib/plugins/`
- `docs/styles/` → `lib/styles/`
- Script src attributes: `components/foo.js` → `../lib/components/foo.js` (relative to docs/)

## Acceptance Criteria
- [x] No documentation page references `docs/components/`, `docs/plugins/`, or `docs/styles/`
- [x] All `<script src=` examples point to correct `lib/` paths
- [x] Project structure tree in getting-started.md reflects actual `lib/` layout
- [x] Component file references in creating-components.md use `lib/` paths

## Session Log
<!-- append-only: each session adds an entry -->
- 2026-03-30: Started — fixing docs/ → lib/ paths across all doc pages.
- 2026-03-30: Completed — updated 4 files (getting-started.md, creating-components.md, components-reference.md, architecture.md not needed). 9 edits: project structure tree rewritten to show lib/ layout, all script src examples changed to ../lib/ paths, plugin/component/style file references changed from docs/ to lib/. All acceptance criteria met.
