---
name: session-start
description: "Load full project context at the start of a DocsifyTemplate session: vision, engineering DNA, DAG mental model from MemoryGraph, open issues, and current branch. Always run this at the start of a new session before doing any work."
---

You are starting a DocsifyTemplate session. Load all context before doing anything else.

## Step 1 — Load the vision (local memory)

Read this file:
`/storage/emulated/0/Documents/Code/DocsifyTemplate/.claude/output/research-memories/vision_docs_intelligence_engine.md`

This is the master mental model. Internalize it — every suggestion you make should be consistent with it.

## Step 2 — Load Engineering DNA and DAG pattern from MemoryGraph

Fetch these two nodes silently (do not dump raw JSON to the user):

- Engineering DNA — Engine/Transport: node `5997dffe-7089-4a0e-af04-1a834b6b7c1e`
- DAG + credit assignment as unifying pattern: node `9c106250-d098-4f56-91a2-ad1d64c0200f`

Use `mcp__memorygraph__get_memory` for each. Extract the key ideas and hold them as context.

If MemoryGraph is unreachable, continue — the vision file covers the essentials.

## Step 3 — Load open GitHub issues

Run:
```
gh issue list --repo Kiri23/DocsifyTemplate --state open --limit 20 --json number,title,labels
```

Group them mentally by label: `DAG Graph`, `Plugin`, `AI`, `Frontend`, `CI/CD`, `Kiri Editor`.

## Step 4 — Load current git context

Run:
```
git branch --show-current
git log --oneline -5
```

Know what branch you're on and what was last committed.

## Step 5 — Present context summary and ask what to work on

Output a SHORT summary (under 15 lines) in this format:

---
**Branch:** `<current-branch>`

**Vision:** docs intelligence engine — writers write to signal store, components read reactively. Engine extends, never modifies. YAML = transport, Custom Elements = islands, Signals = wire.

**Open work by area:**
- Plugin/DAG: #12 backlinks, #14 drift detection, #13 graph visual, #23 chat
- AI: #18 MCP server, #23 chat plugin
- Frontend: #5 expandable row
- Other: #8 Kiri Editor, #10 isomorphic-git, #11 CI/CD

**Last commits:** <last 3 commit messages>

What do you want to work on?
---

Wait for the user's answer before doing anything else.
