# docs/theme

> Copied from prompt-bench `docs/theme/` at `c1c82ba` (PR Kiri23/prompt-bench#24). The only change:
> `themes/promptbench.css` also imports `themes/promptbench/components/`, the look of the
> components in `../components/`. Paths below (`docs/index.html`, `theme.test.ts`, `site/`) are
> prompt-bench's; here the colour rule is `../test/theme.test.mjs`.

The look and the moving parts of the docs site: a theme for Docsify 5 and five Docsify plugins. No
build step: the browser loads these files as they are.

```js
import { codeWindow, onThisPage, prevNext, sidebarSections, topNav } from "./theme/mod.js";

window.$docsify = {
  // ...
  plugins: [
    topNav({ brand, home, links }), // the bar on top; Docsify's left-edge three-dot handle toggles the sidebar
    sidebarSections(), // the sidebar in sections, the drawer closes after picking a page
    onThisPage({ title }), // the headings of the page on the right, from 1280 px
    prevNext({ previous, next }), // the pages before and after, in the order of _sidebar.md
    codeWindow({ labels }), // each code block in the landing's window, with a copy button
  ],
};
```

Every option can be left out. `links` is a list of `{ text, href }`; the one that points to the open
page is marked.

## Files

| File                               | What it is                                                            |
| ---------------------------------- | --------------------------------------------------------------------- |
| `tokens.css`                       | The colours, type and sizes. The landing imports it too.              |
| `themes/promptbench.css`           | The theme: the one file `docs/index.html` links. Only `@import`s.     |
| `themes/promptbench/variables.css` | Tokens → Docsify's variables.                                         |
| `themes/promptbench/layout.css`    | The layout like react.dev, the sidebar and the markdown.              |
| `themes/promptbench/plugins/*.css` | The look of each plugin, one file each: drop a plugin, drop its file. |
| `mod.js`                           | Exports the plugin factories.                                         |
| `store.js`                         | The signals the plugins share: page, headings, active one, pages.     |
| `plugins/*.js`                     | One plugin per file.                                                  |

## Why it has this shape

- **Extend Docsify, don't wrap it.** Each factory returns Docsify's own plugin, `(hook, vm) => {}`,
  and goes in the `plugins` list Docsify already has. Removing a piece is deleting its line; the
  others keep working, because each one reads the page itself (`readPage` in `store.js`) instead of
  waiting for another plugin.
- **A theme is one file.** `docs/index.html` loads Docsify's core CSS and one theme with one
  `<link>`. A new look is a new file in `themes/` and a changed line. The plugins only put classes
  on the page; the theme gives them their look.
- **Colours are named once.** Only `tokens.css` writes colour values. `theme.test.ts` at the root of
  the repo fails if one shows up in this folder (CSS or a plugin's inline style) or in
  `site/styles.css`, as hex, a colour function or a name; if `docs/index.html` stops loading the
  theme with a single `<link>`; and if a `prefers-reduced-motion` block does more than turn motion
  off.
- **Preact where there is state, plain DOM where there is none.** "On this page", prev/next and the
  copy button change while you read, so they are Preact components (with `htm`, no JSX) that read
  the signals in `store.js` and redraw by themselves. The top nav, the sections and the bar over a
  code block are drawn once, so they are plain DOM.
- **No build.** `docs/index.html` has an import map that points `preact`, `preact/hooks`,
  `@preact/signals` and `htm/preact` at fixed versions on esm.sh, with preact left out of the others
  so there is one copy of it. A module script runs before the deferred Docsify script, so the
  plugins are in the config when Docsify starts.
- **Ready to leave.** The folder imports only its own files and those four names. To move it to its
  own package, copy the folder and the import map.
