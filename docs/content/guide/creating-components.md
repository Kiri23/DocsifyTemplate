---
type: guide
category: components
tags: [guide, components, custom]
---

# Creating Components

## Quick Start

A component is a JavaScript function that receives parsed YAML and returns an HTML string.

### 1. Create the JS file

Create `packages/docs-engine/src/components/my-component.js`:

```javascript
window.MyComponent = function MyComponent(data) {
  var title = data.title || 'Default Title';
  var items = data.items || [];

  var listHtml = items.map(function(item) {
    return '<li class="text-gray-300 py-1">' + item + '</li>';
  }).join('');

  return '<div class="rounded-lg border border-gray-700 bg-gray-900 my-4 p-4">' +
    '<h3 class="text-white font-bold mb-2">' + title + '</h3>' +
    '<ul>' + listHtml + '</ul>' +
  '</div>';
};
```

### 2. Register it

**Export it from `packages/docs-engine/src/components/index.js`** by adding it to `defaultComponents`:

```javascript
export { MyComponent } from './my-component.js';
```

**Add the name to `packages/docs-engine/src/core/markdown-utils.js`** in the `COMPONENT_REGISTRY` array:

```javascript
export const COMPONENT_REGISTRY = [
  'entity-schema', 'api-endpoint', 'status-flow',
  'directive-table', 'step-type', 'config-example',
  'card-grid', 'my-component'  // ← add here
];
```

### 3. Use it in markdown

````yaml
```my-component
title: "Shopping List"
items:
  - Milk
  - Eggs
  - Bread
```
````

Refresh the browser. Done.

### The Rules

1. **Function name = PascalCase of the kebab-case code fence name.** `my-component` → `window.MyComponent`. The renderer does this conversion automatically.

2. **Input is always a parsed YAML object.** The full js-yaml library parses the code fence content, so you get strings, numbers, booleans, arrays, and nested objects.

3. **Output is always an HTML string.** Return it, don't append to the DOM.

4. **`var` or `const`/`let` — your choice.** The existing components use ES5-style `var` and `function` but modern syntax works fine in current browsers. Be consistent within a file.

5. **Style with Tailwind classes.** Tailwind v4 runs in the browser — all utility classes are available without a build step.

6. **Register in two places.** Both `index.html` (script tag) and `component-renderer.js` (registry array). Miss either one and it won't work.

## Technical Reference

### How the Renderer Finds Your Component

When Docsify renders markdown, code fences become:

```html
<pre><code class="lang-my-component">YAML content here</code></pre>
```

The `component-renderer.js` plugin scans the rendered HTML for `<code>` elements whose `class` matches a registered component name. When it finds one:

1. Extracts the text content
2. Parses it with `jsyaml.load()`
3. Converts `my-component` → `MyComponent`
4. Calls `window.MyComponent(parsedData)`
5. Replaces the entire `<pre>` block with the returned HTML

If the function throws or returns nothing, the original code fence stays visible (which makes debugging easy — you'll see the raw YAML).

### Making Components Interactive

For click handlers, toggles, or any DOM interaction, you have two options:

**Inline onclick (simple):**

```javascript
var id = 'mc-' + Math.random().toString(36).substr(2, 6);

return '<div>' +
  '<button onclick="document.getElementById(\'' + id + '\').classList.toggle(\'hidden\')">' +
    'Toggle' +
  '</button>' +
  '<div id="' + id + '" class="hidden">Hidden content</div>' +
'</div>';
```

Generate unique IDs with `Math.random()` to avoid collisions when the same component is used multiple times on a page.

**Global handler (complex interactions):**

```javascript
// At the bottom of your component file
window._myComponentHandler = function(groupId, index) {
  // DOM manipulation here
};
```

Then reference it in your HTML: `onclick="window._myComponentHandler('id', 0)"`.

See `status-flow.js` (`window._sfToggle`) or `directive-table.js` (`window._dtSearch`, `window._dtToggleAll`) for real examples of this pattern.

### Patterns from Existing Components

**Collapsible sections** (used by entity-schema, api-endpoint, directive-table, step-type):

```javascript
var id = 'prefix-' + Math.random().toString(36).substr(2, 6);

// Clickable header
'<div onclick="var el=document.getElementById(\'' + id + '\');' +
  'el.classList.toggle(\'hidden\');' +
  'this.querySelector(\'.chevron\').classList.toggle(\'rotate-90\')">' +
  '<span class="chevron text-gray-500 text-xs transition-transform duration-200">&#9654;</span>' +
  'Header text' +
'</div>' +
// Collapsible body
'<div id="' + id + '" class="hidden">Content</div>'
```

**Type/status badges** (used across multiple components):

```javascript
// Type badge
'<span class="inline-block bg-gray-600 text-gray-200 text-xs px-2 py-0.5 rounded-full">' + type + '</span>'

// Required badge
'<span class="inline-block bg-red-500/80 text-white text-xs px-2 py-0.5 rounded-full">required</span>'

// Status badge (green/blue)
var color = category === 'async' ? 'bg-blue-500/80' : 'bg-green-500/80';
'<span class="inline-block text-xs px-2 py-0.5 rounded-full text-white ' + color + '">' + label + '</span>'
```

**Dark card wrapper** (consistent look across components):

```javascript
'<div class="rounded-lg overflow-hidden border border-gray-700 bg-gray-900 my-4 shadow-lg">' +
  // Header
  '<div class="bg-gray-800 px-4 py-3 border-b border-gray-700">' +
    '<span class="font-bold text-white text-base">Title</span>' +
  '</div>' +
  // Body
  '<div class="px-4 py-3">' + content + '</div>' +
'</div>'
```

### Escaping HTML in User Content

If your component displays user-provided content that might contain HTML characters, escape it:

```javascript
var escaped = value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');
```

See `config-example.js` and `api-endpoint.js` for examples. This prevents broken rendering and XSS if the YAML contains angle brackets.

### Debugging

- **Component doesn't render?** Check both registration points (index.html + COMPONENT_REGISTRY).
- **See raw YAML instead of HTML?** Your function is throwing. Open browser console for the error.
- **Styles not applying?** Make sure you're using Tailwind classes that exist. The browser build includes all utilities, but custom classes need to be in `theme.css`.
- **Multiple instances collide?** You're probably reusing the same DOM ID. Use the `Math.random()` pattern for unique IDs.
- **Click handlers not working?** Check quote escaping in inline `onclick` strings. This is the most common source of bugs.
