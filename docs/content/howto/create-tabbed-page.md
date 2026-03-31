# How to create a tabbed page

This guide shows you how to split a documentation page into Quick Start and Technical Reference tabs.

## Prerequisites

- A running DocsifyTemplate project

## Steps

### 1. Add YAML frontmatter

At the top of your markdown file, add frontmatter with at least a `type` field:

```yaml
---
type: guide
category: your-category
tags: [your, tags]
---
```

### 2. Add the required headings

Structure your content under these two specific `##` headings:

```markdown
---
type: guide
category: example
tags: [demo]
---

# Your Page Title

## Quick Start

Content for beginners or quick reference...

## Technical Reference

Detailed technical content...
```

Both the frontmatter and the `## Technical Reference` heading are required. Without frontmatter, no tabs render. Without the heading, all content stays in a single view.

### 3. Add the page to the sidebar

Open `docs/_sidebar.md` and add a link to your new page:

```markdown
* [Your Page](/content/guide/your-page)
```

## Verification

Navigate to the page in the browser. Two tab buttons appear at the top. Clicking between them swaps the content without a page reload.

## See also

- [Architecture](/content/guide/architecture) — how the tab-splitting pipeline works
- [Getting Started](/content/guide/getting-started) — project setup
