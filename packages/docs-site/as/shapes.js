// The shapes of Markdown a component can take: what has to come right after its marker. Each shape
// is an object with `collect(mark)`, which returns the nodes that belong to the component or throws
// a ShapeError that says what it expected and what it found. A new shape is a new function here;
// the runtime (as/mod.js) and the checker (bin/check.mjs) never change for it.

/** What the reader sees when the Markdown under a marker doesn't have the shape. */
export class ShapeError extends Error {}

/**
 * Elements one after the other, right after the marker: `sequence("pre", "ol")` is a code block
 * followed by a numbered list.
 * @param {...string} tags the tag of each element, in order
 */
export function sequence(...tags) {
  return {
    describe: tags.map((t) => `<${t}>`).join(" + "),
    collect(mark) {
      const nodes = [];
      let at = mark;
      for (const tag of tags) {
        const next = nextElement(at);
        if (!next || next.localName !== tag) {
          const after = nodes.length ? `después de <${tags[nodes.length - 1]}>` : "después de la marca";
          throw new ShapeError(`esperaba <${tag}> ${after}, encontré ${found(next)}`);
        }
        nodes.push(next);
        at = next;
      }
      return nodes;
    },
  };
}

/**
 * A run of headings with what is under each one: `section("h2")` takes every `##` after the
 * marker and its content, up to a bigger heading, a `<!-- /as -->` marker or the end of the page.
 * @param {string} tag the heading that opens each part, like "h2"
 */
export function section(tag) {
  const level = Number(tag[1]);
  return {
    describe: `<${tag}> y lo que sigue`,
    collect(mark) {
      const first = nextElement(mark);
      if (!first || first.localName !== tag) {
        throw new ShapeError(`esperaba <${tag}> después de la marca, encontré ${found(first)}`);
      }
      const nodes = [];
      for (let n = first; n; n = n.nextSibling) {
        if (isClosing(n)) break;
        if (n.nodeType === 1 && /^h[1-6]$/.test(n.localName) && Number(n.localName[1]) < level) break;
        if (n.nodeType === 1) nodes.push(n);
      }
      return nodes;
    },
  };
}

/** The next element after a node, skipping blank text and other comments. */
function nextElement(node) {
  for (let n = node.nextSibling; n; n = n.nextSibling) {
    if (n.nodeType === 1) return n;
    if (n.nodeType === 3 && n.textContent.trim()) return null;
  }
  return null;
}

/** Whether a node is the `<!-- /as -->` that closes a section early. */
function isClosing(node) {
  return node.nodeType === 8 && node.data.trim() === "/as";
}

/** How an element is named in an error. */
function found(el) {
  return el ? `<${el.localName}>` : "nada";
}
