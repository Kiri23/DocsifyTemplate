# Plans

Multi-session plan tracking. Each subdirectory is a plan with tasks that persist across Claude Code sessions.

## For Claude (read this at session start)

1. Check if the user wants to continue an existing plan
2. Read the plan's `overview.md` for context and task order
3. Read the specific task file before starting work
4. After completing work, update the task file's status and session log
5. If all tasks are done, note it in overview.md

## Structure

Each plan follows this layout:
- `overview.md` — plan summary, origin, task order
- `task-N-slug.md` — individual task with status, scope, criteria, session log
