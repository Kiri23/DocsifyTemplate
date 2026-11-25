// What site.js loads and wires: Prism languages, built-in components and topNav links.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { parseHTML } from "linkedom";
import { topNav } from "../theme/plugins/top-nav.js";

const SITE = fileURLToPath(new URL("../site.js", import.meta.url));

async function prismLanguages() {
  const text = await readFile(SITE, "utf8");
  const line = text.match(/var languages = \[([^\]]*)\]/);
  assert.ok(line, "site.js has no list of languages");
  const names = [];
  for (const quoted of line[1].split(",")) {
    names.push(quoted.trim().replace(/"/g, ""));
  }
  return names;
}

/** Runs site.js and its emitted module script with a given window.$docsify config. */
async function runSite(config, { pageUrl = "https://example.com/docs/#/" } = {}) {
  const source = await readFile(SITE, "utf8");
  let written = "";
  const windowObj = { $docsify: structuredClone(config) };
  const locationObj = new URL(pageUrl);
  const errors = [];
  const context = vm.createContext({
    window: windowObj,
    document: {
      currentScript: { src: "https://example.com/docs-site/site.js" },
      baseURI: pageUrl,
      write(chunk) {
        written += chunk;
      },
    },
    location: locationObj,
    addEventListener() {},
    URL,
    console: { error: (...args) => errors.push(args.join(" ")) },
  });
  vm.runInContext(source, context);

  const match = written.match(/<script type="module"[^>]*>([\s\S]*?)<\/script>/);
  assert.ok(match, "site.js did not emit its module script");
  // Strip ES module imports and run the wiring body with stubs + real topNav capture.
  const body = match[1].replace(/import\s+[^;]+;/g, "");
  let topNavOpts = null;
  const noop = () => () => {};
  const runWiring = new Function(
    "window", "console", "topNav", "sidebarSections", "fileLinks",
    "asComponents", "onThisPage", "prevNext", "codeWindow", "glossaryTerms",
    "addComponents", "annotatedBlock", "optionPicker", "stepper", "terminal",
    body,
  );
  runWiring(
    windowObj,
    { error: (...args) => errors.push(args.join(" ")) },
    (opts) => {
      topNavOpts = opts;
      return topNav(opts);
    },
    noop, noop, noop, noop, noop, noop, noop,
    (builtIn) => ({ components: builtIn, problems: [] }),
    {}, {}, {}, {},
  );
  return { config: windowObj.$docsify, topNavOpts, errors };
}

/** Mounts a Docsify topNav plugin into a linkedom document at `pageUrl`. */
function mountTopNav(plugin, { name = "docs", pageUrl = "https://example.com/docs/#/" } = {}) {
  const { document } = parseHTML("<body><main></main></body>");
  const prevDoc = globalThis.document;
  const prevLoc = globalThis.location;
  globalThis.document = document;
  globalThis.location = new URL(pageUrl);
  try {
    let mounted;
    plugin({ mounted: (fn) => (mounted = fn) }, { config: { name } });
    mounted();
    return document;
  } finally {
    globalThis.document = prevDoc;
    globalThis.location = prevLoc;
  }
}

test("site.js loads sparql, after turtle, which it extends", async () => {
  const languages = await prismLanguages();
  assert.ok(languages.includes("turtle"), "falta turtle");
  assert.ok(languages.includes("sparql"), "falta sparql");
  assert.ok(languages.indexOf("turtle") < languages.indexOf("sparql"), "sparql tiene que ir después de turtle");
});

test("site.js imports and registers every built-in component from components/mod.js", async () => {
  const builtIn = await import("../components/mod.js");
  const text = await readFile(SITE, "utf8");
  const imported = text.match(/import\s*\{([^}]*)\}\s*from\s*"'\s*\+\s*base\s*\+\s*'components\/mod\.js"/);
  const registered = text.match(/addComponents\(\[([^\]]*)\]/);
  assert.ok(imported, "site.js does not import built-in components");
  assert.ok(registered, "site.js does not register built-in components");
  const split = (s) => s.split(",").map((name) => name.trim()).filter(Boolean).sort();
  const expected = Object.keys(builtIn).sort();
  assert.deepEqual(split(imported[1]), expected);
  assert.deepEqual(split(registered[1]), expected);
});

test("site.js defaults topNav links to GitHub from repo when navLinks is omitted", async () => {
  const { topNavOpts, errors } = await runSite({
    name: "docs-site",
    repo: "https://github.com/Kiri23/DocsifyTemplate",
  });
  assert.deepEqual(errors, []);
  assert.deepEqual(topNavOpts, {
    home: "#/",
    links: [{ text: "GitHub", href: "https://github.com/Kiri23/DocsifyTemplate" }],
  });
});

