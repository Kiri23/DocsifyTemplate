---
name: Plugin System Design for DocsifyTemplate
description: Research and design spec for a Starlight-inspired plugin system — hooks, lifecycle, API surface, and examples. Ready to implement.
type: reference
---

# Plugin System Design

## Status: Designed, not yet implemented

## Starlight's Pattern (reference)

Starlight plugins hook into config + routes + translations via an integration API:
```js
starlight({ plugins: [starlightBlog(), starlightDocSearch()] })
```
Plugins receive a config object they can read/modify, plus lifecycle hooks.

## DocsifyTemplate Adaptation (zero-build-step)

### Config integration
```js
// docs/config.js
window.__docsifyTemplateConfig = {
  plugins: [
    { name: 'analytics', setup({ config, hooks }) { ... } },
    '/plugins/custom-search.js',  // Or load from file path
  ],
};
```

### Hook Lifecycle

| Hook | When | Use case |
|---|---|---|
| `onConfigReady` | After config merged + validated | Modify config, register components |
| `beforeRender` | Before Docsify renders markdown | Transform markdown, inject content |
| `afterRender` | After DOM is ready | Add UI, bind events, analytics |
| `onRouteChange` | Page navigation | Track views, update state |
| `onExport` | Before PDF/LaTeX export | Add watermarks, headers |
| `registerTool` | At chat init | Add custom AI tools to Gemma |
| `registerComponent` | At startup | Add new code fence components |

### Plugin shape
```js
// Inline object or default export from a .js file
{
  name: 'plugin-name',
  setup({ config, hooks }) {
    hooks.on('hookName', (context) => { ... });
  },
}
```

### Example: Reading Time Plugin
```js
export default {
  name: 'reading-time',
  setup({ hooks }) {
    hooks.on('afterRender', ({ content, container }) => {
      const words = content.split(/\s+/).length;
      const minutes = Math.ceil(words / 200);
      const badge = document.createElement('span');
      badge.className = 'reading-time';
      badge.textContent = `${minutes} min read`;
      container.querySelector('h1')?.after(badge);
    });
  },
};
```

### Example: Custom AI Tool Plugin
```js
export default {
  name: 'jira-lookup',
  setup({ hooks }) {
    hooks.on('registerTool', ({ addTool }) => {
      addTool({
        name: 'lookup_jira',
        description: 'Look up a Jira ticket by ID',
        parameters: { ticket: { type: 'string' } },
        execute: async ({ ticket }) => {
          const res = await fetch(`/api/jira/${ticket}`);
          return { success: true, message: await res.text() };
        },
      });
    });
  },
};
```

## Implementation Files Needed

1. `lib/core/plugin-engine.js` — hook registry, plugin loader, lifecycle runner
2. Update `lib/core/config.js` — accept `plugins` array, run `onConfigReady` after merge
3. Update `lib/adapters/docsify/renderer.js` — fire `beforeRender`, `afterRender`, `onRouteChange`
4. Update `lib/adapters/docsify/features/gemma-chat.js` — fire `registerTool`
5. Update `lib/adapters/docsify/features/latex-export.js` — fire `onExport`

## Key Design Decisions

- Plugins are plain JS objects, not classes — keeps it simple
- Hooks are synchronous by default, async via `hooks.onAsync()`
- Plugins run in array order — first registered, first called
- Plugins can modify config during `onConfigReady` only (frozen after)
- File-path plugins are dynamically imported at startup
- No plugin dependencies/ordering system yet (YAGNI until proven otherwise)

## Source reference
- Starlight source cloned to `~/Code/SourceCode/starlight/`
- Key files: `packages/starlight/utils/user-config.ts`, `schemas/components.ts`, `integrations/virtual-user-config.ts`
