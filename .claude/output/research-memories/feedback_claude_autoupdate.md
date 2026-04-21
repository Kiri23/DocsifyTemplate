---
name: Claude Code auto-update breaks Termux
description: Claude Code auto-updates overnight breaking v2.1.112 pin — must disable autoUpdaterStatus after every reinstall
type: feedback
originSessionId: b462348b-8d79-46dd-8c65-4856a525fa5a
---
Claude Code auto-updates itself even when `autoUpdaterStatus: disabled` is set — a new version install overwrites settings.json.

**Why:** v2.1.113+ uses a Bun-compiled glibc ELF binary, incompatible with Termux (no glibc, Android kernel rejects ET_EXEC). Last working version is 2.1.112 (pure JS).

**How to apply:** Any time Claude Code breaks with "Cannot find module cli.js" or "native binary not installed", run:
1. `npm install -g @anthropic-ai/claude-code@2.1.112 --force`
2. Set `autoUpdaterStatus: disabled` in `/home/.claude/settings.json`

Both steps always together — the install resets the setting.

Consider adding this to `fix-claude` script or `kiri-install-claude`.
