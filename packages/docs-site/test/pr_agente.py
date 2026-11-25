#!/usr/bin/env python3
"""The PR summaries of the site in a headless Chromium, as a reader and as an AI agent sees them.

For docs/prs/55.md, docs/prs/59.md, docs/prs/63.md and test/fixtures/pr/7.md (every block of
summarize-pr's catalog), it opens the page that bin/serve.mjs serves and checks:

  A. One copy of @ui-sdk/core: the agent's snapshot is not empty, and the page loads one version.
  B. The agent sees what the page has: a decision per decision, the Split/Unified control, a group
     per test file, a chart source per chart, the hidden code of each diff that has it.
  C. The agent can use it: open each decision, switch the diffs to unified, show hidden code.
  D. The agent reads the prose without the DOM: the why and trade-off of each decision, the notes
     and each term's definition, through the `read` tool.
  T. What summarize-pr's template shows (its SKILL.md, Form, "The template shows…"), one check each.

What each page has comes from its HTML (bin/pr.mjs --json), not from the drawn page.

    python3 packages/docs-site/test/pr_agente.py
    python3 packages/docs-site/test/pr_agente.py --only 59 --shots /tmp/pr-shots

Needs Python Playwright with its Chromium (`pip install playwright && playwright install chromium`).
"""
import argparse
import json
import pathlib
import re
import subprocess
import sys
import time
import urllib.request

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
PAGES = {
    "55": ROOT / "docs/prs/55.html",
    "59": ROOT / "docs/prs/59.html",
    "63": ROOT / "docs/prs/63.html",
    "7": ROOT / "test/fixtures/pr/7.html",
}
PAGE_COMMENT_TITLE = "Not in the code: this comment is only on this page."


def main():
    args = argparse.ArgumentParser()
    args.add_argument("--only", action="append", help="a page: 55, 59, 63 or 7")
    args.add_argument("--shots", help="a folder for screenshots at 1400 and 390")
    opts = args.parse_args()
    pages = {n: p for n, p in PAGES.items() if not opts.only or n in opts.only}
    data = json.loads(subprocess.check_output(["node", str(ROOT / "bin/pr.mjs"), *map(str, pages.values()), "--json"]))
    servers = {
        "docs": serve(ROOT / "docs", "3051"),
        "fixtures": serve(ROOT / "test/fixtures/pr", "3052"),
    }
    failures = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            for n in pages:
                base = servers["fixtures" if n == "7" else "docs"]
                route = f"{n}" if n == "7" else f"prs/{n}"
                failures += check_page(browser, base, route, n, data[n], opts.shots)
            browser.close()
    finally:
        for server in servers.values():
            server["process"].terminate()
            server["process"].wait()
    for failure in failures:
        print(f"  ✗ {failure}")
    print(f"\n{'FALLA' if failures else 'OK'}: {len(failures)} problemas")
    sys.exit(1 if failures else 0)


def serve(folder, port):
    process = subprocess.Popen(
        ["node", str(ROOT / "bin/serve.mjs"), str(folder), "--port", port],
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
    )
    base = f"http://localhost:{port}/"
    for _ in range(50):
        try:
            urllib.request.urlopen(base)
            break
        except OSError:
            time.sleep(0.1)
    return {"process": process, "base": base}


class Checks:
    """Each check of one page: its name, and why it failed."""

    def __init__(self, page):
        self.page = page
        self.failures = []

    def check(self, name, ok, why=""):
        print(f"  {'✓' if ok else '✗'} {name}{'' if ok else f': {why}'}")
        if not ok:
            self.failures.append(f"#{self.page}: {name}: {why}")


def open_page(browser, base, route, width):
    # A phone has a touch screen and no mouse: no hover, only taps.
    phone = width < 640
    page = browser.new_page(viewport={"width": width, "height": 1000}, has_touch=phone, is_mobile=phone)
    logs, requests = [], []
    page.on("console", lambda m: logs.append(f"{m.type}: {m.text}") if m.type in ("error", "warning") else None)
    page.on("pageerror", lambda e: logs.append(f"pageerror: {e}"))
    page.on("request", lambda r: requests.append(r.url))
    # A browser with WebMCP, faked: it keeps what the page registers (plugins/ui-sdk.js).
    page.add_init_script("""
      window.__registered = [];
      document.modelContext = { registerTool: (tool, options) => { window.__registered.push(tool); return Promise.resolve(); } };
    """)
    page.goto(base["base"] + "#/" + route)
    page.wait_for_selector(".as-pr-header", timeout=30000)
    # The diff viewer and Graphviz load after the page is drawn.
    page.wait_for_function("document.querySelectorAll('.pr-code:not(.upgraded)').length === 0", timeout=30000)
    page.wait_for_timeout(500)
    return page, logs, requests


