# Components — Patterns

## Creating a New Component

### Step 1: Define the YAML schema

Decide what data shape your component needs. Keep it flat when possible.

```yaml
# Good: flat, predictable
name: "Title"
items:
  - label: "Item 1"
    value: "Description"

# Avoid: deeply nested
config:
  display:
    items:
      nested:
        value: "too deep"
```

### Step 2: Write the component function

Create `docs/components/my-component.js`:

```javascript
window.MyComponent = function(data) {
  const id = Math.random().toString(36).substr(2, 9);

  const items = (data.items || []).map(item => `
    <div class="px-4 py-2.5 hover:bg-gray-800/40 transition-colors">
      <span class="text-white text-sm font-medium">${item.label}</span>
      <span class="text-gray-400 text-sm ml-2">${item.value}</span>
    </div>
  `).join('');

  return `
    <div class="rounded-xl overflow-hidden border border-gray-700/60 bg-gray-900 my-5 shadow-md">
      <div class="bg-gray-800/80 px-4 py-3 border-b border-gray-700/60">
        <span class="text-white font-semibold text-sm">${data.name || 'Untitled'}</span>
      </div>
      <div class="divide-y divide-gray-700/50">
        ${items}
      </div>
    </div>
  `;
};
```

### Step 3: Register

1. Add `<script src="components/my-component.js"></script>` to `docs/index.html`
2. Add `'my-component'` to `COMPONENT_REGISTRY` in `component-renderer.js`

### Step 4: Test

Write a test page with the YAML code fence and verify rendering.

## Interactivity Patterns

### Pattern 1: Inline onclick (simple toggles)

Best for: collapsible sections within a single component instance.

```javascript
const detailId = Math.random().toString(36).substr(2, 9);

return `
  <div onclick="(() => {
    const el = document.getElementById('${detailId}');
    el.classList.toggle('hidden');
  })()">Click me</div>
  <div id="${detailId}" class="hidden">Detail content</div>
`;
```

### Pattern 2: Global handler (complex interactions)

Best for: search, filtering, multi-element coordination.

```javascript
// Define once at top of component file
window._mySearch = function(inputId, containerId) {
  const query = document.getElementById(inputId).value.toLowerCase();
  const container = document.getElementById(containerId);
  container.querySelectorAll('[data-searchable]').forEach(el => {
    el.style.display = el.dataset.searchable.includes(query) ? '' : 'none';
  });
};

window.MyComponent = function(data) {
  const searchId = Math.random().toString(36).substr(2, 9);
  const containerId = Math.random().toString(36).substr(2, 9);

  return `
    <input id="${searchId}" oninput="_mySearch('${searchId}', '${containerId}')"
           class="..." placeholder="Search...">
    <div id="${containerId}">
      ${data.items.map(i => `<div data-searchable="${i.name.toLowerCase()}">${i.name}</div>`).join('')}
    </div>
  `;
};
```

### Pattern 3: Chevron rotation (visual feedback)

```javascript
const chevronId = Math.random().toString(36).substr(2, 9);

return `
  <svg id="${chevronId}" class="w-4 h-4 text-gray-500 transition-transform duration-200">
    <path d="M9 5l7 7-7 7" .../>
  </svg>
`;

// In toggle handler:
// document.getElementById('${chevronId}').classList.toggle('rotate-90');
```

## Component Composition

Components are standalone — they don't call each other. Composition happens at the content level by placing multiple code fences in the same markdown page.

Exception: `side-by-side` can render other components via its `component` type:

```yaml
left:
  type: component
  component: entity-schema
  data:
    name: "User"
    fields:
      - name: id
        type: string
        required: true
        description: "Unique identifier"
right:
  type: code
  language: json
  content: '{"id": "abc123"}'
```

## Choosing the Right Component

```
Your data is...
├─ A data model with fields/types → entity-schema
├─ An API endpoint with params/response → api-endpoint
├─ A state machine with transitions → status-flow
├─ A categorized reference list → directive-table
├─ A workflow step (sync/async) → step-type
├─ Config/code that needs annotations → config-example
├─ Navigation links with descriptions → card-grid
├─ Two things to compare → side-by-side
├─ A process/architecture diagram → mermaid (not a registry component)
└─ None of the above → plain markdown or FLAG for new component
```

## See Also

- `references/components/api.md` — complete YAML schemas
- `references/components/gotchas.md` — common mistakes when building components
