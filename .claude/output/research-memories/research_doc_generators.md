---
name: Doc generator comparison research
description: Deep comparison of Starlight, Nextra, Docusaurus, VitePress, MkDocs Material, GitBook vs DocsifyTemplate — none convinced user to switch
type: project
---

## Research: Doc Site Generators vs DocsifyTemplate (2026-04-07)

Investigated Starlight (Astro), Nextra (Next.js), Docusaurus, VitePress, MkDocs Material, GitBook.

**Why:** User wanted to know if these generators offer something DocsifyTemplate can't, especially around customization and plugins.

**How to apply:** DocsifyTemplate's architecture is validated — don't suggest migrating to any of these.

### Key finding: They fall short for custom use cases

All generators are optimized for conventional docs (markdown -> pretty HTML). When you need something truly custom (like Kiri Editor), they become straitjackets:

- **Starlight** has only **2 plugin hooks** (`config:setup`, `i18n:setup`). No render pipeline hooks. No code fence component support. YAML-in-code-fence would require complex remark plugins or switching to Markdoc syntax. 41 community plugins, none for advanced use cases.
- **Nextra** is more flexible (escape hatch to full Next.js) but HTMX is incompatible with React's virtual DOM. Components must be React, not plain JS functions. Code fence components possible via remark plugins but significantly more complex than DocsifyTemplate's approach.
- Both **require build steps** — zero-build is impossible.
- Neither can do client-side Pandoc WASM export.
- Neither gives direct DOM access like Docsify's `beforeEach`/`afterEach`/`doneEach`.

### DocsifyTemplate advantages confirmed

- YAML-in-code-fence components (zero barrier for content authors)
- Domain-specific components (entity-schema, api-endpoint, status-flow) — generators only have generic ones
- Pandoc WASM export pipeline (unique — no other generator has client-side export)
- Zero build, full DOM control, interceptable render pipeline

### Frontmatter: open opportunity

- Starlight has ~20 frontmatter fields (hero, sidebar badges, draft, template, toc control, pagination)
- Nextra uses `_meta.js` for per-page theme config (toggle breadcrumb/toc/footer/navbar/sidebar/pagination/layout)
- DocsifyTemplate currently only uses `type: guide`
- **User sees potential in frontmatter but finds existing implementations too basic.** This is an open design question — not solved yet, no specific fields identified as valuable.
- Don't propose specific frontmatter fields without a concrete use case driving them.