def plain(text):
    """Markdown or HTML as the words a reader sees: no tags, marks, backticks or link targets."""
    # The only HTML the converter writes in prose is a term's <dfn> and a <kbd>; any other < is text.
    text = re.sub(r"</?(dfn|kbd|br)\b[^>]*>", "", text)
    parts = re.split(r"(`+[^`]*?`+)", text)
    text = "".join(p.strip("`").strip() if i % 2 else p for i, p in enumerate(parts))
    text = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", text)
    text = text.replace("**", "").replace("\\", "")
    text = text.replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"').replace("&amp;", "&")
    return re.sub(r"\s+", " ", text).strip()


def check_page(browser, base, route, n, said, shots):
    print(f"\n#{n} ({route})")
    c = Checks(n)
    inv, facts, prose = said["inventory"], said["facts"], said["prose"]
    page, logs, requests = open_page(browser, base, route, 1400)
    snap = page.evaluate("window.agent.snapshot()")
    by = lambda kind: [s for s in snap if s["component"] == kind]
    hidden_diffs = [d for d in facts["diffs"] if re.search(r"^\s*//\{\s*$", (d["new"] or d["old"]), re.M)]

    # A. One copy of @ui-sdk/core.
    c.check("A: the agent's snapshot is not empty", len(snap) > 0, "snapshot() == [] (¿dos copias de @ui-sdk/core?)")
    versions = {m.group(1) for u in requests for m in [re.search(r"/@ui-sdk/core@([^/?]+)", u)] if m}
    c.check("A: the page loads one version of @ui-sdk/core", len(versions) == 1, f"versiones: {sorted(versions)}")

    # B. The agent sees what the page has.
    decisions = by("accordion")
    c.check("B: one accordion per decision", len(decisions) == inv["decisions"], f"{len(decisions)} de {inv['decisions']}")
    titles = [d["title"] for d in prose["decisions"]]
    c.check("B: each decision has its title as its label", [d.get("label") for d in decisions] == titles, f"{[d.get('label') for d in decisions]}")
    layout = [s for s in by("segmented-control") if s.get("label") == "Diff layout"]
    c.check("B: the Split/Unified control", len(layout) == 1 and [i["value"] for i in layout[0].get("items", [])] == ["split", "unified"], json.dumps(layout))
    collapsibles = by("collapsible")
    files = [f["path"] for f in facts["tests"]]
    test_files = [s for s in collapsibles if s.get("label") in set(files)]
    c.check("B: one group per test file", len(test_files) == inv["testFiles"], f"{len(test_files)} de {inv['testFiles']}")
    sources = [s for s in collapsibles if s.get("label") == "Chart source (DOT)"]
    c.check("B: one chart source per chart", len(sources) == inv["charts"], f"{len(sources)} de {inv['charts']}")
    hidden = [s for s in collapsibles if (s.get("label") or "").startswith("Hidden code of")]
    c.check("B: the hidden code of each diff that has it", len(hidden) == len(hidden_diffs), f"{len(hidden)} de {len(hidden_diffs)}")

    # C. The agent can use it.
    for d in decisions:
        result = page.evaluate("(ref) => window.agent.act({ steps: [{ ref, action: 'setValue', args: [['open']] }] })", d["ref"])
        shown = page.evaluate("(label) => { const a = [...document.querySelectorAll('ui-accordion')].find((e) => e.getAttribute('aria-label') === label); const p = a?.querySelector('ui-accordion-panel'); return !!p && !p.hidden && p.offsetHeight > 0; }", d["label"])
        c.check(f"C: the agent opens “{d['label'][:40]}…”", result["ok"] and shown, json.dumps(result)[:200])
    if layout and inv["diffs"]:
        before = page.evaluate("[...document.querySelectorAll('.pr-code[data-style]')].map((e) => e.dataset.style)")
        result = page.evaluate("window.agent.act({ steps: [{ ref: 'Diff layout', action: 'setValue', args: ['unified'] }] })")
        page.wait_for_timeout(300)
        after = page.evaluate("[...document.querySelectorAll('.pr-code[data-style]')].map((e) => e.dataset.style)")
        c.check("C: the agent switches the diffs to unified", result["ok"] and set(before) == {"split"} and set(after) == {"unified"}, f"{before[:2]} → {after[:2]}")
        stored = page.evaluate("localStorage.getItem('diffStyle')")
        c.check("T: the page keeps the reader's diff layout", stored == "unified", f"localStorage = {stored}")
        page.evaluate("window.agent.act({ steps: [{ ref: 'Diff layout', action: 'setValue', args: ['split'] }] })")
    for h in hidden:
        result = page.evaluate("(ref) => window.agent.act({ steps: [{ ref, action: 'setOpen', args: [true] }] })", h["ref"])
        page.wait_for_timeout(300)
        visible = page.evaluate("(label) => { const b = [...document.querySelectorAll('.pr-hidden button')].find((e) => e.textContent === label); const p = b?.closest('.pr-hidden').querySelector('ui-collapsible-panel'); return !!p && !p.hidden && p.offsetHeight > 0; }", h["label"])
        c.check(f"C: the agent shows “{h['label']}”", result["ok"] and visible, json.dumps(result)[:200])

    # WebMCP: the page registers the four tools, each with something to run, and read answers.
    registered = page.evaluate("window.__registered.map((t) => [t.name, typeof t.execute, !!t.inputSchema, !!t.description])")
    c.check("W: WebMCP gets snapshot, query, act and read", sorted(r[0] for r in registered) == ["act", "query", "read", "snapshot"]
            and all(r[1] == "function" and r[2] and r[3] for r in registered), f"{registered}")
    sections = page.evaluate("Promise.resolve(window.__registered.find((t) => t.name === 'read').execute({})).then((o) => o.sections.length)")
    c.check("W: read, through WebMCP, answers the outline", sections == inv["sections"] + 1, f"{sections}")
    untouched = page.evaluate("!('read' in window.agent) && !('readTool' in window.agent)")
    c.check("the page leaves UI SDK's agent as the library made it", untouched)

    # D. The agent reads the prose through `read`, without the DOM. UI SDK's snapshot alone doesn't
    # carry it (not even of an open decision): that is why the page adds `read`.
    carried = json.dumps(page.evaluate("window.agent.snapshot()"), ensure_ascii=False)
    c.check("D: the snapshot alone has no decision's why (why `read` exists)", not any(d["why"][:40] in carried for d in prose["decisions"]))
    outline = page.evaluate("window.pageText.read()")
    text = plain(" ".join(page.evaluate("(s) => window.pageText.read({ section: s }).text", s) for s in outline["sections"]))
    for d in prose["decisions"]:
        c.check(f"D: why and trade-off of “{d['title'][:40]}…”", d["why"] in text and d["cost"] in text and all(x in text for x in d["discarded"]),
                f"falta en read(): {d['why'][:60]}")
    missing_notes = [note for note in prose["notes"] if note not in text]
    c.check("D: every note", not missing_notes, f"{missing_notes[:1]}")
    c.check("D: every term with its definition", outline["terms"] == prose["terms"], f"{outline['terms'][:1]} vs {prose['terms'][:1]}")

    # T. What summarize-pr's template shows.
    t_header(c, page, n, inv)
    t_decisions(c, page)
    t_diffs(c, page, inv, facts, hidden_diffs)
    t_terms(c, page, inv)
    t_charts(c, page, inv, facts)
    t_tests(c, page, inv)
    t_rest(c, page, inv)
    c.check("the console says nothing", not logs, f"{logs[:3]}")
    if shots:
        pathlib.Path(shots).mkdir(parents=True, exist_ok=True)
        page.screenshot(path=f"{shots}/{n}-1400.png", full_page=True)
    page.close()
    t_phone(c, browser, base, route, n, shots)
    return c.failures


