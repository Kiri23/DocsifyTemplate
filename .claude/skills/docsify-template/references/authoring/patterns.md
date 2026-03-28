# Authoring — Patterns

## Page Templates

### Tabbed Page (Quick Start + Technical Reference)

```markdown
---
type: guide
category: topic-name
tags: [relevant, tags]
---

# Page Title

Brief introduction visible above both tabs.

## Quick Start

Approachable, analogy-driven explanation. WHY before WHAT.

Minimal components (1-2 max per section). Lead with prose.

## Technical Reference

Precise, reference-style content. Schema-first.

Components welcome (unlimited). Lead with data.

### API Endpoints

` ` `api-endpoint
method: "GET"
path: "/api/resource"
...
` ` `

### Data Model

` ` `entity-schema
name: "Resource"
fields: [...]
` ` `
```

### Plain Page (No Tabs)

```markdown
# Page Title

Just write markdown. No frontmatter = no tabs.

Use components as needed:

` ` `card-grid
- title: "Item 1"
  description: "..."
  icon: "icon"
  href: "#/path"
` ` `
```

### Reference Page (Single Component)

```markdown
# Directive Reference

` ` `directive-table
title: "All Directives"
searchable: true
categories:
  - name: "Category"
    directives: [...]
` ` `
```

### Overview/Landing Page (Card Grid)

```markdown
---
type: overview
category: section
tags: [navigation]
---

# Section Name

Choose a topic:

## Quick Start

` ` `card-grid
- title: "Topic A"
  description: "What it covers"
  icon: "icon"
  href: "#/content/section/topic-a"
` ` `

## Technical Reference

More detailed breakdown or different navigation for power users.
```

## Content Organization

### When to create a new page
- Needs both Quick Start + Technical Reference treatment
- Distinct concept users would search for
- Existing page would exceed ~300 lines

### When to add a section to existing page
- Minor addition, closely related to existing content
- Users expect to find it alongside current content
- Adding a section keeps page under ~300 lines

### When to create a new folder
- 3+ pages on a related topic
- Distinct from existing folders (guide, examples)

## Component Density Guidelines

| Context | Components | Notes |
|---------|-----------|-------|
| Quick Start section | 1-2 max | Lead with prose, components support |
| Technical Reference | Unlimited | Components ARE the content |
| Reference page | 1 large table | directive-table or entity-schema |
| Overview page | 1 card-grid + 1 diagram | Navigation-focused |
| Plain page | As needed | No strict limit |

## Cross-Referencing

Link to other pages using Docsify's hash routing:

```markdown
See [Getting Started](/content/guide/getting-started) for setup instructions.

For component YAML schemas, check the [Components Reference](/content/guide/components-reference).
```

Keep cross-references to 3-5 per page. Include a brief description of what the linked page covers.

## See Also

- `references/authoring/api.md` — how to write code fences for components
- `references/authoring/configuration.md` — frontmatter and sidebar format
- `references/components/REFERENCE.md` — choosing the right component
