// The bar across the top: the name of the site, its links and, on a phone, the button that opens
// the sidebar. It never changes after it is drawn, so it is plain DOM, not a component.

/**
 * @param {object} [options]
 * @param {string} [options.brand] the name on the left; Docsify's `name` if left out
 * @param {string} [options.home] where the name links to
 * @param {{ text: string, href: string }[]} [options.links] the links on the right, in order
 */
export function topNav({ brand, home = "/", links = [] } = {}) {
  return (hook, vm) => {
    hook.mounted(() => {
      const nav = document.createElement("header");
      nav.className = "top-nav";
      const toggle = document.querySelector("button.sidebar-toggle");
      if (toggle) nav.append(menuButton(toggle));
      nav.append(brandLink(brand ?? vm.config.name, home), linkList(links));
      // Inside <main>, next to the sidebar: Docsify makes the rest of the page inert while the
      // drawer is open on a phone, and the button has to stay usable to close it.
      document.querySelector("main").prepend(nav);
    });
  };
}

/** The brand: the landing's amber mark and the name. */
function brandLink(name, home) {
  const a = document.createElement("a");
  a.className = "top-nav-brand";
  a.href = home;
  a.innerHTML = '<span class="logo-mark" aria-hidden="true">▍</span>';
  a.append(name);
  return a;
}

/** The links; the one that points to this page says so. */
function linkList(links) {
  const ul = document.createElement("ul");
  ul.className = "top-nav-links";
  for (const { text, href } of links) {
    const a = document.createElement("a");
    a.href = href;
    a.textContent = text;
    if (new URL(href, location.href).pathname === location.pathname) {
      a.setAttribute("aria-current", "page");
    }
    const li = document.createElement("li");
    li.append(a);
    ul.append(li);
  }
  return ul;
}

/** The menu button. It presses Docsify's own sidebar toggle, so Docsify keeps doing the opening,
 *  the closing and the screen reader labels; the button only takes its place on a phone. It has no
 *  type attribute: Docsify styles every button[type] as one of its own. */
function menuButton(toggle) {
  const button = document.createElement("button");
  button.className = "top-nav-menu";
  const open = document.querySelector(".sidebar.show") !== null;
  button.setAttribute("aria-controls", "__sidebar");
  button.setAttribute("aria-expanded", String(open));
  button.setAttribute("aria-label", open ? "Hide primary navigation" : "Show primary navigation");
  button.innerHTML =
    '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 5h14M3 10h14M3 15h14"' +
    ' stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/></svg>';
  button.addEventListener("click", () => toggle.click());
  return button;
}