def t_header(c, page, n, inv):
    link = page.evaluate("(() => { const a = document.querySelector('.pr-link'); return a && [a.textContent.trim(), a.href]; })()")
    c.check("T: a link to the PR, “<repo>#<n> ↗”", link and re.fullmatch(rf"[\w.-]+#{n} ↗", link[0]) and link[1].endswith(f"/pull/{n}"), f"{link}")
    stats = page.evaluate("document.querySelector('.pr-stats')?.textContent.replace(/\\s+/g, ' ').trim()")
    c.check("T: +shown (PR additions) −shown (PR deletions)", bool(stats) and re.fullmatch(r"\+\d+ \([\d,]+\) −\d+ \([\d,]+\)", stats), f"{stats}")
    original = page.evaluate("document.querySelector('.pr-about a')?.getAttribute('href')")
    c.check("T: a link to the original page of summarize-pr", bool(original) and original.endswith(f"{n}.html"), f"{original}")
    toc = page.evaluate("document.querySelectorAll('.on-this-page a').length")
    c.check("T: an index with one link per section", toc >= inv["sections"], f"{toc} de {inv['sections']}")


def t_decisions(c, page):
    page.reload()
    page.wait_for_selector(".as-pr-header")
    page.wait_for_timeout(800)
    closed = page.evaluate("[...document.querySelectorAll('.pr-decision ui-accordion-panel')].every((p) => p.hidden)")
    c.check("T: each decision starts closed", closed)
    labels = page.evaluate("[...document.querySelectorAll('.pr-decision')].every((d) => d.querySelector('.pr-label')?.textContent === 'Decision' && d.querySelector('.pr-decision-arrow'))")
    c.check("T: a decision is a card with the “Decision” label and an arrow", labels)
    implicit = page.evaluate("[...document.querySelectorAll('.pr-decision-origin')].map((e) => e.textContent)")
    c.check("T: only an implicit decision says “Implicit”", all(t == "Implicit" for t in implicit))
    page.evaluate("document.querySelector('.pr-decision button')?.click()")
    page.wait_for_timeout(300)
    cost = page.evaluate("(() => { const p = document.querySelector('.pr-decision ui-accordion-panel'); return p && !p.hidden && p.querySelector('.pr-decision-cost .pr-label')?.textContent; })()")
    c.check("T: a click opens it: the reason, then “Trade-off”", cost in (None, "Trade-off") and (cost == "Trade-off" or not page.evaluate("document.querySelector('.pr-decision')")), f"{cost}")
    slack = page.evaluate("[...document.querySelectorAll('.pr-decision-slack')].map((a) => a.href)")
    c.check("T: a Slack discussion is one link in the title row", all("slack.com" in s for s in slack))


