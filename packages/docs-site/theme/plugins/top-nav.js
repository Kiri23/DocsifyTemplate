// The bar across the top: the name of the site and its links. The sidebar keeps Docsify 5's own
// left-edge toggle handle (the three dots), so the top bar does not add a hamburger button. It
// never changes after it is drawn, so it is plain DOM, not a component.

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
      nav.append(brandLink(brand ?? vm.config.name, home), linkList(links));
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
    if (isCurrentPage(href)) {
      a.setAttribute("aria-current", "page");
    }
    const li = document.createElement("li");
    li.append(a);
    ul.append(li);
  }
  return ul;
}

/** Whether `href` points to the current site path (ignoring hash/query routes, since topNav draws once). */
function isCurrentPage(href) {
  if (!href || href.startsWith("#") || href.startsWith("?")) return false;
  try {
    const target = new URL(href, location.href);
    return target.origin === location.origin &&
      dirPath(target.pathname) === dirPath(location.pathname);
  } catch {
    return false;
  }
}

/** Normalizes a trailing `/index.html` to its folder path so `./` matches `/docs/index.html`. */
function dirPath(pathname) {
  return pathname.replace(/\/index\.html$/, "/");
}
