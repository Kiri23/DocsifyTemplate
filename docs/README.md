# Welcome

This is a zero-build-step interactive documentation site powered by **Docsify** with custom data-driven components.

## Getting Started

```bash
npm run serve
# → http://localhost:3000
```

## Features

```card-grid
- title: "Data-Driven Components"
  description: "10 reusable components rendered from YAML code fences — no build step required."
  icon: "🧩"
  href: "#/content/examples/component-showcase"
- title: "Tab Navigation"
  description: "Split pages into Quick Start / Technical tabs using YAML frontmatter."
  icon: "📑"
  href: "#/content/examples/component-showcase"
- title: "Mermaid Diagrams"
  description: "Flowcharts, sequence diagrams, and more — rendered inline from markdown."
  icon: "📊"
  href: "#/content/examples/component-showcase"
- title: "Full-Text Search"
  description: "Built-in Docsify search across all your documentation pages."
  icon: "🔍"
  href: "#/"
```

## How It Works

Write markdown with YAML code fences. The component renderer plugin transforms them into interactive HTML:

````markdown
```card-grid
- title: "My Card"
  description: "A description"
  icon: "🎯"
  href: "#/some-page"
```
````

See the [Component Showcase](/content/examples/component-showcase) for live examples of every component.