def t_diffs(c, page, inv, facts, hidden_diffs):
    upgraded = page.evaluate("document.querySelectorAll('.pr-diff .pr-code.upgraded').length")
    shown = page.evaluate("document.querySelectorAll('.pr-diff .pr-code-shown .pr-code').length")
    c.check("T: each diff is drawn with @pierre/diffs", shown == inv["diffs"] and upgraded >= inv["diffs"], f"{upgraded} de {inv['diffs']}")
    heads = page.evaluate("[...document.querySelectorAll('.pr-diff-head')].map((h) => [h.querySelector('.pr-diff-name').textContent, h.querySelector('a').href])")
    want = [d["name"] or d["path"] for d in facts["diffs"]]
    c.check("T: the diff header shows the path and ↗ to its line in “Files changed”",
            [h[0] for h in heads] == want and all(re.search(r"/pull/\d+/files#diff-[0-9a-f]{64}[RL]\d+$", h[1]) for h in heads), f"{heads[:1]}")
    split = page.evaluate("[...document.querySelectorAll('.pr-code[data-style]')].every((e) => e.dataset.style === 'split')")
    c.check("T: split is the default", split)
    if hidden_diffs:
        rows = page.evaluate("[...document.querySelectorAll('.pr-code-shown .pr-pierre')].flatMap((p) => [...(p.querySelector('*')?.shadowRoot ?? p).querySelectorAll('[data-expander]')]).length")
        rows += page.evaluate("document.querySelectorAll('.pr-code-shown .pr-fallback .row.expander').length")
        c.check("T: hidden code shows as one “// ▸ n more lines” row", rows >= len(hidden_diffs), f"{rows}")
    comments = [d for d in facts["diffs"] if re.search(r"^\s*//!", (d["new"] or "") + "\n" + (d["old"] or ""), re.M)]
    if comments:
        marked = page.evaluate(f"document.querySelectorAll('.pr-fallback [title=\"{PAGE_COMMENT_TITLE}\"]').length")
        c.check("T: a page comment shows as // with a tooltip that it is not in the code", marked >= len(comments), f"{marked}")
    if inv["threads"]:
        authors = page.evaluate("[...document.querySelectorAll('.pr-code-shown .pr-thread .pr-comment-author')].map((a) => a.href)")
        bodies = page.evaluate("[...document.querySelectorAll('.pr-code-shown .pr-thread .pr-comment-body a')].map((a) => a.href)")
        c.check("T: each thread under its line, the author linking to the comment", len(authors) >= inv["comments"] and all("github.com" in a for a in authors), f"{authors}")
        c.check("T: #123 and @login in a comment link as on GitHub", any(re.search(r"/issues/\d+$", b) for b in bodies) and any(re.search(r"github\.com/[\w-]+$", b) for b in bodies), f"{bodies}")


