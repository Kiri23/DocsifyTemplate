// The whole docs site in one line, for a repo that only has Markdown. The repo's index.html says
// its name in Docsify's own config and loads this file:
//
//   <div id="app"></div>
//   <script>window.$docsify = { name: "MyClaudeSkills", homepage: "bin/SCRIPTS.md" };</script>
//   <script src="https://rawcdn.githack.com/Kiri23/DocsifyTemplate/<tag>/packages/docs-site/site.js"></script>
//
// It writes what that index.html would otherwise say by hand: Docsify 5, the theme, the import
// map for Preact, the theme's plugins and the components. What the repo puts in window.$docsify
// wins over the defaults below, and its plugins go after the theme's. To own the list of plugins
// (drop one, reorder them), copy the page README.md shows instead of loading this file.
//
// A repo brings its own components by naming their modules, relative to its index.html:
//
//   window.$docsify = { name: "MyClaudeSkills", components: ["propios/retro.js"] };
//
// Every export of those modules is a component, added to the factory ones in the same plugin. A
// module imports "preact", "htm/preact" and "docs-site/as/mod.js" through the import map below.
//
// A classic script, not a module: the import map has to be on the page before any module loads.
(function () {
  var base = new URL(".", document.currentScript.src).href;
  var docsify = "https://cdn.jsdelivr.net/npm/docsify@5.1.0/dist/";
  var prism = "https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/";
  // In load order: sparql extends turtle, so it goes after it. The catalog shows a .rq file as a
  // block of language "rq", an alias prism-sparql defines.
  var languages = ["bash", "json", "yaml", "typescript", "python", "turtle", "sparql", "markdown"];
  var imports = {
    "preact": "https://esm.sh/preact@10.29.8",
    "preact/hooks": "https://esm.sh/preact@10.29.8/hooks",
    "@preact/signals":
      "https://esm.sh/@preact/signals@2.11.4?external=preact&deps=@preact/signals-core@1.14.5",
    "htm/preact": "https://esm.sh/htm@3.1.1/preact?external=preact",
    "docs-site/": base,
  };

  var own = window.$docsify || {};
  window.$docsify = Object.assign({
    loadSidebar: true,
    subMaxLevel: 2,
    auto2top: true,
    // The pages link to each other with relative paths, so they also work on GitHub.
    relativePath: true,
    // One sidebar at the root, and one for the catalog that armar.mjs builds in _catalogo/: without
    // this each folder asks for its own and logs a 404. Docsify applies aliases again to their
    // result, so the root one has to leave the catalog's sidebar alone.
    alias: {
      "/_catalogo/.*/_sidebar.md": "/_catalogo/_sidebar.md",
      "/(?!_catalogo/).*/_sidebar.md": "/_sidebar.md",
    },
  }, own);

  // A home page inside a folder (bin/SCRIPTS.md) is opened at its own route, so its relative
  // links resolve from its folder, as they do on GitHub. Docsify isn't told about it: its
  // `homepage` would show that page for README.md too, and the repo's README would be lost.
  var home = own.homepage;
  if (home && home.indexOf("/") !== -1) {
    delete window.$docsify.homepage;
    var toHome = function () {
      if (location.hash === "" || location.hash === "#/") {
        location.replace("#/" + home.replace(/\.md$/, ""));
      }
    };
    toHome();
    addEventListener("hashchange", toHome);
  }

  // The repo's component modules, imported by the page's module before Docsify starts. A module
  // that doesn't load stops that script (no theme plugins, no components): the console says so.
  var ownModules = (own.components || []).map(function (src, i) {
    return { name: "own" + i, src: src, url: new URL(src, document.baseURI).href };
  });

  function escapeAttr(text) {
    return text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }

  document.write(
    '<link rel="stylesheet" href="' + docsify + 'themes/core.min.css">' +
      '<link rel="stylesheet" href="' + base + 'theme/themes/promptbench.css">' +
      '<script type="importmap">' + JSON.stringify({ imports: imports }) + "</script>" +
      '<script type="module"' + (ownModules.length ? ' onerror="console.error(' + escapeAttr(JSON.stringify(
        "as: uno de los módulos de window.$docsify.components no cargó (" +
          ownModules.map(function (m) { return m.src; }).join(", ") +
          "); el sitio sale sin los plugins del tema. Mirá el 404 de arriba.",
      )) + ')"' : "") + ">" +
      'import { codeWindow, onThisPage, prevNext, sidebarSections, topNav } from "' + base + 'theme/mod.js";' +
      'import { asComponents } from "' + base + 'as/mod.js";' +
      'import { annotatedBlock, optionPicker, stepper } from "' + base + 'components/mod.js";' +
      'import { fileLinks } from "' + base + 'plugins/file-links.js";' +
      'import { addComponents } from "' + base + 'as/core.js";' +
      ownModules.map(function (m) {
        return "import * as " + m.name + " from " + JSON.stringify(m.url) + ";";
      }).join("") +
      "const c = window.$docsify;" +
      "const { components, problems } = addComponents([annotatedBlock, optionPicker, stepper], {" +
      ownModules.map(function (m) { return JSON.stringify(m.src) + ": " + m.name; }).join(",") +
      "});" +
      "problems.forEach((p) => console.error(\"as: \" + p));" +
      "const links = c.repo ? [{ text: \"GitHub\", href: c.repo }] : [];" +
      "c.plugins = [" +
      "topNav({ home: \"#/\", links }), sidebarSections(), fileLinks()," +
      // Before onThisPage and codeWindow: a component moves the page's own headings and code
      // blocks, and those two read them after.
      "asComponents(components)," +
      "onThisPage(), prevNext(), codeWindow()," +
      "].concat(c.plugins || []);" +
      "</script>" +
      '<script defer src="' + docsify + 'docsify.min.js"></script>' +
      languages.map(function (l) {
        return '<script defer src="' + prism + "prism-" + l + '.min.js"></script>';
      }).join(""),
  );
})();
