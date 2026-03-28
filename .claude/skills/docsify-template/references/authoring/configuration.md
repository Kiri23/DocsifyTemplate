# Authoring — Configuration

## Frontmatter Format

YAML between `---` markers at the top of a markdown file:

```markdown
---
type: guide
category: components
tags: [yaml, rendering, interactive]
---

# Page Title
```

The frontmatter parser is regex-based (not js-yaml):
- Supports: `key: value` and `key: [a, b, c]`
- Does NOT support: nested objects, multiline values
- Stored in `window.__pageMetadata`

**Frontmatter triggers tab splitting.** Any page with frontmatter will be scanned for `## Quick Start` and `## Technical Reference` headings.

## Tab Headings (Exact Match Required)

For a page to split into tabs, it needs BOTH:
1. YAML frontmatter (any content)
2. These exact `##` headings:

```markdown
## Quick Start

Content for the warm, approachable tab.

## Technical Reference

Content for the precise, reference-style tab.
```

The heading text must match exactly. Variations like "Quickstart", "Quick-Start", or "Tech Reference" will NOT trigger tab splitting.

Content before the first tab heading becomes the page intro (always visible above tabs).

## Sidebar Configuration

### File: `docs/_sidebar.md`

```markdown
* [Home](/)
* Guide
  * [Getting Started](/content/guide/getting-started)
  * [Components Reference](/content/guide/components-reference)
  * [Architecture](/content/guide/architecture)
  * [Creating Components](/content/guide/creating-components)
* Examples
  * [Component Showcase](/content/examples/component-showcase)
```

### Rules
- Links use `/content/` prefix (no `.md` extension)
- Indentation creates hierarchy (2 spaces)
- Text without a link = section header (not clickable)
- Order is manual — arrange logically
- Case-sensitive — must match file path exactly

### Adding a new page

1. Create `docs/content/folder/my-page.md`
2. Add to `docs/_sidebar.md`:
   ```markdown
   * [My Page](/content/folder/my-page)
   ```

### Adding a new section

```markdown
* New Section
  * [First Page](/content/new-section/first-page)
  * [Second Page](/content/new-section/second-page)
```

## Docsify Routing

Hash-based routing: `/#/content/guide/getting-started` loads `docs/content/guide/getting-started.md`.

- Home: `/#/` → `docs/README.md`
- Folder index: `/#/content/folder/` → `docs/content/folder/README.md`
- Named page: `/#/content/folder/page` → `docs/content/folder/page.md`

## Search Configuration

Docsify search plugin auto-indexes all pages. No manual configuration needed. Search input appears in the sidebar.

```javascript
// In window.$docsify config:
search: 'auto'
```

## See Also

- `references/authoring/api.md` — component usage in markdown
- `references/authoring/patterns.md` — page templates
- `references/plugins/api.md` — how frontmatter is parsed internally
