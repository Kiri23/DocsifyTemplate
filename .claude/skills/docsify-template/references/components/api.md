# Components — API

Complete YAML schemas and HTML structure for all registered components.

## YAML Schemas

### entity-schema

```yaml
name: "EntityName"        # Required
parent: "ParentEntity"    # Optional
fields:
  - name: "fieldName"     # Required
    type: "string"        # Required
    required: true        # Optional, default false
    description: "What this field does"  # Required
    values: ["a", "b"]   # Optional, enum values
```

### api-endpoint

```yaml
method: "GET"             # GET | POST | PUT | PATCH | DELETE
path: "/api/v1/resource"  # Required
description: "What this endpoint does"
params:
  - name: "id"
    type: "string"
    required: true
    description: "Resource identifier"
response: |
  {
    "id": "abc123",
    "status": "active"
  }
```

Method badge colors: GET=blue, POST=green, PUT=amber, PATCH=cyan, DELETE=red.

### status-flow

```yaml
states:
  - id: "draft"          # Required, unique
    label: "Draft"       # Required, display text
    trigger: "User creates" # What causes entry
    next: ["review"]     # Array of valid next state IDs
    effects: "Notification sent" # Side effects description
```

### directive-table

```yaml
title: "Reference Title"
searchable: true          # Enables search input
categories:
  - name: "Category Name"
    directives:
      - name: "directive-name"
        description: "What it does"
        example: "Usage example"  # Optional, shown in collapsible
```

### step-type

```yaml
name: "Step Name"
category: "sync"          # sync | async
description: "What this step does"
properties:
  - name: "input"
    type: "string"
    description: "Input data"
example: |
  // Code example shown in collapsible
  doStep({ input: "data" });
```

### config-example

```yaml
title: "Configuration Title"
language: "json"          # Prism language for highlighting
code: |
  {
    "key": "value",
    "port": 3000
  }
annotations:
  - line: 2
    text: "Set your API key here"
  - line: 3
    text: "Default port, change if needed"
```

### card-grid

**UNIQUE: Top-level is an array, not an object.**

```yaml
- title: "Card Title"
  description: "Card description"
  icon: "emoji-or-text"   # Displayed in icon circle
  href: "#/content/page"  # Link destination
```

### side-by-side

```yaml
left:
  type: "text"            # text | code | component
  content: "Plain text or markdown"
  # For code type:
  # language: "javascript"
  # content: "const x = 1;"
  # For component type:
  # component: "entity-schema"
  # data: { name: "Entity", fields: [...] }
right:
  type: "code"
  language: "json"
  content: '{"key": "value"}'
```

## HTML Structure Patterns

All dark components share this structure:

```html
<!-- Container -->
<div class="rounded-xl overflow-hidden border border-gray-700/60 bg-gray-900 my-5 shadow-md">
  <!-- Header -->
  <div class="bg-gray-800/80 px-4 py-3 border-b border-gray-700/60 flex items-center justify-between">
    <span class="text-white font-semibold text-sm">Title</span>
    <span class="badge">Badge</span>
  </div>
  <!-- Rows -->
  <div class="divide-y divide-gray-700/50">
    <div class="px-4 py-2.5 hover:bg-gray-800/40 transition-colors cursor-pointer"
         onclick="toggleDetail(id)">
      <!-- Row content -->
    </div>
    <!-- Collapsible detail -->
    <div id="detail-{id}" class="hidden px-4 py-2.5 bg-gray-800/40 border-t border-gray-700/50">
      <!-- Detail content -->
    </div>
  </div>
</div>
```

### Badge Patterns

```html
<!-- Type badge -->
<span class="text-xs px-2.5 py-0.5 rounded-md bg-gray-700 text-gray-300 font-mono">string</span>

<!-- Required badge -->
<span class="text-xs px-2.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30">required</span>

<!-- Sync badge -->
<span class="text-xs px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">sync</span>

<!-- Async badge -->
<span class="text-xs px-2.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30">async</span>

<!-- API method badges -->
<span class="... bg-blue-500/20 text-blue-300">GET</span>
<span class="... bg-emerald-500/20 text-emerald-300">POST</span>
<span class="... bg-amber-500/20 text-amber-300">PUT</span>
<span class="... bg-cyan-500/20 text-cyan-300">PATCH</span>
<span class="... bg-red-500/20 text-red-300">DELETE</span>
```

### Collapsible Pattern

```javascript
// Generate unique ID
const id = Math.random().toString(36).substr(2, 9);

// Toggle function (inline or global)
onclick="(() => {
  const el = document.getElementById('detail-${id}');
  const chevron = document.getElementById('chevron-${id}');
  el.classList.toggle('hidden');
  chevron.classList.toggle('rotate-90');
})()"
```

## See Also

- `references/components/patterns.md` — component creation workflow
- `references/styling/api.md` — CSS custom properties reference
