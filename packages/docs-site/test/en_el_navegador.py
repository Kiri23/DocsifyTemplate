#!/usr/bin/env python3
"""Opens every page of a docs folder in a headless Chromium and fails on anything the console says.

It starts bin/serve.mjs for the folder, visits the home page and every page the sidebar links to,
and collects console errors and warnings (the `as:` plugin warns when it leaves Markdown as is),
uncaught errors, responses of 400 or more and links to files that don't open. It counts the components each page drew. With
--shots it saves a screenshot per page. The server is stopped at the end, pass or fail.

    python3 packages/docs-site/test/en_el_navegador.py packages/docs-site/docs --shots /tmp/shots
    python3 packages/docs-site/test/en_el_navegador.py ~/Code/MyClaudeSkills --home bin/SCRIPTS.md --max 20
    python3 packages/docs-site/test/en_el_navegador.py packages/docs-site/docs \
        --components packages/docs-site/docs/propios/retro-semanal.js --width 390

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
    args.add_argument("--components", action="append", default=[], help="a component module of the repo, as serve.mjs takes it")
    args.add_argument("--width", type=int, default=1280, help="the window's width: 390 is a phone")
    args.add_argument("--expect", action="append", default=[], help="a component name that at least one visited page must draw")
    opts = args.parse_args()

    base = f"http://localhost:{opts.port}/"
    server = subprocess.Popen(
        ["node", str(ROOT / "bin/serve.mjs"), opts.folder, "--home", opts.home, "--port", opts.port]
        + [arg for path in opts.components for arg in ("--components", path)],
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
    seen_components = set()
    animated_routes = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(viewport={"width": opts.width, "height": 900})
        context.grant_permissions(["clipboard-read", "clipboard-write"], origin=base.rstrip("/"))
        page = context.new_page()
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
            # No code or terminal window may be wrapped twice by codeWindow().
            if page.locator("#main .window .window").count() > 0:
                said.append("ventana .window envuelta dos veces por codeWindow()")
            # Each link to a file of the site (not a page, not another site) has to open it.
            for href in page.eval_on_selector_all(
                "#main a[href]", "as => as.map(a => a.href).filter(h => h.startsWith(location.origin) && !h.includes('#'))"
            ):
                code = page.request.get(href).status
                if code >= 400:
                    said.append(f"link a archivo roto: {href} → {code}")
            drawn = page.eval_on_selector_all("#main .as", "els => els.map(e => e.className)")
            for cls in drawn:
                for token in cls.split():
                    if token.startswith("as-"):
                        seen_components.add(token[3:])
            if page.locator("#main .as-terminal").count() > 0:
                terminal_issues, has_animated = check_terminals(page)
                said.extend(terminal_issues)
                if has_animated:
                    animated_routes.append(route)
            h1 = page.query_selector("#main h1")
            title = h1.text_content() if h1 else "(sin título)"
            mark = "✗" if said else "✓"
            print(f"{mark} #{route}  «{title.strip()}»  componentes: {len(drawn)} {drawn if drawn else ''}")
            for line in said:
                print(f"    {line}")
            failures += len(said)
            if opts.shots:
                page.evaluate("() => window.scrollTo(0, 0)")
                page.wait_for_timeout(100)
                folder = pathlib.Path(opts.shots)
                folder.mkdir(parents=True, exist_ok=True)
                page.screenshot(path=str(folder / f"{i:02d}.png"), full_page=True)

        # Verify animated terminals fall back to static rendering under prefers-reduced-motion.
        for route in animated_routes:
            reduced_issues = check_reduced_motion(browser, base, route, opts.width)
            if reduced_issues:
                print(f"✗ #{route}  [prefers-reduced-motion: reduce]")
                for line in reduced_issues:
                    print(f"    {line}")
                failures += len(reduced_issues)
            else:
                print(f"✓ #{route}  [prefers-reduced-motion: reduce]")

        for expected in opts.expect:
            if expected not in seen_components:
                print(f"✗ --expect {expected}: ninguna página dibujó as-{expected}")
                failures += 1

        context.close()
        browser.close()
    return failures


def check_terminals(page):
    """Checks static, prototype, animated and Copy behaviour for every terminal on the page."""
    issues = []
    has_animated = False
    windows = page.locator("#main .as-terminal .terminal-window")
    count = windows.count()
    if count == 0:
        return ["as-terminal sin .terminal-window"], False

    # Check below-the-fold animated terminals before any click scrolls the page.
    for idx in range(count):
        win = windows.nth(idx)
        if win.locator(".terminal-stage").count() == 0:
            continue
        ghost = win.locator("pre.terminal-ghost")
        live = win.locator("pre.terminal-live")
        if ghost.count() != 1 or live.count() != 1:
            continue
        total_lines = len((ghost.text_content() or "").split("\n"))
        below_fold = win.evaluate("el => el.getBoundingClientRect().top >= window.innerHeight")
        if below_fold and total_lines > 1:
            page.wait_for_timeout(300)
            before_lines = len((live.text_content() or "").split("\n"))
            if before_lines != 1:
                issues.append(f"terminal[{idx}]: animó fuera de viewport (tenía {before_lines} líneas antes de scrollear)")

    for idx in range(count):
        win = windows.nth(idx)
        tag = f"terminal[{idx}]"
        if win.locator("[style]").count() > 0:
            issues.append(f"{tag}: contiene estilos inline")
        copy_buttons = win.locator(".copy-button")
        if copy_buttons.count() != 1:
            issues.append(f"{tag}: esperaba 1 .copy-button, encontré {copy_buttons.count()}")

        is_animated = win.locator(".terminal-stage").count() > 0
        if is_animated:
            has_animated = True
            ghost = win.locator("pre.terminal-ghost")
            live = win.locator("pre.terminal-live")
            if ghost.count() != 1 or live.count() != 1:
                issues.append(f"{tag}: modo animado sin terminal-ghost + terminal-live")
            else:
                ghost_hidden = ghost.evaluate("el => getComputedStyle(el).visibility === 'hidden'")
                if not ghost_hidden:
                    issues.append(f"{tag}: pre.terminal-ghost debe tener visibility: hidden")
                stacked = win.evaluate(
                    "el => {"
                    "  const g = el.querySelector('pre.terminal-ghost').getBoundingClientRect();"
                    "  const l = el.querySelector('pre.terminal-live').getBoundingClientRect();"
                    "  return Math.abs(g.top - l.top) < 1 && Math.abs(g.left - l.left) < 1;"
                    "}"
                )
                if not stacked:
                    issues.append(f"{tag}: terminal-ghost y terminal-live no se superponen en la misma celda")

                # Scrolling into view must trigger line-by-line playback until completion without clicking Show all.
                ghost_text = ghost.text_content() or ""
                total_lines = len(ghost_text.split("\n"))
                win.scroll_into_view_if_needed()
                if total_lines > 1:
                    try:
                        page.wait_for_function(
                            "el => el.querySelectorAll('.terminal-btn').length === 1"
                            " && el.querySelector('pre.terminal-live').textContent === el.querySelector('pre.terminal-ghost').textContent",
                            arg=win.element_handle(),
                            timeout=6000,
                        )
                    except Exception:
                        shown_now = len((live.text_content() or "").split("\n"))
                        issues.append(f"{tag}: no completó la animación al entrar en viewport ({shown_now}/{total_lines} líneas)")

            replay = win.locator(".terminal-btn", has_text="Replay")
            if replay.count() != 1:
                issues.append(f"{tag}: modo animado sin botón Replay")
            else:
                # Replay must reset back to 1 line and bring Show all back.
                replay.click()
                after_replay_lines = len((live.text_content() or "").split("\n"))
                if after_replay_lines != 1:
                    issues.append(f"{tag}: Replay no reinició a 1 línea (quedó en {after_replay_lines})")
                show_all = win.locator(".terminal-btn", has_text="Show all")
                if show_all.count() != 1:
                    issues.append(f"{tag}: tras Replay no apareció botón Show all")
                else:
                    show_all.click()
                    if win.locator(".terminal-btn", has_text="Show all").count() != 0:
                        issues.append(f"{tag}: Show all no desapareció al completar")
                    if (live.text_content() or "") != (ghost.text_content() or ""):
                        issues.append(f"{tag}: Show all no mostró todo el contenido")
                    replay_focused = replay.evaluate("el => document.activeElement === el")
                    if not replay_focused:
                        issues.append(f"{tag}: Show all no movió el foco al botón Replay")
        else:
            if win.locator("pre").count() != 1:
                issues.append(f"{tag}: modo estático esperaba 1 <pre>, encontré {win.locator('pre').count()}")
            if win.locator("pre.terminal-ghost").count() != 0:
                issues.append(f"{tag}: modo estático no debe tener terminal-ghost")
            if win.locator(".terminal-btn").count() != 0:
                issues.append(f"{tag}: modo estático no debe tener botones Show all/Replay")

        estado = win.get_attribute("data-estado")
        if estado == "prototipo":
            badge = win.locator(".terminal-estado")
            if badge.count() != 1 or (badge.text_content() or "").strip() != "prototipo":
                issues.append(f"{tag}: data-estado=prototipo sin badge .terminal-estado")

        # Verify Copy writes to the clipboard and updates the button label.
        if copy_buttons.count() == 1:
            copy_btn = copy_buttons.first
            copy_btn.click()
            try:
                page.wait_for_function(
                    "el => el.textContent.trim() === 'Copied'",
                    arg=copy_btn.element_handle(),
                    timeout=2000,
                )
            except Exception:
                issues.append(f"{tag}: Copy no cambió a 'Copied' (quedó {(copy_btn.text_content() or '').strip()!r})")
            copied = page.evaluate("() => navigator.clipboard.readText()")
            cmd_title = win.locator(".terminal-cmd").get_attribute("title") or ""
            if cmd_title.startswith("$ "):
                expected_copy = cmd_title[2:]
                if copied != expected_copy:
                    issues.append(f"{tag}: Copy copió {copied!r}, esperaba {expected_copy!r}")
            elif not copied:
                issues.append(f"{tag}: el portapapeles quedó vacío tras Copy")

    return issues, has_animated


def check_reduced_motion(browser, base, route, width):
    """Opens a route with prefers-reduced-motion: reduce and ensures terminals stay static."""
    issues = []
    context = browser.new_context(viewport={"width": width, "height": 900}, reduced_motion="reduce")
    page = context.new_page()
    try:
        page.goto(f"{base}#{route}")
        settle(page)
        if page.locator("#main .as-terminal pre.terminal-ghost").count() > 0:
            issues.append("con prefers-reduced-motion: reduce no debe dibujar terminal-ghost")
        if page.locator("#main .as-terminal .terminal-btn").count() > 0:
            issues.append("con prefers-reduced-motion: reduce no debe mostrar Show all/Replay")
    finally:
        context.close()
    return issues


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