test("site.js passes no topNav links when neither navLinks nor repo is set", async () => {
  const { topNavOpts, errors } = await runSite({ name: "only-docs" });
  assert.deepEqual(errors, []);
  assert.deepEqual(topNavOpts, { home: "#/", links: [] });
});

test("site.js passes custom navLinks to topNav and overrides repo", async () => {
  const navLinks = [
    { text: "Home", href: "/" },
    { text: "Docs", href: "./" },
    { text: "GitHub", href: "https://github.com/Kiri23/prompt-bench" },
  ];
  const { topNavOpts, errors } = await runSite({
    name: "prompt-bench",
    repo: "https://github.com/Kiri23/prompt-bench",
    navLinks,
  });
  assert.deepEqual(errors, []);
  assert.deepEqual(topNavOpts, { home: "#/", links: navLinks });
});

test("site.js respects an explicit empty navLinks array even when repo is set", async () => {
  const withRepo = await runSite({
    name: "clean-bar",
    repo: "https://github.com/Kiri23/DocsifyTemplate",
    navLinks: [],
  });
  assert.deepEqual(withRepo.errors, []);
  assert.deepEqual(withRepo.topNavOpts, { home: "#/", links: [] });

  const withoutRepo = await runSite({ name: "clean-bar", navLinks: [] });
  assert.deepEqual(withoutRepo.errors, []);
  assert.deepEqual(withoutRepo.topNavOpts, { home: "#/", links: [] });
});

test("site.js logs an error and falls back to repo when navLinks is not an array", async () => {
  const { topNavOpts, errors } = await runSite({
    name: "bad-config",
    repo: "https://github.com/Kiri23/DocsifyTemplate",
    navLinks: "https://github.com/Kiri23/DocsifyTemplate",
  });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /navLinks/);
  assert.deepEqual(topNavOpts, {
    home: "#/",
    links: [{ text: "GitHub", href: "https://github.com/Kiri23/DocsifyTemplate" }],
  });
});

test("topNav renders root '/' and relative './' links and marks only the current page", async () => {
  const navLinks = [
    { text: "Home", href: "/" },
    { text: "Docs", href: "./" },
    { text: "GitHub", href: "https://github.com/Kiri23/prompt-bench" },
  ];
  const { config } = await runSite({ name: "prompt-bench", navLinks });

  for (const pageUrl of [
    "https://prompt-bench.example/docs/#/",
    "https://prompt-bench.example/docs/#/guide/intro",
    "https://prompt-bench.example/docs/index.html#/",
  ]) {
    const doc = mountTopNav(config.plugins[0], { name: "prompt-bench", pageUrl });
    const brand = doc.querySelector("header.top-nav a.top-nav-brand");
    assert.equal(brand.getAttribute("href"), "#/");
    assert.ok(brand.textContent.includes("prompt-bench"));

    const links = [...doc.querySelectorAll("header.top-nav ul.top-nav-links a")].map((a) => ({
      text: a.textContent,
      href: a.getAttribute("href"),
      current: a.getAttribute("aria-current"),
    }));
    assert.deepEqual(links, [
      { text: "Home", href: "/", current: null },
      { text: "Docs", href: "./", current: "page" },
      { text: "GitHub", href: "https://github.com/Kiri23/prompt-bench", current: null },
    ]);
  }
});

test("topNav does not mark an external link as current when pathnames coincide", () => {
  const doc = mountTopNav(
    topNav({ home: "#/", links: [{ text: "GitHub", href: "https://github.com/" }] }),
    { name: "docs-site", pageUrl: "https://doctemplate.kiri231.com/#/" },
  );
  const link = doc.querySelector("header.top-nav ul.top-nav-links a");
  assert.equal(link.getAttribute("aria-current"), null);
});

test("site.js skips malformed navLinks entries and logs an error instead of crashing topNav", async () => {
  const { topNavOpts, errors } = await runSite({
    name: "mixed",
    navLinks: [null, { text: "Home", href: "/" }, { text: "Broken" }, "str"],
  });
  assert.equal(errors.length, 3);
  assert.deepEqual(topNavOpts, { home: "#/", links: [{ text: "Home", href: "/" }] });
});

test("topNav does not mark hash/query links as current and tolerates invalid URLs", () => {
  const doc = mountTopNav(
    topNav({
      home: "#/",
      links: [
        { text: "Guide", href: "#/guide" },
        { text: "API", href: "#/api" },
        { text: "Query", href: "?id=1" },
        { text: "Bad", href: "http://" },
      ],
    }),
    { name: "docs", pageUrl: "https://example.com/docs/#/guide" },
  );
  const currents = [...doc.querySelectorAll("header.top-nav ul.top-nav-links a")]
    .map((a) => a.getAttribute("aria-current"));
  assert.deepEqual(currents, [null, null, null, null]);
});
