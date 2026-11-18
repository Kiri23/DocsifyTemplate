// The part of the `<!-- as: name -->` plugin that has no browser in it: find the markers on a
// rendered page, read what each one says and turn the Markdown under it into the component's
// props. The Docsify plugin (as/mod.js) and the checker (bin/check.mjs) both call `prepare`, so
// what passes the check is what the browser draws.
import { ShapeError } from "./shapes.js";

/** The text of a marker: `as: option-picker default="clean"`. */
const MARK = /^\s*as:\s*([a-z][a-z0-9-]*)((?:\s+[a-z][a-z0-9-]*="[^"]*")*)\s*$/;
const ATTR = /([a-z][a-z0-9-]*)="([^"]*)"/g;

/** Every `<!-- as: … -->` comment inside a rendered page, in order. */
export function findMarks(root) {
  const marks = [];
  const walk = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === 8 && /^\s*as:/.test(child.data)) marks.push(child);
      else if (child.nodeType === 1) walk(child);
    }
  };
  walk(root);
  return marks;
}

/**
 * The name and attributes a marker says, or a ShapeError if it is badly written.
 * @param {string} text the inside of the comment
 * @returns {{ name: string, attrs: Record<string, string> }}
 */
export function parseMark(text) {
  const m = MARK.exec(text);
  if (!m) throw new ShapeError(`marca mal escrita: <!--${text}-->; va <!-- as: nombre clave="valor" -->`);
  return { name: m[1], attrs: Object.fromEntries([...m[2].matchAll(ATTR)].map((a) => [a[1], a[2]])) };
}

/**
 * Everything a marker needs before it is drawn: which component, the Markdown it takes and the
 * props that component reads from it. Throws a ShapeError with the reason when any step fails.
 * @param {Comment} mark the marker
 * @param {Map<string, object>} components the registered components, by name
 */
export function prepare(mark, components) {
  const { name, attrs } = parseMark(mark.data);
  const component = components.get(name);
  if (!component) {
    throw new ShapeError(`no hay un componente "${name}"; los que hay: ${[...components.keys()].join(", ")}`);
  }
  const unknown = Object.keys(attrs).filter((a) => !(component.attrs ?? []).includes(a));
  if (unknown.length) {
    throw new ShapeError(`${name} no conoce ${unknown.map((a) => `"${a}"`).join(", ")}; conoce: ${(component.attrs ?? []).join(", ") || "ninguno"}`);
  }
  const nodes = component.takes.collect(mark);
  const props = component.read(nodes, attrs);
  return { component, nodes, props };
}

export { ShapeError };
