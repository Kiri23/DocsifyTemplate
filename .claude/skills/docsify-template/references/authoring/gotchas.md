# Authoring — Gotchas

## Page Is Blank After Navigation

**Cause 1: Sidebar path doesn't match file path**

```markdown
<!-- Wrong — case mismatch -->
* [Page](/content/Guide/My-Page)
<!-- File is at: docs/content/guide/my-page.md -->

<!-- Right -->
* [Page](/content/guide/my-page)
```

Paths are case-sensitive and must match exactly (without `.md`).

**Cause 2: File not in `docs/` directory**

Docsify only serves files from the `docs/` directory. A file at `content/page.md` (no `docs/` parent) won't be found.

**Cause 3: Missing `.md` file**

The sidebar link points to a file that doesn't exist. No error shown — just blank content.

## Tabs Not Appearing

**Cause 1: Missing frontmatter**

Without YAML frontmatter between `---` markers, the page won't be scanned for tab headings.

```markdown
<!-- Wrong — no frontmatter, no tabs -->
# My Page
## Quick Start
Content...

<!-- Right -->
---
type: guide
---
# My Page
## Quick Start
Content...
```

**Cause 2: Wrong heading text**

Must be exactly `## Quick Start` and `## Technical Reference`.

```markdown
<!-- Wrong -->
## Quickstart
## Quick-Start
## Tech Reference
## Technical Ref

<!-- Right -->
## Quick Start
## Technical Reference
```

**Cause 3: Wrong heading level**

Must be `##` (h2), not `#` (h1) or `###` (h3).

## Component Shows Raw YAML

See `references/components/gotchas.md` — usually a registry or naming issue.

Quick checklist:
1. Is the component name in `COMPONENT_REGISTRY`?
2. Is the script tag in `index.html`?
3. Does the fence name match exactly (kebab-case)?
4. Is the YAML valid (check for unquoted colons)?

## Frontmatter on Plain Pages Creates Unexpected Tabs

If you add frontmatter to a page that has `## Quick Start` or `## Technical Reference` as headings for OTHER reasons, the plugin will split it into tabs. Solution: rename those headings or remove the frontmatter.

## Sidebar Entry Without Page = Dead Link

A sidebar entry pointing to a non-existent page shows blank content with no error. Always create the file first, then add the sidebar entry.

## Page Exceeds ~300 Lines

Long pages get hard to navigate and slow to render (especially with many components). Split into sub-pages:

```
docs/content/topic/
├── overview.md      # Landing page with card-grid
├── sub-topic-a.md   # Focused page
└── sub-topic-b.md   # Focused page
```

## Docsify Markdown Quirks

- Heading IDs: Docsify auto-generates IDs from heading text. Duplicate headings get `-1`, `-2` suffixes.
- HTML in markdown: raw HTML works but won't be processed by markdown parser
- Empty lines: required between markdown elements (especially before/after code fences)
- Frontmatter parser limitation: no nested objects, no multiline values

## Search Doesn't Find Content

Docsify's search indexes all pages on first load. If you add a new page, refresh the browser to re-index. The search plugin caches results — clear localStorage if stale results persist.

## Limits

| Item | Limit | Why |
|------|-------|-----|
| Page length | ~300 lines | Readability, render performance |
| Sidebar depth | 3 levels | Layout constraints |
| Cross-references per page | 3-5 | Avoid reference overload |
| Pages per folder | ~10 | Navigation clarity |
| Components per Quick Start section | 1-2 | Warm zone = prose-heavy |
| Components per Technical Reference | No hard limit | Reference zone = data-heavy |

## See Also

- `references/components/gotchas.md` — component-level rendering failures
- `references/plugins/gotchas.md` — plugin timing issues
- `references/authoring/configuration.md` — frontmatter and sidebar syntax
