---
type: guide
category: components
tags: [reference, components, api]
---

# Components Reference

## Quick Start

DocsifyTemplate includes 10 components split into two categories:

**Registry components** (7) — used as YAML code fences in markdown. Write YAML, get interactive HTML:

````markdown
```component-name
key: value
nested:
  - item: one
```
````

**Utility components** (3) — used programmatically by the framework or via HTML directives. Not available as YAML code fences.

See the [Component Showcase](/content/examples/component-showcase) for live rendered examples of every component.

---

### Navigation

```card-grid
- title: "Card Grid"
  description: "Responsive linked cards for navigation and feature highlights."
  icon: "grid"
  href: "#/content/guide/components-reference"
```

Use `card-grid` to create navigation cards, feature lists, or landing page layouts:

````yaml
```card-grid
- title: "Card Title"
  description: "What this card is about."
  icon: "any text or emoji"
  href: "#/some-page"
```
````

All fields are optional. Cards link to `href` on click. The grid is responsive: 1 column on mobile, 2 on medium, 3 on large screens.

---

### Data Display

#### Entity Schema

Document data models with expandable field details. Good for database entities, API models, or any structured data:

````yaml
```entity-schema
name: "User"
parent: "BaseEntity"
fields:
  - name: "email"
    type: "string"
    required: true
    description: "Must be unique."
    values: ["admin", "editor", "viewer"]
```
````

Click a field row to expand its description and enum values.

#### Config Example

Annotated code blocks with numbered callouts. Use for configuration files, code samples, or anything where you need to explain specific lines:

````yaml
```config-example
title: "App Config"
language: "json"
code: |
  {
    "port": 3000,
    "env": "production"
  }
annotations:
  - line: 2
    text: "Port must be between 1024 and 65535."
  - line: 3
    text: "Use 'development' for debug logging."
```
````

Click the numbered badges to toggle annotation panels. Only one annotation shows at a time.

---

### API Documentation

#### API Endpoint

Document REST endpoints with color-coded method badges and collapsible parameter/response sections:

````yaml
```api-endpoint
method: "POST"
path: "/api/v1/users"
description: "Create a new user"
params:
  - name: "email"
    type: "string"
    required: true
response: |
  { "id": "usr_123", "email": "user@example.com" }
```
````

Method badge colors: GET = blue, POST = green, PUT = yellow, PATCH = orange, DELETE = red. Click the header to expand parameters and response.

#### Step Type

Document workflow step types with sync/async badges and collapsible config examples:

````yaml
```step-type
name: "SendNotification"
category: "async"
description: "Sends notifications via email, SMS, or push."
properties:
  - name: "channel"
    type: "enum"
    required: true
    description: "Delivery channel"
example: |
  { "type": "SendNotification", "channel": "email" }
```
````

Sync steps get a green badge, async gets blue. Click "Config Example" to expand the code block.

---

### Reference

#### Directive Table

Searchable, categorized reference tables. Good for configuration options, CLI flags, DSL directives, or any categorized key-value reference:

````yaml
```directive-table
title: "Configuration Options"
searchable: true
categories:
  - name: "Display"
    directives:
      - name: "ui:widget"
        type: "string"
        description: "Override the default widget"
        default: "text"
        example: '"ui:widget": "textarea"'
        details: "Supported: text, textarea, select..."
```
````

Search filters by name and description. Categories collapse/expand. Click a directive row to see its example and details. "Expand All" toggles all categories.

#### Status Flow

Visualize state machines with clickable state buttons and transition details:

````yaml
```status-flow
states:
  - id: "draft"
    label: "Draft"
    trigger: "User creates a record"
    next: ["pending"]
    effects: ["Validate required fields"]
  - id: "pending"
    label: "Pending Review"
    trigger: "User submits"
    next: ["approved", "rejected"]
    effects: ["Notify reviewers"]
```
````

Click a state button to see its trigger, next states, and side effects. States are connected with arrows and cycle through 6 colors.

## Technical Reference

### Registry Components — Full Schema

These 7 components are registered in `COMPONENT_REGISTRY` and available as YAML code fences.

#### card-grid

Renders as `window.CardGrid(data)`. Input is an **array** (not an object).

| Key | Type | Required | Description |
|---|---|---|---|
| `title` | string | no | Card heading |
| `description` | string | no | Card body text |
| `icon` | string | no | Text/emoji shown above the title |
| `href` | string | no | Link target (defaults to `#`) |

**Renders:** Responsive grid — `grid-cols-1` → `md:grid-cols-2` → `lg:grid-cols-3`. Each card is an `<a>` tag.

---

#### entity-schema

Renders as `window.EntitySchema(data)`. Input is an **object**.

| Key | Type | Required | Description |
|---|---|---|---|
| `name` | string | no | Entity name (defaults to "Entity") |
| `parent` | string | no | Parent entity name (shows "extends Parent") |
| `fields` | array | no | Field definitions |

**Fields array items:**

| Key | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Field name (shown in monospace) |
| `type` | string | no | Type badge (defaults to "any") |
| `required` | boolean | no | Shows red "required" badge |
| `description` | string | no | Shown in expandable detail panel |
| `values` | array | no | Enum values (shown as cyan badges) |

**Renders:** Dark card with expandable rows. Click row → toggle description + enum values.

---

#### api-endpoint

Renders as `window.ApiEndpoint(data)`. Input is an **object**.