def t_terms(c, page, inv):
    if not inv["terms"]:
        return
    cards = page.evaluate("document.querySelectorAll('ui-hover-card.pr-term:not([data-agent-hidden])').length")
    c.check("T: each term is explained once, at its first use", cards == inv["terms"], f"{cards} de {inv['terms']}")
    page.hover("ui-hover-card.pr-term dfn")
    page.wait_for_timeout(1200)
    tip = page.evaluate("(() => { const c = [...document.querySelectorAll('ui-hover-card.pr-term ui-hover-card-content')].find((e) => !e.hidden); return c && [c.querySelector('.pr-term-name').textContent, c.querySelector('.pr-term-tip').textContent]; })()")
    c.check("T: hovering a term shows its explanation with its name as a label", bool(tip) and all(tip), f"{tip}")


def t_charts(c, page, inv, facts):
    if not inv["charts"]:
        return
    svgs = page.evaluate("document.querySelectorAll('.pr-chart-svg svg').length")
    c.check("T: each chart is drawn with Graphviz", svgs == inv["charts"], f"{svgs} de {inv['charts']}")
    links = page.evaluate("document.querySelectorAll('.pr-chart-svg svg a[href]').length")
    want = sum(len(ch["links"]) for ch in facts["charts"])
    c.check("T: each box with a link opens its code at the head commit", links == want, f"{links} de {want}")
    # Graphviz lays each label out like a box, so no two labels overlap (summarize-pr's render-charts.mjs checks the same).
    overlaps = page.evaluate("""[...document.querySelectorAll('.pr-chart-svg svg')].flatMap((svg) => {
      const boxes = [...svg.querySelectorAll('text')].map((t) => [t.textContent, t.getBoundingClientRect()]);
      return boxes.flatMap(([a, r], i) => boxes.slice(i + 1).filter(([, q]) =>
        r.left < q.right - 1 && q.left < r.right - 1 && r.top < q.bottom - 1 && q.top < r.bottom - 1).map(([b]) => a + ' / ' + b));
    })""")
    c.check("T: no two labels of a chart overlap", not overlaps, f"{overlaps}")


def t_tests(c, page, inv):
    heads = page.evaluate("[...document.querySelectorAll('.pr-test-file > ui-collapsible-trigger button')].map((b) => b.textContent)")
    c.check("T: the tests, one heading per file with its full path", len(heads) == inv["testFiles"] and all("/" in h or "." in h for h in heads), f"{heads}")
    marks = page.evaluate("[...document.querySelectorAll('.pr-test')].map((t) => [t.dataset.change, t.querySelector('.pr-test-sign').textContent, t.title, t.querySelector('a').href])")
    signs = {"added": "+", "modified": "~", "removed": "−"}
    c.check("T: + ~ − in place of the bullet, with a tooltip, and a link to the line",
            len(marks) == inv["tests"] and all(signs[m[0]] == m[1] and m[2] and "/files#diff-" in m[3] for m in marks), f"{marks[:1]}")
    if inv["describes"]:
        c.check("T: the tests of a describe block under its name", page.evaluate("document.querySelectorAll('.pr-describe > .pr-describe-name').length") == inv["describes"])
    if inv["cases"]:
        c.check("T: the cases of one test together", page.evaluate("document.querySelectorAll('.pr-cases').length") == inv["cases"])


