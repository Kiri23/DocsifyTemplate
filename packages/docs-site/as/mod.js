// The Docsify plugin that turns Markdown into components. Under a `<!-- as: name -->` marker, the
// Markdown that follows (a table, a code block and its list, a run of headings) becomes the
// component of that name. GitHub hides the marker and shows the plain Markdown; the site shows
// the component. When the Markdown doesn't have the shape the component needs, the page keeps the
// plain Markdown and the console says why.
//
// A component is an object with names, not a class:
//
//   export const optionPicker = {
//     name: "option-picker",          // what goes after "as:" in the marker
//     takes: sequence("table"),       // the shape it takes (as/shapes.js)
//     attrs: ["default"],             // the attributes the marker may set; any other one fails
//     read({ nodes, attrs }) { … },   // the Markdown, already HTML, → the props; throws ShapeError
//     view: OptionPicker,             // a Preact function that only knows its props
//   };
//
// A view that is the whole page takes `page()`, and with `.json("src")` it also reads the JSON
// file the marker names (`<!-- as: retro src="retro.json" -->`), relative to the page. The plugin
// fetches those files before the page is drawn, so drawing stays in one step.
import { render } from "preact";
import { html } from "htm/preact";
import { findMarks, jsonSources, prepare } from "./core.js";
import { ShapeError } from "./shapes.js";

export { page, section, sequence, ShapeError } from "./shapes.js";

/** How long a page waits for one of its JSON files before it is drawn without it. */
const WAIT_MS = 10000;

/**
 * @param {object[]} components the components the pages may name
 */
export function asComponents(components) {
  const byName = new Map(components.map((c) => [c.name, c]));
  return (hook, vm) => {
    const hosts = [];
    const takeDown = () => {
      for (const host of hosts.splice(0)) render(null, host);
    };

    // The JSON files of the page being drawn, by their address.
    let fetched = new Map();

    hook.beforeEach(() => {
      takeDown();
    });

    // Docsify waits for a hook that takes exactly two arguments until it calls `next`.
    hook.afterEach(function (html, next) {
      const file = vm.route.file;
      const box = document.createElement("template");
      box.innerHTML = html;
      const wanted = jsonSources(box.content, byName).map((src) => address(src, file));
      if (!wanted.length) {
        fetched = new Map();
        next(html);
        return;
      }
      Promise.all(wanted.map((url) => fetchJson(url).then((result) => [url, result]))).then((results) => {
        // The reader went to another page meanwhile: that page is being drawn, not this one.
        if (vm.route.file !== file) return;
        fetched = new Map(results);
        next(html);
      });
    });

    hook.doneEach(() => {
      takeDown();
      const main = document.querySelector("#main");
      if (!main) return;
      const file = vm.route.file;
      const load = (src) => {
        const result = fetched.get(address(src, file));
        if (!result) throw new ShapeError(`${src} no se cargó`);
        if (result.error) throw new ShapeError(`no pude leer ${src}: ${result.error}`);
        return result.data;
      };
      for (const mark of findMarks(main)) {
        const host = mount(mark, byName, file, load);
        if (host) hosts.push(host);
      }
    });
  };
}

/** Where a JSON file named on a page lives: relative to the page, as a link on it would be. */
function address(src, file) {
  return new URL(src, new URL(file, document.baseURI)).href;
}

/** A JSON file, parsed, or why it couldn't be: never throws, so the page is always drawn. */
async function fetchJson(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(WAIT_MS) });
    if (!response.ok) return { error: `HTTP ${response.status}` };
    return { data: await response.json() };
  } catch (error) {
    return { error: error.message };
  }
}

/** Draws one marker's component in place of its Markdown. Returns the box it drew into, or
 *  nothing when it left the Markdown as it was. */
function mount(mark, byName, file, load) {
  let prepared;
  try {
    prepared = prepare(mark, byName, { load });
  } catch (error) {
    console.warn(`as: ${file}: ${error.message}. La página muestra el Markdown tal cual.`);
    return null;
  }
  const { component, nodes, props } = prepared;
  const host = document.createElement("div");
  host.className = `as as-${component.name}`;
  // Right after the marker, where its Markdown starts: a whole-page view may take no Markdown.
  mark.after(host);
  for (const node of nodes) node.remove();
  try {
    render(html`<${component.view} ...${props} />`, host);
  } catch (error) {
    // The view broke after the Markdown left the page: put the Markdown back.
    render(null, host);
    host.replaceWith(...nodes);
    console.warn(`as: ${file}: ${component.name} falló al dibujarse (${error.message}). La página muestra el Markdown tal cual.`);
    return null;
  }
  return host;
}
