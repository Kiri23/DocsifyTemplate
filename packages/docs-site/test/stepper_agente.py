#!/usr/bin/env python3
"""The stepper (components/stepper.js, plugins/stepper.js) in Chromium, as a person and as an agent.

The stepper is a UI SDK primitive of our own: an agent sees it in UI SDK's snapshot and moves it
with act, with no tool written for it, and a person still moves it with the mouse and the keys.

    python3 packages/docs-site/test/stepper_agente.py

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
PAGE = "componentes/stepper"

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
    server = subprocess.Popen(["node", str(ROOT / "bin/serve.mjs"), str(ROOT / "docs"), "--port", str(port)],
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
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


def open_page(browser, url):
    page = browser.new_page(viewport={"width": 1200, "height": 900})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.goto(url)
    page.wait_for_selector("as-stepper [role=tab][aria-controls]", timeout=30000)
    page.wait_for_timeout(300)
    return page, errors


def shown(page):
    """The step a person sees: the open panel, the selected dot and the line under the panels."""
    return page.evaluate("""() => {
      const s = document.querySelector('as-stepper');
      const open = [...s.querySelectorAll('as-stepper-panel')].filter((p) => !p.hidden);
      const selected = [...s.querySelectorAll('[role=tab]')].findIndex((t) => t.getAttribute('aria-selected') === 'true') + 1;
      return { open: open.map((p) => p.querySelector('h2')?.textContent.trim()), selected, status: s.querySelector('as-stepper-status').textContent.trim() };
    }""")


def run(browser, base):
    print(f"#/{PAGE}")
    page, errors = open_page(browser, base + "#/" + PAGE)
    titles = page.evaluate("[...document.querySelectorAll('as-stepper [role=tab] .as-st-title')].map((t) => t.textContent.trim())")
    count = len(titles)
    check("the stepper draws one dot per ## and opens the first step", count >= 3 and shown(page) == {"open": [titles[0]], "selected": 1, "status": f"Paso 1 de {count}"}, f"{shown(page)}")

    # The agent: UI SDK's snapshot lists the stepper, with its step and its actions.
    entry = page.evaluate("window.agent.snapshot().find((e) => e.component === 'stepper')")
    check("the agent's snapshot lists the stepper, its step and its actions", bool(entry) and entry.get("value") == 1 and entry.get("actions") == ["setValue", "next", "previous"], json.dumps(entry))
    label = (entry or {}).get("label")
    check("the stepper has a name a step can use as its ref", label == "Pasos", f"{label}")

    out = page.evaluate("window.agent.act({ steps: [{ ref: 'Pasos', action: 'setValue', args: [3] }] })")
    check("act setValue(3) opens the third step for the person too", shown(page) == {"open": [titles[2]], "selected": 3, "status": f"Paso 3 de {count}"}, f"{json.dumps(out)[:200]} → {shown(page)}")

    page.evaluate(f"window.agent.act({{ steps: [{{ ref: 'Pasos', action: 'setValue', args: [{count - 1}] }}, {{ ref: 'Pasos', action: 'next' }}] }})")
    last = page.evaluate("document.querySelector('as-stepper-next button').disabled")
    check("act next goes one forward, and at the last step the person's Next is off", shown(page)["selected"] == count and last, f"{shown(page)}, next disabled: {last}")

    out = page.evaluate(f"window.agent.act({{ steps: [{{ ref: 'Pasos', action: 'setValue', args: [{count + 5}] }}] }})")
    why = json.dumps(out)
    check("a step that isn't there is refused with the steps there are", f"steps 1 to {count}" in why and shown(page)["selected"] == count, why[:240])

    # The person: the buttons and the keys still work.
    page.click("as-stepper-previous button")
    check("a click on Previous goes one back", shown(page)["selected"] == count - 1, f"{shown(page)}")
    page.focus("as-stepper [role=tab][aria-selected=true]")
    page.keyboard.press("Home")
    home = shown(page)["selected"]
    page.keyboard.press("ArrowRight")
    right = shown(page)["selected"]
    focused = page.evaluate("document.activeElement.getAttribute('aria-selected')")
    check("Home and the arrows move the step and the focus", home == 1 and right == 2 and focused == "true", f"home {home}, right {right}, focused selected {focused}")

    # The agent sees what the person did.
    value = page.evaluate("window.agent.snapshot().find((e) => e.component === 'stepper').value")
    check("the snapshot follows the person's changes", value == 2, f"{value}")

    check("no errors in the console", not errors, f"{errors[:3]}")
    page.close()

    # A link to a step's heading opens that step.
    heading = page_id = None
    page, errors = open_page(browser, base + "#/" + PAGE)
    page_id = page.evaluate("document.querySelectorAll('as-stepper-panel h2')[2].id")
    page.close()
    page, errors = open_page(browser, base + "#/" + PAGE + "?id=" + page_id)
    check("a link to a step's heading opens that step", shown(page)["selected"] == 3, f"{page_id}: {shown(page)}")
    page.close()


if __name__ == "__main__":
    main()
