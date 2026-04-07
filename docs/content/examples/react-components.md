# Preact Components

Interactive components powered by Preact + HTM. No build step, no Babel, no bundler — just ES modules and tagged template literals.

## Side-by-Side: Classic vs Preact

Both versions render from the same YAML data. The classic version uses HTML string concatenation. The Preact version uses HTM with `useState` for expand/collapse.

### Classic (HTML strings)

```entity-schema
name: Appointment
parent: Entity
fields:
  - name: zohoLeadId
    type: string
    required: true
    description: Zoho CRM record identifier for the associated lead
  - name: status
    type: enum
    required: true
    description: Current lifecycle state of the appointment
    values: [Confirmed, In Progress, Completed, Missed, Cancelled]
  - name: scheduledDate
    type: datetime
    required: true
    description: When the appointment is scheduled
  - name: notes
    type: string
    description: Free-text notes from the field worker
```

### Preact (HTM + useState)

```entity-schema
name: Appointment
parent: Entity
fields:
  - name: zohoLeadId
    type: string
    required: true
    description: Zoho CRM record identifier for the associated lead
  - name: status
    type: enum
    required: true
    description: Current lifecycle state of the appointment
    values: [Confirmed, In Progress, Completed, Missed, Cancelled]
  - name: scheduledDate
    type: datetime
    required: true
    description: When the appointment is scheduled
  - name: notes
    type: string
    description: Free-text notes from the field worker
```

## Card Grid (Preact)

```card-grid
- title: Getting Started
  description: Learn the basics of the documentation system
  icon: "\U0001F680"
  href: "#/content/guide/getting-started"
- title: Components
  description: Interactive YAML-powered components
  icon: "\U0001F9E9"
  href: "#/content/guide/components-reference"
- title: Architecture
  description: How the framework is built
  icon: "\U0001F3D7"
  href: "#/content/guide/architecture"
```

## How It Works

The authoring experience is identical — YAML in a code fence:

~~~markdown
```entity-schema
name: User
fields:
  - name: email
    type: string
    required: true
```
~~~

Under the hood:

1. Docsify renders the fence as `<pre><code class="lang-r-entity-schema">`
2. Engine regex matches, strips the `r-` prefix → `EntitySchema`
3. Creates a placeholder `<div>` in the HTML
4. In `doneEach`, `preact.render()` mounts the component into the placeholder
5. The component uses `useState` for interactivity — no inline `onclick` strings

## What Changed from React + Babel

| Before | After |
|---|---|
| React 18 UMD (45KB) | Preact (4KB) |
| Babel standalone (800KB) | HTM (600 bytes) |
| `<script type="text/babel">` (async, eval) | `<script type="module">` (native, scoped) |
| IIFE required (var leak) | ES modules (scoped by default) |
| `.jsx` files | `.js` files with tagged templates |

Component files use real `import/export`:

```javascript
// entity-schema.js — standard ES module imports
import { html } from 'htm/preact';
import { useState } from 'preact/hooks';
import { DarkContainer, HeaderBar, TypeBadge } from './shared.js';

const EntitySchema = ({ data }) => {
  return html`
    <${DarkContainer}>
      <${HeaderBar} title=${data.name} />
      ...
    <//>
  `;
};
```

No IIFE. No Babel. No eval. Just JavaScript.
