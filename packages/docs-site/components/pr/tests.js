// The tests of a PR summary, one group per test file, open from the start. Each test says whether
// the PR added, modified or removed it, and links to its line in the PR. The tests of a `describe`
// block and the cases of one parameterized test stay together. Each file is a UI SDK collapsible,
// so an agent sees the files and can close one.
//
//   <!-- as: tests -->
//   - `test/site.test.mjs`
//     - added L240: [site.js imports no extra module](https://github.com/…R240)
//     - **a describe block**
//       - modified L12: [its test](…) (renamed from test/old.mjs:9)
//     - _Cases of one test_
//       - added L30: [with all](…)
import { html } from "htm/preact";
import { sequence, ShapeError } from "../../as/shapes.js";
import { itemHtml, sublist } from "./read.js";

const TEST = /^(added|modified|removed) L(\d+):\s*$/;
const RENAMED = /^\s*\(renamed from ([^)]+)\)\s*$/;
const TITLES = { added: "Added test", modified: "Modified test", removed: "Removed test" };
const SIGNS = { added: "+", modified: "~", removed: "−" };

export const tests = {
  name: "tests",
  takes: sequence("ul"),
  attrs: [],
  read({ nodes: [list] }) {
    const files = [...list.children].map((li, i) => {
      const path = li.querySelector(":scope > code, :scope > p > code")?.textContent;
      if (!path) throw new ShapeError(`tests: el archivo ${i + 1} empieza con su ruta en \`código\``);
      const table = li.querySelector(":scope table");
      if (table) return { path, table: table.outerHTML, tests: [...table.querySelectorAll("td[data-line]")].map(cellTest) };
      const items = sublist(li);
      if (!items) throw new ShapeError(`tests: ${path} no tiene tests debajo`);
      return { path, items: readItems(items, path) };
    });
    return { files };
  },
  view: Tests,
};

function readItems(list, path) {
  return [...list.children].map((li) => {
    const inner = sublist(li);
    if (inner) {
      const strong = li.querySelector(":scope > strong, :scope > p > strong");
      if (strong) return { group: "describe", name: strong.innerHTML.trim(), items: readItems(inner, path) };
      return { group: "cases", items: readItems(inner, path) };
    }
    const link = li.querySelector(":scope > a, :scope > p > a");
    const head = /^\s*(\S+ L\d+:)/.exec(li.textContent)?.[1] ?? "";
    const said = TEST.exec(head);
    if (!said || !link) throw new ShapeError(`tests: en ${path}, "${li.textContent.trim()}" va como "- added L12: [nombre](link)"`);
    const after = link.nextSibling?.textContent ?? "";
    return {
      line: Number(said[2]),
      change: said[1],
      renamedFrom: RENAMED.exec(after)?.[1] ?? null,
      name: link.innerHTML.trim(),
      href: link.getAttribute("href"),
    };
  });
}

function cellTest(td) {
  return {
    line: Number(td.getAttribute("data-line")),
    change: td.getAttribute("data-change"),
    renamedFrom: td.getAttribute("data-renamed-from"),
    name: td.innerHTML.trim(),
  };
}

function Tests({ files }) {
  return html`<div class="pr-tests">
    ${files.map((file) => html`<ui-collapsible class="pr-test-file" default-open>
      <ui-collapsible-trigger><button type="button" aria-expanded="true">${file.path}</button></ui-collapsible-trigger>
      <ui-collapsible-panel>
        ${file.table
          ? html`<div class="pr-test-table" dangerouslySetInnerHTML=${{ __html: file.table }} />`
          : html`<ul class="pr-test-list">${file.items.map(Item)}</ul>`}
      </ui-collapsible-panel>
    </ui-collapsible>`)}
  </div>`;
}

function Item(item) {
  if (item.group === "describe") {
    return html`<li class="pr-describe"><span class="pr-describe-name" dangerouslySetInnerHTML=${{ __html: item.name }} />
      <ul>${item.items.map(Item)}</ul></li>`;
  }
  if (item.group === "cases") return html`<li class="pr-cases" title="Cases of one test"><ul>${item.items.map(Item)}</ul></li>`;
  return html`<li class="pr-test" data-change=${item.change} data-line=${item.line}
      title=${item.renamedFrom ? `Renamed test (from ${item.renamedFrom})` : TITLES[item.change]}>
    <span class="pr-test-sign" aria-label=${TITLES[item.change]}>${SIGNS[item.change]}</span>
    <a href=${item.href} target="_blank" rel="noopener" dangerouslySetInnerHTML=${{ __html: item.name }} />
  </li>`;
}
