// The whole docs site in one line, for a repo that only has Markdown. The repo's index.html says
// its name in Docsify's own config and loads this file:
//
//   <div id="app"></div>
//   <script>window.$docsify = { name: "MyClaudeSkills", homepage: "bin/SCRIPTS.md" };</script>
//   <script src="https://cdn.jsdelivr.net/gh/Kiri23/DocsifyTemplate@<tag>/packages/docs-site/site.js"></script>
//
// It writes what that index.html would otherwise say by hand: Docsify 5, the theme, the import
// map for Preact, the theme's plugins and the components. What the repo puts in window.$docsify
// wins over the defaults below, and its plugins go after the theme's. To own the list of plugins
// (drop one, reorder them), copy the page README.md shows instead of loading this file.
//
// A classic script, not a module: the import map has to be on the page before any module loads.
(function () {
  var base = new URL(".", document.currentScript.src).href;
  var docsify = "https://cdn.jsdelivr.net/npm/docsify@5.1.0/dist/";
  var prism = "https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/";
  var languages = ["bash", "json", "yaml", "typescript", "python", "turtle", "markdown"];
  var imports = {
    "preact": "https://esm.sh/preact@10.29.8",
    "preact/hooks": "https://esm.sh/preact@10.29.8/hooks",
    "@preact/signals":
      "https://esm.sh/@preact/signals@2.11.4?external=preact&deps=@preact/signals-core@1.14.5",
    "htm/preact": "https://esm.sh/htm@3.1.1/preact?external=preact",
  };

  var own = window.$docsify || {};
  window.$docsify = Object.assign({
    loadSidebar: true,
    subMaxLevel: 2,
    auto2top: true,
    // The pages link to each other with relative paths, so they also work on GitHub.
    relativePath: true,
    // One sidebar, at the root: without this each folder asks for its own and logs a 404.
    alias: { "/.*/_sidebar.md": "/_sidebar.md" },
  }, own);

  // A home page inside a folder (bin/SCRIPTS.md) is opened at its own route, so its relative
  // links resolve from its folder, as they do on GitHub.
  var home = own.homepage;
  if (home && home.indexOf("/") !== -1 && (location.hash === "" || location.hash === "#/")) {
    location.replace("#/" + home.replace(/\.md$/, ""));
  }

  document.write(
    '<link rel="stylesheet" href="' + docsify + 'themes/core.min.css">' +
      '<link rel="stylesheet" href="' + base + 'theme/themes/promptbench.css">' +
      '<script type="importmap">' + JSON.stringify({ imports: imports }) + "</script>" +
      '<script type="module">' +
      'import { codeWindow, onThisPage, prevNext, sidebarSections, topNav } from "' + base + 'theme/mod.js";' +
      'import { asComponents } from "' + base + 'as/mod.js";' +
      'import { annotatedBlock, optionPicker, stepper } from "' + base + 'components/mod.js";' +
      'import { fileLinks } from "' + base + 'plugins/file-links.js";' +
      "const c = window.$docsify;" +
      "const links = c.repo ? [{ text: \"GitHub\", href: c.repo }] : [];" +
      "c.plugins = [" +
      "topNav({ home: \"#/\", links }), sidebarSections(), fileLinks()," +
      // Before onThisPage and codeWindow: a component moves the page's own headings and code
      // blocks, and those two read them after.
      "asComponents([annotatedBlock, optionPicker, stepper])," +
      "onThisPage(), prevNext(), codeWindow()," +
      "].concat(c.plugins || []);" +
      "</script>" +
      '<script defer src="' + docsify + 'docsify.min.js"></script>' +
      languages.map(function (l) {
        return '<script defer src="' + prism + "prism-" + l + '.min.js"></script>';
      }).join(""),
  );
})();
