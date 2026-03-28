# Authoring — Reference

Writing content pages for the DocsifyTemplate framework documentation.

## Content Types

### Plain Markdown Pages
Just markdown. No frontmatter, no tabs. Good for simple pages.

### Tabbed Pages (Quick Start / Technical Reference)
Requires YAML frontmatter AND exact `## Quick Start` / `## Technical Reference` headings. Splits into two tabs with different visual zones (warm/cool).

### Component Pages
Use code fence components (` ```component-name ` with YAML) to render interactive elements. Can be plain or tabbed.

## Content Location

All documentation content lives in `docs/content/`. Current structure:

```
docs/content/
├── guide/
│   ├── getting-started.md
│   ├── components-reference.md
│   ├── architecture.md
│   └── creating-components.md
└── examples/
    └── component-showcase.md
```

The home page is `docs/README.md` (Docsify convention).

## Sidebar Navigation

`docs/_sidebar.md` controls the navigation tree. Format:

```markdown
* [Page Title](/content/folder/page-name)
  * [Sub Page](/content/folder/sub-page)
```

Links use `/content/` prefix (Docsify hash routing resolves these).

## Reading Order

1. This file (overview)
2. `api.md` — component usage in markdown, mermaid, region toggles
3. `configuration.md` — frontmatter format, tab headings, sidebar syntax
4. `patterns.md` — page templates, content organization
5. `gotchas.md` — blank pages, missing tabs, rendering failures

## See Also

- `references/components/REFERENCE.md` — which component to use for what data
- `references/plugins/api.md` — how the rendering pipeline processes content
- `references/styling/REFERENCE.md` — warm vs cool zone visual treatment
