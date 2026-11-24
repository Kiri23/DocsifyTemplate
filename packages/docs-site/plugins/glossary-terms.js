// The terms of a GLOSSARY.md (the format of Matt Pocock's domain-modeling skill), each one with its
// own address. A term is a paragraph that starts with "**Term**:" and may end with "_Avoid_: …".
// Docsify only gives headings an id, so a link to `#/_catalogo/GLOSSARY?id=site-js` would land at
// the top of the page. After the page is drawn, each term gets the id kiri-glosario gives it in
// vocabulary.ttl (glosario:site-js), and the page scrolls to the one the link names. A summary of a
// PR (docs/prs/) and a PR body link to the glossary that way. It draws nothing, so it is plain DOM.

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

/** Marks each term of the page in `root` with its id. Returns the ids, in the page's order. */
export function markTerms(root) {
  const ids = [];
  for (const paragraph of root.querySelectorAll("p")) {
    const name = paragraph.firstElementChild;
    const after = name?.nextSibling;
    if (name?.tagName !== "STRONG" || paragraph.firstChild !== name) continue;
    if (after?.nodeType !== 3 || !after.textContent.startsWith(":")) continue;
    const id = termSlug(name.textContent);
    if (!id) continue;
    paragraph.id = id;
    paragraph.classList.add("glossary-term");
    name.classList.add("glossary-term-name");
    // The names not to use go on a line of their own, below the definition.
    const avoid = [...paragraph.querySelectorAll("em")].find((em) => em.textContent === "Avoid");
    if (avoid) {
      const line = paragraph.ownerDocument.createElement("span");
      line.className = "glossary-term-avoid";
      while (avoid.nextSibling) line.append(avoid.nextSibling);
      line.prepend(avoid);
      paragraph.append(line);
    }
    ids.push(id);
  }
  return ids;
}

export function glossaryTerms() {
  return (hook, vm) => {
    hook.doneEach(() => {
      if (!isGlossary(vm.route.file)) return;
      const main = document.querySelector("#main");
      if (!main) return;
      const ids = markTerms(main);
      const wanted = vm.route.query?.id;
      if (!wanted || !ids.includes(wanted)) return;
      const term = document.getElementById(wanted);
      term.classList.add("glossary-term-wanted");
      term.scrollIntoView();
    });
  };
}
