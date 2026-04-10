---
name: Why classic scripts instead of ES modules
description: Docsify 4 requires classic <script> tags — ES modules execute deferred and miss the synchronous plugin registration window
type: project
---

## Decision: Classic `<script>` tags for Docsify plugins (not ES modules)

Docsify 4 initializes **synchronously on script load** — it reads `window.$docsify.plugins` in the same tick its CDN script executes. There is no post-init plugin registration API.

`<script type="module">` is always **deferred** (executes after HTML parse). If a plugin is in a module, Docsify core loads first, reads an empty plugins array, and the plugin registration arrives too late.

**Why:** This is Docsify 4's architecture choice (2017) — globals + synchronous init — not a web platform limitation.

**How to apply:** Any file that registers a Docsify plugin (`$docsify.plugins.push(...)`) MUST be a classic `<script>` loaded before the Docsify CDN script. Internal imports between our own files (e.g., engine functions) must also use `window` globals since the consuming file cannot be a module. If we ever migrate to Docsify 5 or a module-aware doc framework, revisit this constraint.
