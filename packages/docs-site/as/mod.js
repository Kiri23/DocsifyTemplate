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
//     read(nodes, attrs) { … },       // the Markdown, already HTML, → the props; throws ShapeError
//     view: OptionPicker,             // a Preact function that only knows its props
//   };
import { render } from "preact";
import { html } from "htm/preact";
import { findMarks, prepare } from "./core.js";

export { section, sequence, ShapeError } from "./shapes.js";

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

    hook.beforeEach(() => {
      takeDown();
    });

    hook.doneEach(() => {
      takeDown();
      const main = document.querySelector("#main");
      if (!main) return;
      for (const mark of findMarks(main)) {
        const host = mount(mark, byName, vm.route.file);
        if (host) hosts.push(host);
      }
    });
  };
}

/** Draws one marker's component in place of its Markdown. Returns the box it drew into, or
 *  nothing when it left the Markdown as it was. */
function mount(mark, byName, file) {
  let prepared;
  try {
    prepared = prepare(mark, byName);
  } catch (error) {
    console.warn(`as: ${file}: ${error.message}. La página muestra el Markdown tal cual.`);
    return null;
  }
  const { component, nodes, props } = prepared;
  const host = document.createElement("div");
  host.className = `as as-${component.name}`;
  nodes[0].before(host);
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
