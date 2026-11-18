#!/usr/bin/env python3
"""Opens every page of a docs folder in a headless Chromium and fails on anything the console says.

It starts bin/serve.mjs for the folder, visits the home page and every page the sidebar links to,
and collects console errors and warnings (the `as:` plugin warns when it leaves Markdown as is),
uncaught errors and responses of 400 or more. It counts the components each page drew. With
--shots it saves a screenshot per page. The server is stopped at the end, pass or fail.

    python3 packages/docs-site/test/en_el_navegador.py packages/docs-site/docs --shots /tmp/shots
    python3 packages/docs-site/test/en_el_navegador.py ~/Code/MyClaudeSkills --home bin/SCRIPTS.md --max 20

Needs Python Playwright with its Chromium (`pip install playwright && playwright install chromium`).
"""
import argparse
import pathlib
import subprocess
import sys
import time
import urllib.request

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]


def main():
    args = argparse.ArgumentParser()
    args.add_argument("folder")
    args.add_argument("--home", default="README.md")
    args.add_argument("--port", default="3019")
    args.add_argument("--max", type=int, default=50, help="how many sidebar pages to visit at most")
    args.add_argument("--shots", help="a folder for one screenshot per page")
    opts = args.parse_args()

    base = f"http://localhost:{opts.port}/"
    server = subprocess.Popen(
        ["node", str(ROOT / "bin/serve.mjs"), opts.folder, "--home", opts.home, "--port", opts.port],
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
    )
    try:
        wait_for(base)
        failures = visit_all(base, opts)
    finally:
        server.terminate()
        server.wait()
    print(f"\n{'FALLA' if failures else 'OK'}: {failures} problemas")
    sys.exit(1 if failures else 0)


def wait_for(url):
    """Waits until the server answers, up to five seconds."""
    for _ in range(50):
        try:
            urllib.request.urlopen(url)
            return
        except OSError:
            time.sleep(0.1)
    raise SystemExit(f"el servidor no respondió en {url}")


def visit_all(base, opts):
    """Visits the home page and the sidebar's pages; returns how many problems it saw."""
    failures = 0
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1280, "height": 900})
        said = []
        page.on("console", lambda m: m.type in ("error", "warning") and said.append(f"{m.type}: {m.text}"))
        page.on("pageerror", lambda e: said.append(f"pageerror: {e}"))
        page.on("response", lambda r: r.status >= 400 and said.append(f"HTTP {r.status} {r.url}"))

        page.goto(base)
        settle(page)
        routes = [page.url.split("#", 1)[1] if "#" in page.url else "/"]
        routes += page.eval_on_selector_all(
            ".sidebar-nav a.page-link[href^='#/']", "as => as.map(a => a.getAttribute('href').slice(1))"
        )
        routes = list(dict.fromkeys(routes))[: opts.max]
        sidebar = sidebar_links(page)

        for i, route in enumerate(routes):
            # The first page keeps what the console said while the site loaded.
            if i > 0:
                said.clear()
                page.goto(f"{base}#{route}")
                settle(page)
            # The sidebar is the same on every page: a link that changes with the page is relative.
            if sidebar_links(page) != sidebar:
                said.append("el sidebar cambia en esta página: sus links tienen que empezar en /")
            drawn = page.eval_on_selector_all("#main .as", "els => els.map(e => e.className)")
            h1 = page.query_selector("#main h1")
            title = h1.text_content() if h1 else "(sin título)"
            mark = "✗" if said else "✓"
            print(f"{mark} #{route}  «{title.strip()}»  componentes: {len(drawn)} {drawn if drawn else ''}")
            for line in said:
                print(f"    {line}")
            failures += len(said)
            if opts.shots:
                folder = pathlib.Path(opts.shots)
                folder.mkdir(parents=True, exist_ok=True)
                page.screenshot(path=str(folder / f"{i:02d}.png"), full_page=True)
        browser.close()
    return failures


def sidebar_links(page):
    """Where each page link of the sidebar points, in order (not the headings it lists under the
    open page)."""
    return page.eval_on_selector_all(
        ".sidebar-nav a[href]", "as => as.map(a => a.getAttribute('href')).filter(h => !h.includes('?id='))"
    )


def settle(page):
    """Waits until Docsify drew the page and the module scripts had time to run."""
    page.wait_for_function("document.querySelector('#main')?.children.length > 0", timeout=15000)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(400)


if __name__ == "__main__":
    main()
