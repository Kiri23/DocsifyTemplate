---
name: docsify-template
description: "Work on the DocsifyTemplate framework — components, plugins, styles, content. Routes to the right references and executes."
user_invocable: true
---

# DocsifyTemplate Development Workflow

You are working on the DocsifyTemplate framework — a zero-build-step interactive docs system.

## Step 1: Load context

Read the SKILL.md:
```
.claude/skills/docsify-template/SKILL.md
```

Read the design system (ALWAYS before any style work):
```
.interface-design/system.md
```

## Step 2: Classify the task

Determine which product area(s) the task touches:

| Area | Signals |
|------|---------|
| **Components** | new component, modify YAML schema, change rendered HTML, fix component |
| **Plugins** | rendering pipeline, tab behavior, frontmatter, latex export, new plugin |
| **Styling** | colors, typography, spacing, responsive, rebrand, CSS variables, theme.css |
| **Authoring** | new page, add content, sidebar, use components in markdown, tabs |

Most tasks touch 1-2 areas. Read the REFERENCE.md for each relevant area.

## Step 3: Load relevant references

Based on the task classification, read the specific reference files:

**For component work:**
```
.claude/skills/docsify-template/references/components/REFERENCE.md
.claude/skills/docsify-template/references/components/api.md          # YAML schemas, HTML patterns
.claude/skills/docsify-template/references/components/patterns.md     # Creation, interactivity
.claude/skills/docsify-template/references/components/gotchas.md      # Common failures
```

**For plugin work:**
```
.claude/skills/docsify-template/references/plugins/REFERENCE.md
.claude/skills/docsify-template/references/plugins/api.md             # Hook internals
.claude/skills/docsify-template/references/plugins/patterns.md        # Plugin creation
.claude/skills/docsify-template/references/plugins/gotchas.md         # Debug issues
```

**For styling work:**
```
.claude/skills/docsify-template/references/styling/REFERENCE.md
.claude/skills/docsify-template/references/styling/api.md             # All CSS tokens
.claude/skills/docsify-template/references/styling/patterns.md        # Rebranding, responsive
.claude/skills/docsify-template/references/styling/gotchas.md         # Visual bugs
```

**For content authoring:**
```
.claude/skills/docsify-template/references/authoring/REFERENCE.md
.claude/skills/docsify-template/references/authoring/api.md           # Component usage in MD
.claude/skills/docsify-template/references/authoring/configuration.md # Frontmatter, sidebar
.claude/skills/docsify-template/references/authoring/gotchas.md       # Rendering failures
```

## Step 4: Read current source files

Always read the actual source files you'll modify before making changes:

| If modifying | Read first |
|-------------|------------|
| A component | `docs/components/<name>.js` |
| component-renderer | `docs/plugins/component-renderer.js` |
| htmx-virtual | `docs/plugins/htmx-virtual.js` |
| latex-export | `docs/plugins/latex-export.js` |
| theme/styles | `docs/styles/theme.css` + `.interface-design/system.md` |
| index.html | `docs/index.html` |
| sidebar | `docs/_sidebar.md` |
| content page | `docs/content/<path>.md` |

## Step 5: Execute the task

Apply changes following the patterns from the references. Key reminders:

- **Components:** Pure functions, return HTML strings, Tailwind + CSS vars, register in TWO places
- **Plugins:** Follow the beforeEach/afterEach/doneEach hook model
- **Styles:** Only modify `:root` for colors, use CSS custom properties everywhere
- **Content:** Use code fences for components, frontmatter for tabs, update sidebar

## Step 6: Verify

After making changes:

1. Check the server is running (`npm run serve`)
2. If new component: confirm script tag in index.html + COMPONENT_REGISTRY entry
3. If style change: confirm no hardcoded hex outside `:root`
4. If content change: confirm sidebar entry exists
5. If plugin change: test that existing pages still render

## Output Format

Summarize what was done:
- **Files modified:** list
- **Files created:** list (if any)
- **Registry updates:** component registrations (if any)
- **What to verify:** specific pages/features to check in browser