| Key | Type | Required | Description |
|---|---|---|---|
| `method` | string | no | HTTP method: GET, POST, PUT, PATCH, DELETE (defaults to "GET") |
| `path` | string | no | Endpoint path (defaults to "/") |
| `description` | string | no | Short description next to the path |
| `params` | array | no | Parameter definitions |
| `response` | string | no | Response body (rendered as code block) |

**Params array items:**

| Key | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Parameter name |
| `type` | string | no | Parameter type (defaults to "any") |
| `required` | boolean | no | Shows "required" or "optional" label |

**Renders:** Collapsible card. Header shows method badge (color-coded) + path. Click → toggle params table + response code.

---

#### status-flow

Renders as `window.StatusFlow(data)`. Input is an **object**.

| Key | Type | Required | Description |
|---|---|---|---|
| `states` | array | yes | State definitions |

**States array items:**

| Key | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | Unique state identifier |
| `label` | string | no | Display label (falls back to `id`) |
| `trigger` | string | no | What causes entry into this state |
| `next` | array | no | Array of state IDs this can transition to |
| `effects` | array | no | Side effects that occur on entry |

**Renders:** Horizontal flow of pill buttons with arrows. Click state → toggle detail panel (trigger, next states, effects). Cycles through 6 colors.

---

#### directive-table

Renders as `window.DirectiveTable(data)`. Input is an **object**.

| Key | Type | Required | Description |
|---|---|---|---|
| `title` | string | no | Table heading (defaults to "Directives") |
| `searchable` | boolean | no | Show search input (defaults to `true`) |
| `categories` | array | no | Category groups |

**Categories array items:**

| Key | Type | Required | Description |
|---|---|---|---|
| `name` | string | no | Category heading |
| `directives` | array | no | Directive definitions |

**Directives array items:**

| Key | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Directive name (monospace) |
| `type` | string | no | Type badge |
| `description` | string | no | Short description |
| `default` | any | no | Default value badge |
| `example` | string | no | Code example (shown in expandable panel) |
| `details` | string | no | Extended description (shown in expandable panel) |

**Renders:** Searchable table with collapsible categories. Search filters by name + description. Max height 600px with scroll.

---

#### step-type

Renders as `window.StepType(data)`. Input is an **object**.

| Key | Type | Required | Description |
|---|---|---|---|
| `name` | string | no | Step name (defaults to "Step") |
| `category` | string | no | `"sync"` or `"async"` (defaults to "sync") |
| `description` | string | no | Step description |
| `properties` | array | no | Property definitions |
| `example` | string | no | JSON config example (collapsible) |

**Properties array items:**

| Key | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Property name (monospace) |
| `type` | string | no | Type badge |
| `required` | boolean | no | Shows red "required" badge |
| `description` | string | no | Property description |

**Renders:** Card with sync (green) or async (blue) badge. Properties table + collapsible "Config Example" section.

---

#### config-example

Renders as `window.ConfigExample(data)`. Input is an **object**.

| Key | Type | Required | Description |
|---|---|---|---|
| `title` | string | no | Title bar text |
| `language` | string | no | Code language for syntax highlighting (defaults to "json") |
| `code` | string | yes | The code content (use YAML `|` for multiline) |
| `annotations` | array | no | Line annotations |

**Annotations array items:**

| Key | Type | Required | Description |
|---|---|---|---|
| `line` | number | yes | Line number (1-indexed) |
| `text` | string | yes | Annotation text |

**Renders:** Code block with line numbers. Annotated lines get a cyan background + numbered badge. Click badge → toggle annotation panel. Only one annotation visible at a time.

---

### Utility Components

These 3 components are **not** in the registry and cannot be used as YAML code fences. They serve different roles in the framework.

#### tabs

**File:** `components/tabs.js` — Registers `window.Tabs(tabs, targetId)`

Used internally by `component-renderer.js` to generate tab navigation for pages with Quick Start / Technical Reference sections. Not meant to be called from markdown.

**API:**
```javascript
window.Tabs([
  { label: 'Quick Start', href: '/api/switch/quick-start', active: true },
  { label: 'Technical', href: '/api/switch/technical', active: false }
], 'tab-content')
```

Generates `<button>` elements with HTMX attributes (`hx-get`, `hx-target`, `hx-swap`). See [Architecture](/content/guide/architecture) for how the virtual routing works.

#### code-block

**File:** `components/code-block.js` — Registers `window.CodeBlock(props)` and `window.copyToClipboard(button)`

A syntax-highlighted code block with a copy-to-clipboard button. Can be called from JavaScript but is not a YAML code fence component.

**API:**
```javascript
window.CodeBlock({
  code: 'const x = 1;',
  language: 'javascript',
  title: 'Example'
})
```

The copy button unescapes HTML entities before copying to clipboard.

#### region-toggle

**File:** `components/region-toggle.js` — Registers `window.processRegionDirectives()`

A DOM-level directive processor that creates toggle panels from headings. Uses HTML `data-region` attributes instead of YAML code fences.

**Usage in markdown:**
```html
<div data-region="PR=Puerto Rico, FL=Florida"></div>

### Puerto Rico
Content for PR...

### Florida
Content for FL...
```

The directive scans sibling headings, matches them to region labels, and replaces them with a button bar + panel switcher. Runs automatically in the `doneEach` hook.

> This component follows a different pattern than the others — it processes DOM directives rather than rendering from YAML.
