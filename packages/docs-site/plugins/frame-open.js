// A page embedded with Docsify's iframe include (`[#55](55.html ':include :type=iframe')`) is
// drawn inside the page, at the width of the content column. After the page is drawn, each
// iframe gets a link above it that opens what it shows in a tab of its own, at full width.
// It is plain DOM, no Preact.

/** Puts an "open in a new tab" link above each iframe in `root`. Returns how many it added. */
export function addOpenLinks(root) {
  const doc = root.ownerDocument;
  let added = 0;
  for (const frame of root.querySelectorAll("iframe[src]")) {
    // A page drawn again keeps the link it already has.
    if (frame.previousElementSibling?.classList.contains("frame-open")) continue;
    const link = doc.createElement("a");
    link.className = "frame-open";
    // The same address the iframe loads, already resolved by the browser.
    link.href = frame.src || frame.getAttribute("src");
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "Abrir en página completa ↗";
    frame.before(link);
    added += 1;
  }
  return added;
}

export function frameOpen() {
  return (hook) => {
    hook.doneEach(() => {
      const main = document.querySelector("#main");
      if (main) addOpenLinks(main);
    });
  };
}
