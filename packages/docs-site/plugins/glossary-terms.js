// The page of a GLOSSARY.md (the format of Matt Pocock's domain-modeling skill) as a dictionary:
// each term with its own address, a search box and an index of the groups. A term is a paragraph
// that starts with "**Term**:" and may end with "_Avoid_: …"; a group is a "## Heading".
// Docsify only gives headings an id, so a link to `#/_catalogo/GLOSSARY?id=site-js` would land at
// the top of the page. After the page is drawn, each term gets the id kiri-glosario gives it in
// vocabulary.ttl (glosario:site-js), and the page scrolls to the one the link names. A summary of a
// PR (docs/prs/) and a PR body link to the glossary that way. The search and the index are built
// from the drawn page, so the Markdown stays as the skill writes it. It is plain DOM, no Preact.

/** The id of a term: as kiri-glosario writes it, lowercase, without accents, "-" between words. */
export function termSlug(name) {
  return name
    .normalize("NFKD")
    .replace(/[^\x00-\x7f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Whether a page is a glossary: its file is GLOSSARY.md, in any folder. */
function isGlossary(file) {
  return /(^|\/)GLOSSARY\.md$/.test(file || "");
}

/** A text as the search compares it: lowercase and without accents, so "pagina" finds "página". */
function plain(text) {
  return text.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** "1 término" or "3 términos". */
function counted(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}

/** A new element with a class and, if given, a text. */
function el(doc, tag, className, text) {
  const node = doc.createElement(tag);
  node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

/** The names not to use, each one struck out, behind a "No digas" that replaces the "Avoid". */
function avoidLine(doc, avoid) {
  const line = el(doc, "span", "glossary-term-avoid");
  let names = "";
  while (avoid.nextSibling) {
    names += avoid.nextSibling.textContent;
    avoid.nextSibling.remove();
  }
  avoid.remove();
  line.append(el(doc, "span", "glossary-term-avoid-label", "No digas"), " ");
  names.replace(/^\s*:/, "").split(",").map((name) => name.trim()).filter(Boolean).forEach((name, i) => {
    if (i) line.append(", ");
    line.append(el(doc, "s", "", name));
  });
  return line;
}

/**
 * Marks each term of the page in `root` with its id and lays it out as a dictionary entry: the
 * name and its address on one side, the definition and the names not to use on the other.
 * `path` is the route of the page, for the address. Returns the ids, in the page's order.
 */
export function markTerms(root, path = "") {
  const ids = [];
  for (const paragraph of root.querySelectorAll("p")) {
    // A page that is already laid out keeps its entries as they are.
    if (paragraph.classList.contains("glossary-term")) {
      ids.push(paragraph.id);
      continue;
    }
    const name = paragraph.firstElementChild;
    const after = name?.nextSibling;
    if (name?.tagName !== "STRONG" || paragraph.firstChild !== name) continue;
    if (after?.nodeType !== 3 || !after.textContent.startsWith(":")) continue;
    const id = termSlug(name.textContent);
    if (!id) continue;
    const doc = paragraph.ownerDocument;
    paragraph.id = id;
    paragraph.classList.add("glossary-term");
    name.classList.add("glossary-term-name");
    // The two sides of the entry replace the ":" that joined them.
    after.textContent = after.textContent.replace(/^:\s*/, "");
    const avoid = [...paragraph.querySelectorAll("em")].find((em) => em.textContent === "Avoid");
    const avoidNames = avoid ? avoidLine(doc, avoid) : null;
    const definition = el(doc, "span", "glossary-term-definition");
    while (name.nextSibling) definition.append(name.nextSibling);
    const body = el(doc, "span", "glossary-term-body");
    body.append(definition);
    if (avoidNames) body.append(avoidNames);
    // The address of the term, to copy into a PR or a message.
    const link = el(doc, "a", "glossary-term-link", `#${id}`);
    link.setAttribute("href", `#${path}?id=${id}`);
    link.setAttribute("aria-label", `Enlace a ${name.textContent}`);
    const head = el(doc, "span", "glossary-term-head");
    head.append(name, " ", link);
    paragraph.append(head, " ", body);
    ids.push(id);
  }
  return ids;
}

/** The groups of the page: each "## Heading" with the terms under it, in the page's order. */
function groupsOf(root) {
  const groups = [];
  for (const node of root.querySelectorAll("h2, p.glossary-term")) {
    if (node.tagName === "H2") groups.push({ heading: node, terms: [] });
    else if (groups.length) groups.at(-1).terms.push(node);
  }
  return groups.filter((group) => group.terms.length);
}

/**
 * Shows only the terms that have `query` in their name, their definition or a name not to use, and
 * only the groups that keep a term. Returns how many terms are shown. The search box calls it on
 * every keystroke.
 */
export function filterTerms(root, query) {
  const wanted = plain(query);
  const terms = [...root.querySelectorAll("p.glossary-term")];
  let shown = 0;
  for (const term of terms) {
    // What a term says: its name, its definition and the names not to use, without the labels.
    const says = [...term.querySelectorAll(".glossary-term-name, .glossary-term-definition, s")]
      .map((part) => part.textContent).join(" ");
    term.hidden = wanted !== "" && !plain(says).includes(wanted);
    if (!term.hidden) shown += 1;
  }
  const groups = groupsOf(root);
  for (const { heading, terms: own } of groups) {
    const left = own.filter((term) => !term.hidden).length;
    heading.hidden = left === 0;
    const entry = root.querySelector(`.glossary-index [data-group="${heading.id}"]`);
    if (entry) {
      entry.querySelector(".glossary-index-count").textContent = left;
      // A group with nothing to show is not a place to jump to.
      entry.classList.toggle("glossary-index-empty", left === 0);
      if (left === 0) entry.setAttribute("tabindex", "-1");
      else entry.removeAttribute("tabindex");
    }
  }
  const index = root.querySelector(".glossary-index");
  if (index) index.hidden = shown === 0;
  const status = root.querySelector(".glossary-status");
  if (status) {
    status.textContent = wanted === ""
      ? `${counted(terms.length, "término", "términos")} en ${counted(groups.length, "grupo", "grupos")}`
      : `${shown} de ${counted(terms.length, "término", "términos")}`;
  }
  const empty = root.querySelector(".glossary-empty");
  if (empty) {
    empty.hidden = shown > 0;
    empty.querySelector(".glossary-empty-query").textContent = query.trim();
  }
  return shown;
}

/**
 * Builds the search box and the index of groups, and puts them above the first group. Called once
 * per page, after markTerms. Returns the search box, or null if the page has no terms.
 */
export function buildTools(root) {
  const doc = root.ownerDocument;
  const built = root.querySelector(".glossary-search");
  if (built) return built;
  const groups = groupsOf(root);
  const first = root.querySelector("h2, p.glossary-term");
  if (!first || !root.querySelector("p.glossary-term")) return null;

  const tools = el(doc, "div", "glossary-tools");
  const label = el(doc, "label", "glossary-search-label", "Buscar en el glosario");
  label.setAttribute("for", "glossary-search");
  const status = el(doc, "span", "glossary-status");
  status.setAttribute("role", "status");
  const top = el(doc, "div", "glossary-tools-top");
  top.append(label, status);

  const input = el(doc, "input", "glossary-search");
  input.id = "glossary-search";
  input.setAttribute("type", "search");
  input.setAttribute("placeholder", "Término o nombre a evitar");
  input.setAttribute("autocomplete", "off");
  input.setAttribute("spellcheck", "false");
  const field = el(doc, "div", "glossary-search-field");
  const key = el(doc, "kbd", "glossary-search-key", "/");
  key.setAttribute("aria-hidden", "true");
  field.append(input, key);
  tools.append(top, field);

  // With one group there is nowhere to jump to.
  if (groups.length > 1) {
    const index = el(doc, "nav", "glossary-index");
    index.setAttribute("aria-label", "Grupos del glosario");
    for (const { heading, terms } of groups) {
      const entry = el(doc, "a", "glossary-index-entry");
      entry.setAttribute("href", heading.querySelector("a")?.getAttribute("href") ?? `#${heading.id}`);
      entry.setAttribute("data-group", heading.id);
      entry.append(el(doc, "span", "glossary-index-name", heading.textContent.trim()), " ");
      entry.append(el(doc, "span", "glossary-index-count", terms.length));
      index.append(entry);
    }
    tools.append(index);
  }

  const empty = el(doc, "p", "glossary-empty");
  empty.hidden = true;
  const clear = el(doc, "button", "glossary-empty-clear", "Borrar la búsqueda");
  clear.setAttribute("type", "button");
  empty.append("Ningún término dice «", el(doc, "span", "glossary-empty-query"), "». ", clear);
  tools.append(empty);

  first.before(tools);
  input.addEventListener("input", () => filterTerms(root, input.value));
  const reset = () => {
    input.value = "";
    filterTerms(root, "");
    input.focus();
  };
  clear.addEventListener("click", reset);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && input.value) reset();
  });
  filterTerms(root, "");
  return input;
}

/**
 * Marks the term a link names and scrolls to it; any term marked before is unmarked. A search in
 * progress is cleared if it hides the term. Returns whether the page has that term.
 */
export function landOn(root, id) {
  let found = null;
  for (const term of root.querySelectorAll("p.glossary-term")) {
    term.classList.remove("glossary-term-wanted");
    if (id && term.id === id) found = term;
  }
  if (!found) return false;
  if (found.hidden) {
    const input = root.querySelector(".glossary-search");
    if (input) input.value = "";
    filterTerms(root, "");
  }
  found.classList.add("glossary-term-wanted");
  found.scrollIntoView();
  return true;
}

export function glossaryTerms() {
  return (hook, vm) => {
    // "/" takes the cursor to the search box, from anywhere on a glossary page.
    hook.mounted(() => {
      document.addEventListener("keydown", (event) => {
        if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
        if (/^(INPUT|TEXTAREA|SELECT)$/.test(event.target?.tagName) || event.target?.isContentEditable) return;
        const input = document.querySelector("#main .glossary-search");
        if (!input) return;
        event.preventDefault();
        input.focus();
      });
      // A click on a term's address changes the link but not the page, so nothing is drawn again.
      addEventListener("hashchange", () => {
        const main = document.querySelector("#main");
        if (!main?.querySelector(".glossary-tools")) return;
        landOn(main, new URLSearchParams(location.hash.split("?")[1] || "").get("id"));
      });
    });

    hook.doneEach(() => {
      if (!isGlossary(vm.route.file)) return;
      const main = document.querySelector("#main");
      if (!main) return;
      markTerms(main, vm.route.path);
      buildTools(main);
      landOn(main, vm.route.query?.id);
    });
  };
}
