---
name: next-task
description: Continue the next pending task from the Diataxis audit plan. Reads the plan, finds the next task, executes it using Diataxis principles, and logs progress.
---

Read the plan at `/home/.claude/projects/-storage-emulated-0-Documents-Code-DocsifyTemplate/memory/plans/diataxis-audit/overview.md`.

Find the first task with status `not-started` or `in-progress`. Read its task file fully.

Then:

1. Use the skill `/my-claude-skills:persist-plan` to update the task status to `in-progress` and add a session log entry with today's date.

2. Use the skill `/my-claude-skills:diataxis` to execute the task. Pass the task's objective, scope, and acceptance criteria as context. The Diataxis skill has the references needed to ensure the work follows Diataxis principles.

3. When the work is complete, use `/my-claude-skills:persist-plan` to mark the task as `done`, log what was done, and update the overview.

4. Ask the user if they want to continue with the next task or stop.
