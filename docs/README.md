# DocsifyTemplate

<div class="hero-tagline">

Write YAML in markdown. Get interactive docs. No build step.

</div>

<div class="hero-subtext">

A documentation framework powered by Docsify with 10 data-driven components. Clone it, write markdown, ship docs — no bundler, no React, no compilation.

</div>

## How It Works

Write a component name as your code fence language, fill it with YAML, and the plugin renders it as interactive HTML:

```side-by-side
left:
  title: "What you write"
  language: markdown
  content: |
    ```card-grid
    - title: "First Card"
      description: "Rendered from YAML."
      icon: "1"
      href: "#/"
    - title: "Second Card"
      description: "No JavaScript needed."
      icon: "2"
      href: "#/"
    ```
right:
  title: "What you get"
  component: card-grid
  data:
    - title: "First Card"
      description: "Rendered from YAML."
      icon: "1"
      href: "#/"
    - title: "Second Card"
      description: "No JavaScript needed."
      icon: "2"
      href: "#/"
```

## Features

```card-grid
- title: "10 Components"
  description: "Cards, API endpoints, status flows, schemas, config examples, and more — all from YAML."
  icon: "< />"
  href: "#/content/guide/components-reference"
- title: "Audience Tabs"
  description: "Split any page into Quick Start and Technical Reference tabs with one frontmatter flag."
  icon: "||"
  href: "#/content/guide/architecture"
- title: "Diagrams"
  description: "Mermaid flowcharts, sequence diagrams, and entity relationships — inline in markdown."
  icon: "~~~"
  href: "#/content/examples/component-showcase"
- title: "Zero Config"
  description: "No webpack, no Vite, no build. Edit markdown, refresh browser, done."
  icon: "0"
  href: "#/content/guide/getting-started"
```

## Quick Start

```bash
git clone <your-repo-url> my-docs && cd my-docs
npm install
npm run serve
# → http://localhost:3000
```

Then open `docs/README.md` and start writing. See the [Getting Started guide](/content/guide/getting-started) for your first page and component.

## Documentation

```card-grid
- title: "Getting Started"
  description: "Install, run, and write your first page and component."
  icon: ">"
  href: "#/content/guide/getting-started"
- title: "Components Reference"
  description: "Full API for all 10 components with YAML schemas and examples."
  icon: "{ }"
  href: "#/content/guide/components-reference"
- title: "Creating Components"
  description: "Build your own components — step-by-step guide with patterns and debugging tips."
  icon: "+"
  href: "#/content/guide/creating-components"
- title: "Architecture"
  description: "How the plugin lifecycle, HTMX virtual routing, and component pipeline work."
  icon: "[]"
  href: "#/content/guide/architecture"
```

See the [Component Showcase](/content/examples/component-showcase) for live rendered examples of every component.
