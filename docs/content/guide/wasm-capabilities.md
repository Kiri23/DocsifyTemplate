# WASM Capabilities

DocsifyTemplate runs entirely in the browser with no build step. That constraint works until you hit something JavaScript cannot do on its own — converting markdown to PDF, for instance. WebAssembly fills that gap without adding a server.

## The export pipeline

Every page has an Export button that runs Pandoc inside the browser. Not a Pandoc API call to a server — the full Pandoc binary, compiled to WebAssembly, executing in a Web Worker.

The pipeline has three layers:

- **Pandoc WASM** (`lib/export/pandoc.js`) loads a ~30MB `.wasm` binary via a WASI shim. It exposes the same `convert(options, stdin, files)` interface that the CLI Pandoc uses, except the filesystem is virtual — filters and templates are fetched over HTTP and mounted as in-memory blobs.
- **Lua filters** (`lib/export/filters/`) transform the Pandoc AST before output. `yaml-parser.lua` handles the YAML code fence components. Format-specific filters (`latex-components.lua`, `typst-components.lua`, `llm-components.lua`) convert component nodes into the target format's native structures.
- **Templates** (`lib/export/templates/`) control the final document layout. `branded.tex` and `branded.typ` produce typeset documents with cover pages, headers, and brand colors — not a CSS print stylesheet, but actual LaTeX and Typst source compiled to PDF.

For PDF output, the pipeline chains two WASM runtimes: Pandoc converts markdown to Typst source, then the Typst WASM compiler renders that source to PDF. Mermaid diagrams are captured as SVGs from the live DOM and inlined into the Typst source before compilation.

The output: a branded PDF generated entirely client-side, with no server, no CLI tool, and no build step.

## Competitor approaches to export

Documentation frameworks fall into two camps on export:

**CSS print stylesheets** (Docusaurus, VitePress, GitBook) rely on the browser's print rendering. You get whatever the browser produces — no custom typography, no programmatic cover pages, no control over page breaks beyond `break-before: page`. The output looks like a printed web page because it is one.

**Server-side conversion** (MkDocs with WeasyPrint, Read the Docs with Sphinx/LaTeX) runs a conversion tool on a build server. WeasyPrint produces CSS-styled PDFs with cover pages — the closest competitor to what DocsifyTemplate offers. But it requires Python, a server, and a build step. The user cannot export from a static hosting environment.

DocsifyTemplate's approach is different: run the conversion tool in the browser via WASM. The user clicks Export, waits a few seconds, and downloads a PDF that went through the same Pandoc + LaTeX/Typst pipeline that a professional typesetter would use. No server needed. The static site host serves the `.wasm` file like any other asset.

This works because nothing stands between the content and the conversion tool. The markdown is fetched, the WASM binary runs, and the output is a file download. A framework with a build step and server-side rendering would need to replicate its rendering pipeline inside the export tool — or accept that the exported document looks different from the rendered page.

## When WASM is justified

The project rule is: **don't add WASM unless JavaScript cannot solve the problem.** Pandoc WASM exists because JavaScript has no markdown-to-LaTeX converter with Pandoc's format coverage and filter system. The alternative would be reimplementing Pandoc's AST transformations in JavaScript — a multi-year effort for an inferior result.

The rule bends when three conditions align:

1. **JavaScript cannot do the job** — not "it would be slower" or "it would be harder," but "it cannot."
2. **The WASM module loads lazily** — the 30MB Pandoc binary downloads only when the user clicks Export, not on page load.
3. **The feature degrades gracefully** — if WASM fails to load, the rest of the site works normally. Export is an enhancement, not a dependency.

Service Workers follow the same logic. The framework does not use a Service Worker today because nothing requires one. If a future feature needs offline caching or background sync, the SW would be justified — but adding one speculatively would add complexity to every deployment for a benefit no user has requested.

## Future possibilities

The same architecture that enables Pandoc WASM can host other tools. None of these are planned — they are possibilities the design makes available.

### Semantic search

Current search is keyword-based (Docsify's built-in search plugin). Semantic search would let a user type "how do I configure exports" and find the right section even without an exact keyword match.

The pieces exist: Transformers.js runs embedding models in the browser (~25MB lazy load), and cosine similarity over pre-computed document embeddings is fast enough for a documentation site. SemanticFinder demonstrates this pattern — browser-only semantic search with no server.

The tradeoff is the initial model download. For a small documentation site, keyword search may be good enough. Semantic search becomes compelling when the docs grow large enough that users struggle to find content with exact terms.

### Executable code blocks

Pyodide (~11MB lazy) runs Python in the browser. A "Run" button on Python code fences would let readers execute examples without leaving the page. WebContainers (the technology behind StackBlitz) do the same for Node.js.

This fits documentation sites that teach programming — API docs with runnable examples, tutorials with interactive exercises. For DocsifyTemplate's current use case (internal company docs for non-technical stakeholders), it is unnecessary. The architecture does not prevent it.

### Browser-side git

Isomorphic-git (~200KB) implements git in JavaScript — clone, commit, push, all running in the browser. Combined with Yjs and WebRTC for real-time collaboration (~30KB), this enables co-editing documentation without a server.

The use case: a team edits docs in the browser, changes sync via WebRTC, and one person pushes to GitHub when the edits are ready. No local git install, no CLI, no dev environment.

### Local RAG

PGlite (Postgres in WASM) + pgvector + Transformers.js + WebLLM = a "chat with your docs" feature that runs entirely in the browser. The user asks a question in natural language, the system retrieves relevant sections via vector search, and a local language model generates an answer.

This is the heaviest option — multiple WASM modules, a vector database, and a language model, all in the browser. It is also the most speculative. The technology works in demos (WordPress Playground runs PHP + MySQL in WASM), but the download sizes and memory requirements make it impractical for casual documentation browsing today.

## The pattern

Each of these possibilities follows the same pattern the export pipeline established:

1. Load a WASM module lazily, only when the user triggers the feature.
2. Run computation client-side — no server, no API key, no backend to maintain.
3. Degrade gracefully — the core documentation site works without the feature.

DocsifyTemplate's architecture — no build step, no framework runtime, direct access to the DOM and the content — supports this pattern directly. A framework that owns the rendering pipeline would need to expose hooks for each integration point. DocsifyTemplate loads a script.

Whether any of these features are worth building depends on the site's audience and scale. The architecture keeps the option open without forcing the decision.

## See also

- [Design Decisions](/content/guide/design-decisions) — Trade-offs behind the framework's core choices
- [Architecture](/content/guide/architecture) — How the components, plugins, and rendering pipeline fit together
- [Framework Reference](/content/guide/framework-reference) — Technical details on hooks, variables, and registration
