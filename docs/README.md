# DocsifyTemplate

A zero-build-step interactive documentation framework powered by **Docsify** with custom data-driven components. Write YAML in markdown code fences, get interactive HTML — no bundler, no compilation, no React.

## Quick Start

```bash
git clone <your-repo-url> my-docs && cd my-docs
npm install
npm run serve
# → http://localhost:3000
```

## Features

```card-grid
- title: "Data-Driven Components"
  description: "10 reusable components rendered from YAML code fences — no build step required."
  icon: "< />"
  href: "#/content/guide/components-reference"
- title: "Tab Navigation"
  description: "Split pages into Quick Start / Technical tabs using YAML frontmatter."
  icon: "||"
  href: "#/content/guide/architecture"
- title: "Mermaid Diagrams"
  description: "Flowcharts, sequence diagrams, and more — rendered inline from markdown."
  icon: "~~~"
  href: "#/content/examples/component-showcase"
- title: "Full-Text Search"
  description: "Built-in Docsify search across all your documentation pages."
  icon: "? /"
  href: "#/"
```

## How It Works

Write markdown with YAML code fences. The component renderer plugin transforms them into interactive HTML:

````markdown
```card-grid
- title: "My Card"
  description: "A description"
  icon: "1"
  href: "#/some-page"
```
````

## Where to Go

| I want to... | Go to |
|---|---|
| Set up the project and write my first page | [Getting Started](/content/guide/getting-started) |
| See what components are available | [Components Reference](/content/guide/components-reference) |
| See live rendered examples | [Component Showcase](/content/examples/component-showcase) |
| Build my own component | [Creating Components](/content/guide/creating-components) |
| Understand how the framework works internally | [Architecture](/content/guide/architecture) |
| Add tabs to a page | [Getting Started → Add a Tabbed Page](/content/guide/getting-started) |
| Look up a component's YAML schema | [Components Reference → Technical Reference](/content/guide/components-reference) |

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
