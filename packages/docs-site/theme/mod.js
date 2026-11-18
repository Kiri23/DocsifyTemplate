// The theme's plugins. Each one is a factory that returns a Docsify plugin, the `(hook, vm)` function
// that goes in the `plugins` list of `window.$docsify`.
export { topNav } from "./plugins/top-nav.js";
export { sidebarSections } from "./plugins/sidebar-sections.js";
export { onThisPage } from "./plugins/on-this-page.js";
export { prevNext } from "./plugins/prev-next.js";
export { codeWindow } from "./plugins/code-window.js";
