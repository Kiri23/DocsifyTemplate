#!/usr/bin/env node
// Serves a folder of Markdown from another repo as a docs site, without copying anything into it.
// One origin: the folder at "/", this package at "/_docs-site/", and an index.html that loads
// site.js, the same file a hosted site loads from jsDelivr. If the folder has no _sidebar.md, it
// gets one listing its Markdown files.
//
//   node packages/docs-site/bin/serve.mjs ~/Code/MyClaudeSkills --home bin/SCRIPTS.md
import { createServer } from "node:http";
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const PACKAGE = resolve(fileURLToPath(import.meta.url), "../..");
const SKIP = new Set(["node_modules", ".git"]);
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

/** Every file under a folder, by its URL path ("/bin/SCRIPTS.md" → its place on disk). A request
 *  is looked up here, never turned into a path, so "/../" can't reach outside the folder. */
async function filesUnder(root, prefix) {
  const found = new Map();
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (SKIP.has(entry.name)) continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile() || (entry.isSymbolicLink() && (await stat(path).catch(() => null))?.isFile())) {
        found.set(prefix + relative(root, path).split(sep).join("/"), path);
      }
    }
  };
  await walk(root);
  return found;
}

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

/** A sidebar for a folder that has none: its Markdown files, grouped by their first folder. */
function sidebarFor(files) {
  const groups = new Map();
  for (const path of [...files.keys()].filter((p) => p.endsWith(".md")).sort()) {
    const parts = path.slice(1).split("/");
    const group = parts.length > 1 ? parts[0] : "";
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(`  * [${parts.slice(1).join("/") || parts[0]}](${path.slice(1)})`);
  }
  return [...groups].map(([group, items]) =>
    group ? `* ${group}\n${items.join("\n")}` : items.map((i) => i.trim()).join("\n")
  ).join("\n");
}

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

let files = await filesUnder(folder, "/");
const own = await filesUnder(PACKAGE, "/_docs-site/");

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const send = (status, type, body) => {
    res.writeHead(status, { "content-type": `${type}; charset=utf-8`, "cache-control": "no-store" });
    res.end(body);
  };
  if (path === "/" || path === "/index.html") return send(200, "text/html", indexHtml());
  // A file added after the server started is found on the next request that misses.
  if (!own.has(path) && !files.has(path)) files = await filesUnder(folder, "/");
  const file = own.get(path) ?? files.get(path);
  if (file) return send(200, TYPES[extname(file)] ?? "text/plain", await readFile(file));
  if (path === "/_sidebar.md") return send(200, "text/markdown", sidebarFor(files));
  send(404, "text/plain", "no está");
});

server.listen(Number(values.port), () => {
  console.log(`${config.name}: http://localhost:${values.port}/  (carpeta ${folder}, portada ${config.homepage})`);
});
