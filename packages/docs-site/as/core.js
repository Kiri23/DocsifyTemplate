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
 * @param {{ load?: (src: string) => unknown }} [from] how to get the JSON a marker names, already
 *   parsed: the site gives what it fetched for the page, the checker reads the file
 */
export function prepare(mark, components, { load } = {}) {
  const { name, attrs } = parseMark(mark.data);
  const component = components.get(name);
  if (!component) {
    throw new ShapeError(`no hay un componente "${name}"; los que hay: ${[...components.keys()].join(", ")}`);
  }
  const jsonAttr = component.takes?.jsonFrom;
  const known = [...(component.attrs ?? []), ...(jsonAttr ? [jsonAttr] : [])];
  const unknown = Object.keys(attrs).filter((a) => !known.includes(a));
  if (unknown.length) {
    throw new ShapeError(`${name} no conoce ${unknown.map((a) => `"${a}"`).join(", ")}; conoce: ${known.join(", ") || "ninguno"}`);
  }
  let data;
  if (jsonAttr) {
    if (!attrs[jsonAttr]) throw new ShapeError(`${name} lee un JSON: falta ${jsonAttr}="archivo.json" en la marca`);
    if (!load) throw new ShapeError(`${name} lee ${attrs[jsonAttr]}, y aquí no hay cómo cargarlo`);
    data = load(attrs[jsonAttr]);
  }
  const nodes = component.takes.collect(mark);
  const props = component.read({ nodes, attrs, data });
  return { component, nodes, props };
}

/**
 * The JSON files the markers of a page name, so the site can fetch them before it draws. A marker
 * that doesn't parse or names an unknown component is skipped here: `prepare` says why later.
 * @param {Node} root the rendered page
 * @param {Map<string, object>} components the registered components, by name
 * @returns {string[]} what each marker says in its JSON attribute, in order
 */
export function jsonSources(root, components) {
  const files = [];
  for (const mark of findMarks(root)) {
    let said;
    try {
      said = parseMark(mark.data);
    } catch {
      continue;
    }
    const attr = components.get(said.name)?.takes.jsonFrom;
    if (attr && said.attrs[attr]) files.push(said.attrs[attr]);
  }
  return files;
}

/**
 * The factory components plus the ones a repo brings, each module's exports being components (as
 * in components/mod.js). An export that isn't one, or a name already taken, is a problem and stays
 * out; the rest are added. site.js and check.mjs both call this.
 * @param {object[]} builtIn the components that come with docs-site
 * @param {Record<string, Record<string, unknown>>} modules each module the repo names, by its path
 * @returns {{ components: object[], problems: string[] }}
 */
export function addComponents(builtIn, modules) {
  const components = [...builtIn];
  const problems = [];
  for (const [path, exports] of Object.entries(modules)) {
    for (const [key, value] of Object.entries(exports)) {
      const missing = ["name", "takes", "read", "view"].filter((field) => !value?.[field]);
      if (missing.length) {
        problems.push(`${path} exporta "${key}", que no es un componente: le falta ${missing.join(", ")}`);
      } else if (components.some((c) => c.name === value.name)) {
        problems.push(`${path}: ya hay un componente "${value.name}"; ponele otro nombre`);
      } else {
        components.push(value);
      }
    }
  }
  return { components, problems };
}

export { ShapeError };
