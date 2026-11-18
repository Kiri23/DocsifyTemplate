// Links to files that aren't pages. On GitHub a link to `kiri-pm` or `../scripts.ttl` opens the
// file; Docsify would turn it into a route and show a 404. A page that reads well on GitHub links
// to other pages with their `.md`, so a relative link without `.md` is a file: Docsify is told not
// to make it a route (its own `noCompileLinks`), and after the page is drawn the link points at
// the file, from the folder of the page, as on GitHub. It draws nothing, so it is plain DOM.

/** A relative link that doesn't end in .md (or in "/", a folder): no scheme, no "#", no "/". */
const FILE_LINK = String.raw`(?![a-zA-Z][a-zA-Z0-9+.-]*:)(?![#/])(?!.*\.md(?:[?#].*)?$)(?!.*/$).+`;

export function fileLinks() {
  return (hook, vm) => {
    hook.init(() => {
      vm.config.noCompileLinks = [...(vm.config.noCompileLinks || []), FILE_LINK];
    });

    hook.doneEach(() => {
      const page = new URL((vm.config.basePath || "/") + vm.route.file, location.origin);
      for (const a of document.querySelectorAll("#main a[href]")) {
        const href = a.getAttribute("href");
        if (!new RegExp(`^${FILE_LINK}$`).test(href)) continue;
        a.setAttribute("href", new URL(href, page).pathname);
        a.removeAttribute("target");
        a.removeAttribute("rel");
      }
    });
  };
}
