#!/usr/bin/env node
// Serves a folder of Markdown from another repo as a docs site, without copying anything into it.
// One origin: the folder at "/", this package at "/_docs-site/", and an index.html that loads
// site.js, the same file a hosted site loads from rawcdn.githack.com. It answers this machine
// only, and never serves hidden files (.env, .git…) or links that point outside the folder. If the folder has no _sidebar.md, it
// gets one listing its Markdown files.
//
//   node packages/docs-site/bin/serve.mjs ~/Code/MyClaudeSkills --home bin/SCRIPTS.md
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { filesUnder } from "./lib/files.mjs";
import { sidebarFor } from "./lib/sidebar.mjs";

const PACKAGE = resolve(fileURLToPath(import.meta.url), "../..");
const TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
  ".md": "text/markdown", ".json": "application/json", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".gif": "image/gif", ".ttl": "text/turtle",
};

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    home: { type: "string", default: "README.md" },
    name: { type: "string" },
    repo: { type: "string" },
    port: { type: "string", default: "3011" },
  },
});
if (positionals.length !== 1) {
  console.error("uso: serve.mjs <carpeta> [--home README.md] [--name X] [--repo URL] [--port 3011]");
  process.exit(2);
}
const folder = resolve(positionals[0]);
const config = {
  name: values.name ?? basename(folder),
  homepage: values.home,
  ...(values.repo ? { repo: values.repo } : {}),
};

/** The page the browser opens: Docsify's config, then site.js. */
function indexHtml() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(config.name)}</title>
  <link rel="icon" href="data:,">
</head>
<body>
  <div id="app">Cargando…</div>
  <script>window.$docsify = ${JSON.stringify(config)};</script>
  <script src="/_docs-site/site.js"></script>
</body>
</html>
`;
}

/** The Markdown files of the folder, as sidebar entries: a folder without _sidebar.md gets one. */
function markdownPages(files) {
  const pages = [];
  for (const path of files.keys()) {
    if (path.endsWith(".md")) pages.push({ path: path.slice(1), link: path });
  }
  return pages;
}

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

let files = await filesUnder(folder, "/");
const own = await filesUnder(PACKAGE, "/_docs-site/");

const server = createServer(async (req, res) => {
  const send = (status, type, body) => {
    res.writeHead(status, { "content-type": `${type}; charset=utf-8`, "cache-control": "no-store" });
    res.end(body);
  };
  let path;
  try {
    path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  } catch {
    return send(400, "text/plain", "URL mal codificada");
  }
  if (path === "/" || path === "/index.html") return send(200, "text/html", indexHtml());
  // A file added after the server started is found on the next request that misses.
  if (!own.has(path) && !files.has(path)) files = await filesUnder(folder, "/");
  const file = own.get(path) ?? files.get(path);
  if (file) return send(200, TYPES[extname(file)] ?? "text/plain", await readFile(file));
  if (path === "/_sidebar.md") return send(200, "text/markdown", sidebarFor(markdownPages(files)));
  send(404, "text/plain", "no está");
});

// This machine only: on a shared wifi the folder isn't anyone else's to read.
server.listen(Number(values.port), "127.0.0.1", () => {
  console.log(`${config.name}: http://localhost:${values.port}/  (carpeta ${folder}, portada ${config.homepage})`);
});
