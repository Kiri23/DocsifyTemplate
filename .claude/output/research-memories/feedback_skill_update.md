---
name: Update skill after export changes
description: After modifying filters, templates, or latex-export.js, remind user to update the docsify-template skill references
type: feedback
---

After finishing changes to export-related files (docs/filters/*.lua, docs/templates/*, docs/plugins/latex-export.js), proactively ask if the user wants to update the skill references in .claude/skills/docsify-template/references/export/.

**Why:** The skill docs got out of sync multiple times during the export feature build. The user had to manually ask to update them each time.

**How to apply:** At the end of any export-related implementation, before the final commit, check if skill references need updating and offer to do it.
