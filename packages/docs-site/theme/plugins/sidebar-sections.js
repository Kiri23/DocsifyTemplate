// The sidebar in sections, like react.dev. Docsify 5 already turns an item of _sidebar.md with no
// link into a section title; this adds what it leaves out: each section is named for a screen
// reader, the section of the open page is marked, and on a phone the drawer closes once a page is
// picked. It draws nothing of its own, so it is plain DOM.

export function sidebarSections() {
  return (hook) => {
    let picked = false;

    hook.mounted(() => {
      document.querySelector(".sidebar")?.addEventListener("click", (event) => {
        picked = event.target.closest("a.page-link") !== null;
      });
    });

    hook.doneEach(() => {
      const nav = document.querySelector(".sidebar-nav");
      if (!nav) return;
      nav.querySelectorAll(":scope > ul > li.group").forEach((section, i) => {
        const title = section.querySelector(":scope > p");
        const list = section.querySelector(":scope > ul");
        if (title && list) {
          title.id ||= `sidebar-section-${i + 1}`;
          list.setAttribute("aria-labelledby", title.id);
        }
        const open = section.querySelector('[aria-current="page"]') !== null;
        section.classList.toggle("current-section", open);
      });
      if (picked && onPhone() && document.querySelector(".sidebar.show")) {
        document.querySelector("button.sidebar-toggle")?.click();
      }
      picked = false;
    });
  };
}

/** Whether the screen is as narrow as Docsify's own idea of a phone. */
function onPhone() {
  const width = getComputedStyle(document.documentElement).getPropertyValue("--_mobile-breakpoint");
  return matchMedia(`(max-width: ${width || "640px"})`).matches;
}
