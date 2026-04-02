# Design Decisions

DocsifyTemplate trades flexibility for simplicity. Each section below covers one of those choices and what you give up.

For how the architecture fits together, see [Architecture](/content/guide/architecture). For technical details on hooks, variables, and registration, see [Framework Reference](/content/guide/framework-reference).

## Why no build step

Most documentation frameworks — Docusaurus, VitePress, MkDocs — generate static HTML from source files. You run a build command, it outputs a folder of HTML, and you deploy that folder. DocsifyTemplate skips this entirely. Docsify reads markdown at runtime in the browser and renders it directly.

The upside is immediate feedback. Edit a markdown file, refresh the browser, see the change. No waiting for a build, no dev server to restart, no CI pipeline to configure.

The downside is latency. Every page load fetches and parses markdown in the browser. On fast networks you won't notice. On slow connections with large pages, you see a flash before content shows up. Static HTML avoids this because the content is already in the initial response.

## Why Docsify over other frameworks

DocsifyTemplate uses Docsify for routing, sidebar, search, and markdown rendering. It runs in the browser with no build step, has a plugin system, and needs minimal configuration.

**Docusaurus** and **VitePress** produce fast static sites, but customizing them means working inside React or Vue — their build pipelines, their component models, their config files.

**MkDocs** (Python) generates static HTML and has a strong plugin ecosystem. It requires Python, a build step, and Jinja templates for customization. The build step is fast, but it is still a step between editing and seeing results.

**Plain HTML** needs no framework or dependencies. But you lose sidebar generation, search, markdown rendering, and routing — features that Docsify provides out of the box.

The tradeoff: Docsify provides enough functionality with less configuration, and the content is portable markdown. But it has a smaller ecosystem and fewer built-in features than Docusaurus or VitePress. The following sections explain what DocsifyTemplate adds on top.

## Why YAML code fences for components

DocsifyTemplate uses YAML inside markdown code fences to define components:

````
```card-grid
title: "Features"
cards:
  - label: Fast
    description: No build step
```
````

YAML passes through the markdown parser untouched as a `<pre><code>` block. The component renderer finds it, parses the YAML, and replaces it with rendered HTML. Authors who have written a Docker Compose file or a GitHub Actions workflow already know the syntax.

**Custom HTML tags** (`<card-grid title="Features">`) work in raw HTML but break inside markdown. Markdown parsers treat unknown HTML inconsistently — some pass it through, some strip it, some wrap it in paragraphs. Nested structures with attributes become fragile.

**JSX** requires a build step and a transpiler. It is the right choice when you need composition, state, and lifecycle hooks. DocsifyTemplate components don't do any of those things — they transform data into HTML strings.

**Shortcodes** (like Hugo's `{{< card-grid >}}`) are concise but require custom parsing. Every shortcode syntax is different, and extending the parser means understanding its internals.

The tradeoff: YAML inside code fences looks unusual and isn't portable — open the file in GitHub or Confluence and you see a raw YAML block, not a rendered component.

## Why template literal functions as components

DocsifyTemplate uses plain JavaScript functions as components. Each function takes a data object and returns an HTML string. No virtual DOM, no reactivity, no lifecycle. The bar for creating a component is: can you write a function that returns a string?

Documentation components are static. A card grid doesn't update after rendering. An API endpoint display doesn't react to user input beyond collapsing sections. There's no state to manage, no re-rendering to optimize.

**React**, **Lit**, and **Svelte** provide virtual DOM, reactivity, and lifecycle hooks. They also require a build step, a runtime, and a learning curve for anyone who wants to write a new component.

**Tagged template literals** (like `html\`<div>...\``) are more readable than string concatenation but require a library or build step to process.

The tradeoff: string concatenation with escaped quotes is harder to read than JSX or tagged templates. Complex components like `status-flow.js` have deeply nested string expressions that take effort to follow. That workflow breaks the moment you add a transpiler.

## Why HTMX for tab switching

DocsifyTemplate uses HTMX to swap tab content between Quick Start and Technical Reference views. A 30-line interceptor catches the request before it hits the network, reads pre-stored HTML from memory, and swaps the DOM. A tab button looks like this:

```html
<button hx-get="/api/switch/technical" hx-target="#tab-content">Technical</button>
```

The behavior is in the markup, not in a script. Adding a new tab means adding a button with the right attributes — no event listener registration, no DOM query, no state variable.

**Vanilla JavaScript** can do the same thing: add click handlers to tab buttons, toggle visibility of content panels. Straightforward, no library needed, and smaller than HTMX's ~14KB gzipped. But the virtual routing pattern — intercept a declarative request, resolve it from local data, swap the result — is reusable for future interactive features without writing custom JavaScript.

The tradeoff: HTMX is slightly overqualified today. If future features don't justify the dependency, replacing it with 30 lines of vanilla JS is straightforward — the tab buttons are already plain HTML.

## Why classic scripts instead of ES modules

Every JavaScript file loads via `<script src="...">` tags, not `import` statements. Intentional.

Docsify 4 requires its plugins to be registered synchronously during page load. The plugin array (`window.$docsify.plugins`) must be populated before Docsify initializes. ES modules execute asynchronously — by the time an `import` resolves, Docsify has already started and the registration window has closed.

Classic scripts execute in document order, synchronously. When `component-renderer.js` loads, it appends to the plugin array immediately, and Docsify picks it up on initialization.

That constraint is the whole reason.

The tradeoff is that all component functions live on `window` as globals. No private imports, no module scope, no tree-shaking. For a project with ~15 component files, this is manageable. For a project with hundreds of modules, it wouldn't be. DocsifyTemplate isn't that project.

## The "zero-config" philosophy and its boundaries

The goal is: duplicate this project, change the brand color in `:root`, write markdown, and have a working docs site. No `npm install`, no config file, no framework to learn.

This works because the framework makes opinionated choices — Docsify for routing, Tailwind for styling, HTMX for interactivity, YAML for component data. The benefit is speed: clone to working site in minutes.

The cost is flexibility. If you need server-side rendering, React components, or a different CSS framework, this is the wrong tool.

The boundaries of zero-config become visible when you want to:

- **Change the tab structure**: the Quick Start / Technical Reference split is hardcoded in the renderer. Adding a third tab means modifying `component-renderer-engine.js`.
- **Add a component with external dependencies**: every dependency loads via CDN script tag in `index.html`. No package manager, no bundler, no dependency resolution.
- **Export to PDF or LaTeX**: this is where Pandoc WASM enters — the one case where plain JavaScript cannot solve the problem, so the framework reaches for WebAssembly. See [WASM Capabilities](/content/guide/wasm-capabilities) for how the export pipeline works and what else WASM makes possible.

Zero-config isn't zero-limits. It's a deliberate narrowing of scope that makes the common case effortless and the uncommon case possible — even if that means more manual work.
