#!/usr/bin/env python3
"""The copy button (plugins/copy-button.js) in Chromium, as a person and as an agent.

Every code block, terminal, PR diff and PR example exposes `<as-copy-button>`: a person clicks to
copy to the clipboard, and an agent sees it in UI SDK's snapshot and calls `act({ action: "copy" })`
to copy and receive the exact text.

    python3 packages/docs-site/test/copy_button_agente.py

Needs Python Playwright with its Chromium (`pip install playwright && playwright install chromium`).
"""
import json
import pathlib
import socket
import subprocess
import sys
import time
import urllib.request

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]

failures = []


def check(name, ok, why=""):
    print(f"  {'✓' if ok else '✗'} {name}{'' if ok else f': {why}'}")
    if not ok:
        failures.append(f"{name}: {why}")


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def main():
    port = free_port()
    server = subprocess.Popen(
        [
            "node",
            str(ROOT / "bin/serve.mjs"),
            str(ROOT / "docs"),
            "--port",
            str(port),
            "--components",
            str(ROOT / "docs/propios/retro-semanal.js"),
            "--components",
            str(ROOT / "docs/propios/ui-sdk-demos.js"),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        for _ in range(100):
            try:
                urllib.request.urlopen(f"http://localhost:{port}/")
                break
            except OSError:
                time.sleep(0.1)
        with sync_playwright() as p:
            browser = p.chromium.launch()
            run(browser, f"http://localhost:{port}/")
            browser.close()
    finally:
        server.terminate()
        server.wait()
    print(f"FALLA: {len(failures)} problemas" if failures else "OK: 0 problemas")
    sys.exit(1 if failures else 0)


def open_context(browser):
    ctx = browser.new_context(
        viewport={"width": 1280, "height": 900},
        permissions=["clipboard-read", "clipboard-write"],
    )
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    return ctx, page, errors


def go(page, url, selector):
    page.goto(url)
    page.wait_for_selector(selector, timeout=30000)
    page.wait_for_timeout(400)


def copy_entries(page):
    return page.evaluate("window.agent.snapshot().filter((e) => e.component === 'copy-button')")


def run(browser, base):
    ctx, page, errors = open_context(browser)

    # 1. Fenced HTML code block on UI SDK Getting Started
    print("#/ui-sdk/01-getting-started")
    go(page, base + "#/ui-sdk/01-getting-started", 'as-copy-button button[aria-label="Copy html"]')
    entries = copy_entries(page)
    html_entry = next((e for e in entries if e.get("label") == "Copy html"), None)
    check(
        "snapshot lists the fenced HTML copy button with action copy",
        bool(html_entry) and html_entry.get("actions") == ["copy"],
        json.dumps(entries),
    )

    out = page.evaluate("window.agent.act({ steps: [{ ref: 'Copy html', action: 'copy' }] })")
    copied_html = ((out.get("steps") or [{}])[0]).get("result", "")
    clip = page.evaluate("navigator.clipboard.readText()")
    btn_text = page.evaluate("""document.querySelector('button[aria-label="Copy html"]').textContent.trim()""")
    check(
        "act copy returns the standalone HTML snippet and writes it to the clipboard",
        out.get("ok") is True and copied_html.startswith("<!DOCTYPE html>") and clip == copied_html,
        f"ok={out.get('ok')} len={len(copied_html)} clip_eq={clip == copied_html}",
    )
    check("act copy shows Copied feedback on the button", btn_text == "Copied", repr(btn_text))

    # Word wrap toggle on the fenced HTML block
    wrap_btn = 'button[aria-label="Toggle word wrap for html"]'
    before_w = page.evaluate(
        """(sel) => {
          const btn = document.querySelector(sel);
          const code = btn.closest('figure.window').querySelector('pre[data-lang] > code');
          return { pressed: btn.getAttribute('aria-pressed'), ws: getComputedStyle(code).whiteSpace, scrollW: code.scrollWidth, clientW: code.clientWidth };
        }""",
        wrap_btn,
    )
    page.click(wrap_btn)
    page.wait_for_timeout(100)
    wrapped_w = page.evaluate(
        """(sel) => {
          const btn = document.querySelector(sel);
          const code = btn.closest('figure.window').querySelector('pre[data-lang] > code');
          return { pressed: btn.getAttribute('aria-pressed'), ws: getComputedStyle(code).whiteSpace, scrollW: code.scrollWidth, clientW: code.clientWidth };
        }""",
        wrap_btn,
    )
    page.click(wrap_btn)
    page.wait_for_timeout(100)
    after_w = page.evaluate("(sel) => document.querySelector(sel).getAttribute('aria-pressed')", wrap_btn)
    check(
        "word wrap toggles pre-wrap on and off without horizontal overflow",
        before_w["pressed"] == "false"
        and wrapped_w["pressed"] == "true"
        and wrapped_w["ws"] == "pre-wrap"
        and wrapped_w["scrollW"] <= wrapped_w["clientW"] + 1
        and after_w == "false",
        f"{before_w} -> {wrapped_w} -> {after_w}",
    )

        # Human click after clipboard reset
    page.evaluate("navigator.clipboard.writeText('')")
    page.click('button[aria-label="Copy html"]')
    page.wait_for_timeout(150)
    clip_click = page.evaluate("navigator.clipboard.readText()")
    check(
        "a human click on Copy html copies the exact same HTML snippet",
        clip_click == copied_html and "createAgent" in clip_click,
        f"len={len(clip_click)}",
    )

    # The copied hello.html actually runs standalone in its own page
    hello = ctx.new_page()
    hello_errors = []
    hello.on("pageerror", lambda e: hello_errors.append(str(e)))
    hello.on("console", lambda m: hello_errors.append(m.text) if m.type == "error" else None)
    hello.set_content(copied_html, wait_until="networkidle")
    hello.wait_for_function("() => Boolean(window.agent && window.agent.snapshot().length > 0)", timeout=20000)
    h_act = hello.evaluate("window.agent.act({ steps: [{ ref: 'Notas de despliegue', action: 'setOpen', args: [true] }] })")
    h_open = hello.evaluate("window.agent.snapshot()[0]?.open")
    check(
        "the copied hello.html runs standalone with window.agent",
        h_act.get("ok") is True and h_open is True and not hello_errors,
        f"ok={h_act.get('ok')} open={h_open} errors={hello_errors}",
    )
    hello.close()

    # 2. Terminal component
    print("#/componentes/terminal")
    go(
        page,
        base + "#/componentes/terminal",
        'as-copy-button button[aria-label="Copy: npm run check:docs -- packages/docs-site/docs"]',
    )
    term_entries = copy_entries(page)
    check(
        "SPA navigation drops previous page's copy buttons (no offPage leaks)",
        all(not e.get("offPage") for e in term_entries) and not any(e.get("label") == "Copy html" for e in term_entries),
        json.dumps(term_entries),
    )
    term_out = page.evaluate(
        "window.agent.act({ steps: [{ ref: 'Copy: npm run check:docs -- packages/docs-site/docs', action: 'copy' }] })"
    )
    term_text = ((term_out.get("steps") or [{}])[0]).get("result", "")
    check(
        "act copy on a terminal returns its command",
        term_out.get("ok") is True and term_text == "npm run check:docs -- packages/docs-site/docs",
        repr(term_text),
    )

    # 3. PR diff and PR code example
    print("#/prs/66")
    go(page, base + "#/prs/66", 'as-copy-button button[aria-label="Copy packages/docs-site/site.js"]')
    pr_entries = copy_entries(page)
    labels = [e.get("label") for e in pr_entries]
    check(
        "PR summary exposes copy buttons for both diffs and code examples",
        "Copy packages/docs-site/site.js" in labels and "Copy javascript example" in labels,
        json.dumps(labels),
    )

    diff_out = page.evaluate("window.agent.act({ steps: [{ ref: 'Copy packages/docs-site/site.js', action: 'copy' }] })")
    diff_text = ((diff_out.get("steps") or [{}])[0]).get("result", "")
    check(
        "act copy on a PR diff returns its code",
        diff_out.get("ok") is True and "uiSdk(" in diff_text and "define-element" in diff_text,
        repr(diff_text[:120]),
    )

    ex_out = page.evaluate("window.agent.act({ steps: [{ ref: 'Copy javascript example', action: 'copy' }] })")
    ex_text = ((ex_out.get("steps") or [{}])[0]).get("result", "")
    check(
        "act copy on a PR code example returns its code",
        ex_out.get("ok") is True and "agent.act" in ex_text,
        repr(ex_text[:120]),
    )

    page.evaluate("navigator.clipboard.writeText('')")
    page.click('button[aria-label="Copy packages/docs-site/site.js"]')
    page.wait_for_timeout(150)
    clip_diff = page.evaluate("navigator.clipboard.readText()")
    check("a human click on a PR diff copy button writes its code to the clipboard", clip_diff == diff_text, f"len={len(clip_diff)}")

    check("no errors in the console", not errors, f"{errors[:3]}")
    ctx.close()


if __name__ == "__main__":
    main()
