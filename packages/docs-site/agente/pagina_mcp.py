#!/usr/bin/env python3
"""A page of a docs site as an MCP server: an AI agent gets the page's own tools and nothing else.

It serves a docs folder with bin/serve.mjs, opens one page in a headless Chromium and offers, over
MCP (stdio), the tools that the page gives its agent: UI SDK's snapshot, query and act, and the
site's read (plugins/ui-sdk.js, plugins/page-text.js). The agent can't see the DOM or run code: it
reads and uses the page only as the page lets it. prompt-bench's eval of DocsifyTemplate#62 runs a
model with only this server; any MCP client (Claude Code, Codex) can mount it too.

    python3 packages/docs-site/agente/pagina_mcp.py packages/docs-site/docs --page prs/59

    claude --strict-mcp-config --mcp-config '{"mcpServers": {"pagina": {"command": "python3",
      "args": ["packages/docs-site/agente/pagina_mcp.py", "packages/docs-site/docs", "--page", "prs/59"]}}}'

Needs Python Playwright with its Chromium (`pip install playwright && playwright install chromium`).
"""
import argparse
import json
import pathlib
import socket
import subprocess
import sys
import time
import urllib.request

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
PROTOCOL = "2025-06-18"


def main():
    args = argparse.ArgumentParser()
    args.add_argument("folder", help="the docs folder, as bin/serve.mjs takes it")
    args.add_argument("--page", required=True, help="the page's route, like prs/59")
    args.add_argument("--components", action="append", default=[], help="a component module of the repo")
    opts = args.parse_args()

    port = free_port()
    server = subprocess.Popen(
        ["node", str(ROOT / "bin/serve.mjs"), opts.folder, "--port", str(port)]
        + [a for path in opts.components for a in ("--components", path)],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    try:
        wait_for(f"http://localhost:{port}/")
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page(viewport={"width": 1400, "height": 1000})
            page.goto(f"http://localhost:{port}/#/{opts.page}")
            page.wait_for_function("window.agent && window.agent.snapshot().length > 0", timeout=30000)
            page.wait_for_timeout(500)
            tools = page.evaluate("[...window.agent.tools, window.agent.readTool]")
            serve_mcp(page, tools)
            browser.close()
    finally:
        server.terminate()
        server.wait()


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def wait_for(url):
    for _ in range(100):
        try:
            urllib.request.urlopen(url)
            return
        except OSError:
            time.sleep(0.1)
    raise SystemExit(f"bin/serve.mjs no contestó en {url}")


def serve_mcp(page, tools):
    """Answers MCP requests, one JSON per line on stdin, until stdin closes."""
    names = {t["name"] for t in tools}
    for line in sys.stdin:
        if not line.strip():
            continue
        message = json.loads(line)
        if "id" not in message:
            continue  # a notification, like notifications/initialized
        method, params = message.get("method"), message.get("params") or {}
        if method == "initialize":
            result = {
                "protocolVersion": params.get("protocolVersion", PROTOCOL),
                "capabilities": {"tools": {}},
                "serverInfo": {"name": "pagina", "version": "1.0.0"},
            }
        elif method == "tools/list":
            result = {"tools": [{"name": t["name"], "description": t["description"], "inputSchema": t["inputSchema"]} for t in tools]}
        elif method == "tools/call" and params.get("name") in names:
            name, arguments = params["name"], params.get("arguments") or {}
            try:
                out = page.evaluate("([name, input]) => Promise.resolve(window.agent[name](input))", [name, arguments])
                result = {"content": [{"type": "text", "text": json.dumps(out, ensure_ascii=False)}]}
            except Exception as error:  # the page said no: the agent reads why
                result = {"content": [{"type": "text", "text": str(error)}], "isError": True}
        elif method == "ping":
            result = {}
        else:
            reply(message["id"], error={"code": -32601, "message": f"no method {method}"})
            continue
        reply(message["id"], result=result)


def reply(id_, result=None, error=None):
    out = {"jsonrpc": "2.0", "id": id_}
    if error:
        out["error"] = error
    else:
        out["result"] = result
    sys.stdout.write(json.dumps(out, ensure_ascii=False) + "\n")
    sys.stdout.flush()


if __name__ == "__main__":
    main()
