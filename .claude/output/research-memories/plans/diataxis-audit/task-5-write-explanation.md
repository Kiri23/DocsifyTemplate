---
status: done
order: 5
slug: write-explanation
---

# Task 5: Write Explanation Page

## Objective
Create a "Why DocsifyTemplate Works This Way" explanation page that discusses design decisions from multiple angles, giving users the conceptual understanding behind the framework's architecture.

## Scope
- Create `docs/content/guide/design-decisions.md`
- Topics to cover:
  - Why YAML code fences instead of custom HTML tags or JSX
  - Why HTMX for tab switching instead of vanilla JS
  - Why Docsify over Docusaurus, VitePress, or other static site generators
  - Why no build step — tradeoffs and limitations
  - Why template literal functions as "components"
  - The "zero-config" philosophy and its boundaries
- Update `docs/_sidebar.md`
- Voice: discussion-oriented, weighs alternatives, acknowledges tradeoffs

## Acceptance Criteria
- [ ] Page exists at `docs/content/guide/design-decisions.md`
- [ ] Discusses "why" from multiple angles for each decision
- [ ] No step-by-step instructions (that's tutorial/how-to territory)
- [ ] No reference tables or schema definitions (that's reference territory)
- [ ] Acknowledges tradeoffs honestly (not marketing copy)
- [ ] Sidebar updated

## Session Log
<!-- append-only: each session adds an entry -->
- **2026-03-31** — Started. Writing design-decisions.md explanation page.
- **2026-03-31** — Done. Created `docs/content/guide/design-decisions.md` with 7 sections: no build step, why Docsify, YAML code fences, template literal functions, HTMX for tabs, classic scripts vs ES modules, zero-config philosophy. Updated sidebar. Pure explanation — no instructions, no reference tables, honest tradeoffs throughout.
- **2026-03-31** — Extended editing session. Writing voice audit + humanizer pass + collaborative review with Christian. Key changes:
  - **Writing voice fixes**: removed "should", superlatives ("simplest possible" → "minimal"), anthropomorphism ("asks of it" → "requires"), added negation contractions, fixed passive voice, front-loaded sentences.
  - **Humanizer fixes**: fixed copula avoidance ("sits in" → "is in"), varied paragraph lengths, removed "the honest tradeoff" (performed candor), added then removed first-person "we" (see below).
  - **Voice decision — no "we"**: Christian is a solo developer, not a team. "We" implies a team that doesn't exist. Use "the framework" or "DocsifyTemplate" as subject. "You" = the client/reader, never Christian.
  - **Audience correction**: removed SEO paragraph entirely — this is internal company docs, not public/open-source. Readers are company clients including non-technical stakeholders (PMs, CEOs, POs). SEO is irrelevant.
  - **Honesty fixes**: removed "standard markdown" overclaim (YAML code fences aren't portable — they show as raw blocks in GitHub/Confluence). Removed "No vendor lock-in, no proprietary format" — can't prove it. Changed "more functionality" → "enough functionality" (Docusaurus/VitePress do more in many areas). Rewrote Docusaurus/VitePress paragraph to acknowledge DocsifyTemplate still requires learning (Docsify hooks, plugin API, YAML component model). Added portability caveat to YAML code fences tradeoff section where it belongs.
  - **Structure decision — predictable comparison sections**: all 4 comparison sections (Docsify, YAML, template literals, HTMX) now follow identical template: Opening ("DocsifyTemplate uses X for Y") → Body (bold-named alternatives, each a short paragraph) → Closing ("The tradeoff: ..."). Predictability reduces cognitive load — reader skims without thinking about structure.
  - **Removed scroll-reveal animation**: deleted `initScrollReveal()` from component-renderer-engine.js, the call from component-renderer.js, CSS from theme.css, and reference from framework-reference.md. All content shows immediately.
  - **Removed defensive writing**: dropped "But the alternatives all introduce worse problems — fragile HTML parsing, unnecessary tooling..." — loaded adjectives ("fragile", "unnecessary", "worse") and re-dismissing alternatives already covered in their own paragraphs.
  - **Research: YAML alternatives** — launched agent investigating 8 alternatives (custom HTML tags, markdown directives, Docsify plugins, MDX/Markdoc, shortcodes, HTML comments, extended fence attributes, marked tokenizer extensions). YAML code fences scored 20/25, highest of all. Killer constraint: components need nested data (arrays of objects with nested arrays) that only YAML handles cleanly without a build step.
  - **Research: htm library** — investigated developit/htm for readable templates. Doesn't fit: generates virtual DOM objects, not HTML strings. Would need htm + vhtml (two dependencies) to replace string concatenation. Plain template literals (native JS) get most of the readability with zero dependencies.
  - **Research: Lua as alternative to YAML** — launched agent investigating Lua tables vs YAML. Lua loses: 3-5x heavier runtime (69-130KB vs 25KB), returns proxy objects (not plain JS), Turing-complete (authors can write bugs/infinite loops), requires sandboxing, and authors must learn programming concepts (`return`, `{}`, `=`) for what is fundamentally data entry. YAML stays.
  - **Conclusion**: the design decisions page tradeoffs are honest as written. YAML in code fences looks unusual and isn't portable — that's the real cost, and no available alternative eliminates it without introducing a bigger cost.