def t_rest(c, page, inv):
    if inv["examples"]:
        ex = page.evaluate("document.querySelectorAll('.pr-example .pr-code.upgraded').length")
        c.check("T: a code example is highlighted, with no header", ex == inv["examples"], f"{ex} de {inv['examples']}")
    if inv["discarded"]:
        style = page.evaluate("getComputedStyle(document.querySelector('.pr-discarded')).borderLeftStyle")
        c.check("T: a discarded idea is muted, with a dashed line on its left", style == "dashed", style)
    if inv["freeform"]:
        c.check("T: a freeform block stays as its HTML", page.evaluate("document.querySelectorAll('.pr-freeform table').length") >= inv["freeform"])
    if inv["chips"]:
        c.check("T: one chip per experiment", page.evaluate("document.querySelectorAll('.pr-chip').length") == inv["chips"])


def t_phone(c, browser, base, route, n, shots):
    page, logs, _ = open_page(browser, base, route, 390)
    styles = page.evaluate("[...new Set([...document.querySelectorAll('.pr-code[data-style]')].map((e) => e.dataset.style))]")
    if styles:
        c.check("T (390px): the diffs are unified", styles == ["unified"], f"{styles}")
        hidden = page.evaluate("(() => { const e = document.querySelector('.pr-diff-style'); return !e || e.hidden || e.offsetParent === null; })()")
        c.check("T (390px): the layout control hides", hidden)
    wide = page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")
    c.check("T (390px): the page does not scroll sideways", wide, page.evaluate("document.documentElement.scrollWidth"))
    t_phone_code(c, page)
    t_phone_terms(c, page)
    if shots:
        page.screenshot(path=f"{shots}/{n}-390.png", full_page=True)
    page.close()


def t_phone_code(c, page):
    """The code windows go edge to edge, and their code starts where the text of the page starts."""
    starts = page.evaluate("""() => {
      const text = document.querySelector('.markdown-section > p').getBoundingClientRect().left;
      return [...document.querySelectorAll('.pr-example diffs-container, .pr-diff diffs-container')].map((host) => {
        const code = [...host.shadowRoot.querySelectorAll('[data-line] span')].find((s) => s.textContent.trim() && s.getClientRects().length);
        return code ? Math.round(code.getBoundingClientRect().left - text) : null;
      }).filter((x) => x !== null);
    }""")
    if starts:
        c.check("T (390px): the code starts no closer to the edge than the text", min(starts) >= -1, f"{starts} px from the text")
    bars = page.evaluate("""() => [...document.querySelectorAll('.pr-diff diffs-container')].flatMap((host) =>
      [...host.shadowRoot.querySelectorAll('[data-column-number][data-line-type^=change]')].filter((l) => l.getClientRects().length).slice(0, 1).map((l) =>
        Math.round(l.getBoundingClientRect().left + parseFloat(getComputedStyle(l, '::before').left))))""")
    if bars:
        c.check("T (390px): the bar of a changed line is off the screen's edge", min(bars) >= 6, f"{bars} px from the edge")


def t_phone_terms(c, page):
    """A tap on a term shows its explanation, as a hover does with a mouse, and leaves the page where it is."""
    term = page.locator("ui-hover-card.pr-term:not([data-agent-hidden]) .pr-term-link").first
    if not term.count():
        return
    term.scroll_into_view_if_needed()
    page.wait_for_timeout(300)
    before = page.evaluate("[scrollY, location.hash]")
    term.tap()
    page.wait_for_timeout(800)
    shown = page.evaluate("(() => { const c = [...document.querySelectorAll('ui-hover-card.pr-term ui-hover-card-content')].find((e) => !e.hidden && e.getClientRects().length); return c && c.querySelector('.pr-term-tip').textContent; })()")
    after = page.evaluate("[scrollY, location.hash]")
    c.check("T (390px): a tap on a term shows its explanation", bool(shown), "no card opened")
    c.check("T (390px): the tap leaves the page where it was", after == before, f"{before} → {after}")
    # Somewhere that is neither the card nor a term: the side of the page, above or below the card.
    box = page.evaluate("(() => { const c = [...document.querySelectorAll('ui-hover-card.pr-term ui-hover-card-content')].find((e) => !e.hidden && e.getClientRects().length); const r = c.getBoundingClientRect(); return [r.top, r.bottom]; })()")
    page.touchscreen.tap(4, box[1] + 40 if box[1] + 40 < 990 else box[0] - 40)
    page.wait_for_timeout(800)
    gone = page.evaluate("[...document.querySelectorAll('ui-hover-card.pr-term ui-hover-card-content')].every((e) => e.hidden || !e.getClientRects().length)")
    c.check("T (390px): a tap elsewhere closes it", gone)


if __name__ == "__main__":
    main()
