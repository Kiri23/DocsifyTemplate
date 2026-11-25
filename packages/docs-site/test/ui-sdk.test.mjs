// UI SDK on the site, without a browser: the import map that site.js writes gives every @ui-sdk
// module the same version and the same @ui-sdk/core, and the `read` tool gives an agent the prose
// that the snapshot leaves out. test/pr_agente.py checks the same in Chromium.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { answer, sectionsOf, termsOf } from "../plugins/page-text.js";

const PACKAGE = new URL("../", import.meta.url);

/** The import map site.js writes on the page. */
function importMap() {
  let written = "";
  const context = vm.createContext({
    window: { $docsify: {} },
    document: { currentScript: { src: "https://example.com/docs-site/site.js" }, baseURI: "https://example.com/", write: (c) => (written += c) },
    location: new URL("https://example.com/#/"),
    addEventListener() {},
    URL,
    console,
  });
  vm.runInContext(readFileSync(new URL("site.js", PACKAGE), "utf8"), context);
  return JSON.parse(/<script type="importmap">(.*?)<\/script>/.exec(written)[1]).imports;
}

/** Every module specifier under @ui-sdk that the package's own code imports. */
function uiSdkImports() {
  const found = new Set();
  for (const dir of ["plugins", "components", "components/pr", "as"]) {
    for (const file of readdirSync(new URL(`${dir}/`, PACKAGE)).filter((f) => f.endsWith(".js"))) {
      const source = readFileSync(new URL(`${dir}/${file}`, PACKAGE), "utf8");
      for (const m of source.matchAll(/(?:from|import)\s*"(@ui-sdk\/[^"]+)"/g)) found.add(m[1]);
    }
  }
  return found;
}

test("A: every @ui-sdk module of the import map has one version and pins @ui-sdk/core to it", () => {
  const map = importMap();
  const entries = Object.entries(map).filter(([name]) => name.startsWith("@ui-sdk/"));
  assert.ok(entries.length >= 5, "the import map names the UI SDK modules");
  const versions = new Set();
  for (const [name, url] of entries) {
    const m = /^https:\/\/esm\.sh\/@ui-sdk\/web@([^/]+)\/[a-z-]+\?deps=@ui-sdk\/core@([^&]+)$/.exec(url);
    assert.ok(m, `${name} → ${url} no fija @ui-sdk/core con ?deps=`);
    assert.equal(m[1], m[2], `${name}: @ui-sdk/web ${m[1]} con @ui-sdk/core ${m[2]}`);
    versions.add(m[1]);
  }
  assert.equal(versions.size, 1, `más de una versión de UI SDK: ${[...versions].join(", ")}`);
});

test("A: the site's code imports UI SDK only through the import map, and the components not at all", () => {
  const map = importMap();
  const imported = uiSdkImports();
  for (const name of imported) assert.ok(map[name], `${name} no está en el import map de site.js`);
  // check.mjs runs the components in Node, where an https import can't load.
  for (const file of readdirSync(new URL("components/pr/", PACKAGE))) {
    assert.doesNotMatch(readFileSync(new URL(`components/pr/${file}`, PACKAGE), "utf8"), /from "@ui-sdk/, file);
  }
});

const PAGE = readFileSync(fileURLToPath(new URL("docs/prs/59.md", PACKAGE)), "utf8");

test("read: the outline names every section and every term with its definition", () => {
  const out = answer({ markdown: PAGE, file: "prs/59.md" });
  assert.deepEqual(out.sections, ["(top)", "Flujo", "El glosario y sus dos salidas", "Sidebar del sitio", "Plugin del glosario", "Resúmenes de PR en el sitio", "Tests"]);
  assert.equal(out.terms.length, 7);
  assert.deepEqual(out.terms[0], {
    term: "site.js",
    definition: "El script que un sitio carga en su index.html para levantar Docsify 5 con el tema, el import map y los componentes de este repo ya configurados.",
  });
});

test("read: a section comes whole, with the why and the trade-off of its closed decisions", () => {
  const out = answer({ markdown: PAGE, file: "prs/59.md" }, { section: "sidebar del sitio" });
  assert.equal(out.section, "Sidebar del sitio");
  assert.match(out.text, /\*\*Why:\*\* Del catálogo solo entra el glosario/);
  assert.match(out.text, /\*\*Trade-off:\*\* El recorrido `en_el_navegador.py`/);
});

test("read: a section that isn't there says which ones are", () => {
  assert.match(answer({ markdown: PAGE, file: "x" }, { section: "nope" }).error, /Sections: \(top\), Flujo/);
});

test("read: a ## inside a code block is not a section", () => {
  assert.deepEqual(sectionsOf("# T\n\n```md\n## no\n```\n\n## Sí\n\ntexto").map((s) => s.title), ["", "Sí"]);
  assert.deepEqual(termsOf('<dfn class="term" data-tip="a &quot;b&quot;">x</dfn>\n\n```html\n<dfn data-tip="c">y</dfn>\n```'), [{ term: "x", definition: 'a "b"' }]);
});
