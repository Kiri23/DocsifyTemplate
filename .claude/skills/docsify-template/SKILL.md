---
name: docsify-template
description: "Develop and extend the DocsifyTemplate framework — create components, modify plugins, style themes, author content pages. Use when working on any file in this project: components, plugins, styles, content markdown, index.html, or design system."
---

# DocsifyTemplate Platform Skill

Zero-build-step interactive docs framework. Template literal functions = React components. HTMX = re-rendering. Docsify = everything else.

## Critical Rules

1. **Design system first.** Read `.interface-design/system.md` before touching ANY style. All colors in `:root` of `theme.css` — NEVER hardcode hex outside `:root`. Alpha variants use `rgb(var(--*-rgb) / alpha)`.
2. **Component registry is two places.** Script tag in `docs/index.html` AND entry in `COMPONENT_REGISTRY` array in `docs/plugins/component-renderer.js`. Miss either = silent failure.
3. **Components are pure functions.** `window.ComponentName = function(data) { return '<html>'; }` — no state, no side effects, no DOM manipulation. Tailwind + CSS variables only.
4. **Tabs require frontmatter + exact headings.** Pages split into tabs only when YAML frontmatter exists AND `## Quick Start` / `## Technical Reference` headings are present. Missing either = no tabs.
5. **Code fence = component invocation.** ` ```component-name ` with YAML body triggers the pipeline. The fence language must match a registry entry exactly (kebab-case).
6. **HTMX is tab-switching only.** The ~30-line `htmx-virtual.js` intercepts `/api/switch/*` — no real HTTP. Don't extend it for other purposes.

## Decision Trees

### "I need to create or modify a component"

```
Component task?
├─ Create new component from scratch
│  └─ references/components/patterns.md (creation checklist)
├─ Modify existing component HTML/behavior
│  └─ references/components/api.md (all YAML schemas + HTML patterns)
├─ Fix component not rendering
│  └─ references/components/gotchas.md (registry, YAML escaping)
├─ Add interactivity (collapsibles, search, toggles)
│  └─ references/components/patterns.md (interactivity patterns)
└─ Understand how components work end-to-end
   └─ references/components/REFERENCE.md (pipeline overview)
```

### "I need to modify plugins or the rendering pipeline"

```
Plugin task?
├─ Understand the 3-hook lifecycle
│  └─ references/plugins/REFERENCE.md (beforeEach → afterEach → doneEach)
├─ Change how frontmatter/tabs work
│  └─ references/plugins/api.md (component-renderer.js internals)
├─ Change tab switching behavior
│  └─ references/plugins/api.md (htmx-virtual.js section)
├─ Modify LaTeX export
│  └─ references/plugins/configuration.md (latex-export + pandoc.wasm)
├─ Add a new plugin
│  └─ references/plugins/patterns.md (plugin creation pattern)
└─ Debug plugin issues (rendering, ordering, conflicts)
   └─ references/plugins/gotchas.md
```

### "I need to change styles or rebrand"

```
Styling task?
├─ Rebrand (change colors for a new project)
│  └─ references/styling/patterns.md (rebranding checklist)
├─ Modify specific component styles
│  └─ references/styling/api.md (all CSS custom properties)
├─ Change typography, spacing, or layout
│  └─ references/styling/api.md (typography + spacing tokens)
├─ Understand warm vs cool zones
│  └─ references/styling/REFERENCE.md (two-temperature design)
├─ Add responsive or print styles
│  └─ references/styling/patterns.md
└─ Fix visual bugs (overflow, z-index, mobile)
   └─ references/styling/gotchas.md
```

### "I need to write or organize content"

```
Content task?
├─ Create a new documentation page
│  └─ references/authoring/patterns.md (page templates)
├─ Add components to a page (YAML code fences)
│  └─ references/authoring/api.md (component usage in markdown)
├─ Create tabbed page (Quick Start / Technical)
│  └─ references/authoring/configuration.md (frontmatter + headings)
├─ Add page to sidebar navigation
│  └─ references/authoring/configuration.md (sidebar format)
├─ Use mermaid diagrams or region toggles
│  └─ references/authoring/api.md (special content types)
└─ Fix content not rendering / blank page
   └─ references/authoring/gotchas.md
```

## Product Index

| Product | Entry File | Description |
|---------|-----------|-------------|
| Components | `references/components/REFERENCE.md` | Data-driven template literal components (YAML → HTML) |
| Plugins | `references/plugins/REFERENCE.md` | Core rendering pipeline: component-renderer, htmx-virtual, latex-export |
| Styling | `references/styling/REFERENCE.md` | Design system, CSS custom properties, theme.css, rebranding |
| Authoring | `references/authoring/REFERENCE.md` | Writing content pages, using components in markdown, sidebar |

## Troubleshooting Index

| Symptom | File |
|---------|------|
| Component shows raw YAML | `references/components/gotchas.md` |
| Tabs not appearing | `references/authoring/gotchas.md` |
| Page is blank after navigation | `references/authoring/gotchas.md` |
| Styles not applying / wrong colors | `references/styling/gotchas.md` |
| Plugin hook not firing | `references/plugins/gotchas.md` |
| Mermaid diagram not rendering | `references/plugins/gotchas.md` |
| LaTeX export button missing/broken | `references/plugins/gotchas.md` |
| Sidebar link goes nowhere | `references/authoring/gotchas.md` |
| Mobile layout broken | `references/styling/gotchas.md` |
| Component interactivity not working | `references/components/gotchas.md` |

## Key Globals

| Variable | Set by | Purpose |
|----------|--------|---------|
| `window.__pageMetadata` | beforeEach | Parsed frontmatter object |
| `window.__pageSections` | afterEach | Tab HTML content store |
| `window.$docsify` | index.html | Docsify configuration |
| `window.ComponentName` | component JS | Each component's render function |
