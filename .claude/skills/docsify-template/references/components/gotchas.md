# Components — Gotchas

## Component Shows Raw YAML Instead of Rendered HTML

**Cause 1: Not in COMPONENT_REGISTRY**

```
Wrong: Component JS loaded but not added to the array
Right: Added to BOTH index.html script tag AND COMPONENT_REGISTRY array
```

**Cause 2: Name mismatch**

```
Wrong: ```my_component   (underscore)
Right: ```my-component   (hyphen, matches registry entry)
```

**Cause 3: Function name doesn't match kebab→PascalCase conversion**

```
Wrong: window.Mycomponent = function(data)...
Right: window.MyComponent = function(data)...
```

## YAML Escaping Issues

**Colons in values must be quoted:**

```yaml
# Wrong — YAML parser breaks
description: Status: active or inactive

# Right
description: "Status: active or inactive"
```

**Special characters need quoting:**

```yaml
# Wrong
pattern: {required}

# Right
pattern: "{required}"
```

**Multiline code uses `|` block scalar:**

```yaml
code: |
  function hello() {
    return "world";
  }
```

**Arrays in values:**

```yaml
# Both work
values: ["a", "b", "c"]
values:
  - a
  - b
  - c
```

## card-grid Is the ONLY Array-Based Component

Every other component expects an object at the top level. `card-grid` expects an array.

```yaml
# card-grid — array at root
- title: "Card 1"
  description: "..."
- title: "Card 2"
  description: "..."

# Everything else — object at root
name: "My Entity"
fields:
  - name: "id"
```

If you pass an array to a non-card-grid component, you'll get undefined errors. If you pass an object to card-grid, you'll get no cards rendered.

## Collapsible IDs Must Be Unique Per Page

If you hardcode IDs, multiple instances of the same component on one page will break.

```javascript
// Wrong
const id = 'detail-panel';

// Right
const id = Math.random().toString(36).substr(2, 9);
```

## HTML Entities in YAML Values

HTML in YAML values is rendered as-is (not escaped). This is by design — components return raw HTML. But be careful with user-facing data:

```yaml
# This will render as HTML
description: "Use <code>fetch()</code> to call the API"

# This might break layout
description: "Compare a < b and c > d"  # Creates broken tags
# Fix:
description: "Compare a &lt; b and c &gt; d"
```

## Component Functions Must Be Synchronous

Components are called during the `afterEach` hook and must return an HTML string immediately. No async, no fetch, no promises.

```javascript
// Wrong
window.MyComponent = async function(data) {
  const result = await fetch('/api/data');
  return `<div>${result}</div>`;
};

// Right
window.MyComponent = function(data) {
  return `<div>${data.value}</div>`;
};
```

## Mermaid Is NOT a Registered Component

Mermaid diagrams use standard ` ```mermaid ` fences and are rendered by the Mermaid library directly in `doneEach`, not through the component pipeline.

## Limits

| Item | Limit | Why |
|------|-------|-----|
| directive-table entries | ~200 | Search performance degrades |
| status-flow states | ~10 | Layout breaks, arrows overlap |
| config-example lines | ~50 | Annotation panel gets unwieldy |
| card-grid items | ~12 | Grid wrapping looks odd beyond 4 rows |
| Components per page | No hard limit | But 2-3 per section for readability |
| Mermaid diagrams per page | 2-3 | Re-rendering cost in doneEach |

## See Also

- `references/components/configuration.md` — registration details
- `references/authoring/gotchas.md` — content-level rendering issues
