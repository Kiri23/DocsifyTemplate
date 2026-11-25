#!/usr/bin/env node
// Prueba de humo de la imagen de docs-site: la arranca en un puerto local efímero con el mismo
// endurecimiento que producción (read-only, sin capabilities, no-new-privileges), comprueba que
// corre sin privilegios, que el nombre coincide con deploy/compose.prod.yaml, que /srv contiene
// exactamente el allowlist más version.txt (ni un archivo más ni uno menos), que cada archivo
// servido coincide byte a byte con el repo y que rutas fuera del allowlist dan 404.
//
//   node deploy/smoke-image.mjs ghcr.io/kiri23/docsify-template-docs:ci "$(git rev-parse HEAD)"

import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, posix, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DOCS_DIR = resolve(REPO_ROOT, "packages/docs-site/docs");
const SITE_DIR = resolve(REPO_ROOT, "packages/docs-site");
const COMPOSE_FILE = resolve(REPO_ROOT, "deploy/compose.prod.yaml");

const [, , image, expectedCommit] = process.argv;
if (!image) {
  console.error("uso: node deploy/smoke-image.mjs <imagen> [commit-esperado]");
  process.exit(2);
}

const containerName = `docs-site-smoke-${randomBytes(4).toString("hex")}`;

function docker(args) {
  return execFileSync("docker", args, { encoding: "utf8" }).trim();
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function walkFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = resolve(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walkFiles(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

function collectAllowlist() {
  // Mapa urlPath ("/foo/bar.js") -> ruta absoluta en el repo.
  const files = new Map();
  for (const full of walkFiles(DOCS_DIR)) {
    const rel = relative(DOCS_DIR, full).split("\\").join("/");
    files.set(`/${rel}`, full);
  }
  files.set("/site.js", resolve(SITE_DIR, "site.js"));
  for (const dirName of ["as", "components", "plugins", "theme"]) {
    const base = resolve(SITE_DIR, dirName);
    for (const full of walkFiles(base)) {
      const rel = relative(base, full).split("\\").join("/");
      files.set(`/${posix.join(dirName, rel)}`, full);
    }
  }
  // The one file of pr/ that the browser loads: the diffs of a PR summary count lines with it.
  files.set("/pr/summarize-pr/shown-lines.mjs", resolve(SITE_DIR, "pr/summarize-pr/shown-lines.mjs"));
  return files;
}

function checkComposeImageName(testedImage) {
  const compose = readFileSync(COMPOSE_FILE, "utf8");
  const match = compose.match(/^\s*image:\s*([^\s:$]+):/m);
  assert(match, `${COMPOSE_FILE} no declara image: <repo>:<tag>`);
  const composeRepo = match[1];
  const testedRepo = testedImage.includes(":")
    ? testedImage.slice(0, testedImage.lastIndexOf(":"))
    : testedImage;
  assert(
    testedRepo === composeRepo,
    `la imagen probada (${testedRepo}) no coincide con deploy/compose.prod.yaml (${composeRepo})`,
  );
}

async function waitForReady(baseUrl) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/`);
      if (response.ok) return;
    } catch {
      // Caddy aún está arrancando dentro del contenedor.
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`el contenedor ${containerName} no respondió en ${baseUrl}/`);
}

async function expectFile(baseUrl, urlPath, repoFile, expectedType) {
  const response = await fetch(`${baseUrl}${urlPath}`);
  assert(response.status === 200, `${urlPath}: esperaba HTTP 200, llegó ${response.status}`);
  if (expectedType) {
    const contentType = response.headers.get("content-type") || "";
    assert(
      contentType.includes(expectedType),
      `${urlPath}: Content-Type inesperado (${contentType}), esperaba ${expectedType}`,
    );
  }
  const actual = Buffer.from(await response.arrayBuffer());
  const expected = readFileSync(repoFile);
  assert(actual.equals(expected), `${urlPath}: el contenido servido no coincide con ${repoFile}`);
  return response;
}

async function expectNotFound(baseUrl, urlPath) {
  const response = await fetch(`${baseUrl}${urlPath}`);
  assert(response.status === 404, `${urlPath}: esperaba HTTP 404, llegó ${response.status}`);
}

function parseSidebarPages(sidebarMarkdown) {
  const pages = [];
  const pattern = /\]\(\/([^)\s]+\.md)\)/g;
  for (const match of sidebarMarkdown.matchAll(pattern)) {
    pages.push(match[1]);
  }
  return [...new Set(pages)];
}

let started = false;

function cleanup() {
  if (!started) return;
  try {
    execFileSync("docker", ["rm", "-f", containerName], { stdio: "ignore" });
  } catch {
    // El contenedor ya se había borrado.
  }
  started = false;
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    cleanup();
    process.exit(130);
  });
}

try {
  checkComposeImageName(image);

  // Puerto efímero en loopback y mismo endurecimiento que compose.prod.yaml.
  docker([
    "run",
    "-d",
    "--name",
    containerName,
    "--read-only",
    "--tmpfs",
    "/data:size=4m,noexec,nosuid,nodev,uid=10001,gid=10001",
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges:true",
    "--memory",
    "64m",
    "-p",
    "127.0.0.1::8080",
    image,
  ]);
  started = true;

  const portMapping = docker(["port", containerName, "8080/tcp"]).split("\n")[0];
  const baseUrl = `http://${portMapping}`;

  const uid = docker(["exec", containerName, "id", "-u"]);
  assert(uid !== "0", `el contenedor corre como root (uid ${uid})`);

  // Inventario exacto de /srv: ni un archivo ni symlink de más (ej. .env) ni uno faltante.
  const allowlist = collectAllowlist();
  const actualSrvFiles = docker(["exec", containerName, "find", "/srv", "!", "-type", "d"])
    .split("\n")
    .filter(Boolean)
    .map((p) => p.replace(/^\/srv/, ""))
    .sort();
  const expectedSrvFiles = [...allowlist.keys(), "/version.txt"].sort();
  const extra = actualSrvFiles.filter((p) => !expectedSrvFiles.includes(p));
  const missing = expectedSrvFiles.filter((p) => !actualSrvFiles.includes(p));
  assert(extra.length === 0, `archivos fuera del allowlist en /srv: ${extra.join(", ")}`);
  assert(missing.length === 0, `archivos faltantes en /srv: ${missing.join(", ")}`);

  await waitForReady(baseUrl);

  const indexResponse = await expectFile(
    baseUrl,
    "/",
    resolve(DOCS_DIR, "index.html"),
    "text/html",
  );
  assert(
    (indexResponse.headers.get("x-content-type-options") || "").toLowerCase() === "nosniff",
    "falta header X-Content-Type-Options: nosniff",
  );
  assert(
    (indexResponse.headers.get("referrer-policy") || "").toLowerCase() ===
      "strict-origin-when-cross-origin",
    "falta header Referrer-Policy: strict-origin-when-cross-origin",
  );
  assert(
    (indexResponse.headers.get("cache-control") || "").toLowerCase().includes("no-cache"),
    "falta header Cache-Control: no-cache",
  );
  assert(
    readFileSync(resolve(DOCS_DIR, "index.html"), "utf8").includes("window.$docsify"),
    "index.html no configura window.$docsify",
  );

  // Todos los archivos del allowlist se sirven intactos y con el Content-Type esperado.
  const expectedTypes = new Map([
    [".js", "javascript"],
    [".css", "text/css"],
    [".json", "application/json"],
    [".html", "text/html"],
  ]);
  for (const [urlPath, repoFile] of allowlist) {
    const ext = urlPath.slice(urlPath.lastIndexOf("."));
    await expectFile(baseUrl, urlPath, repoFile, expectedTypes.get(ext));
  }

  // Cada página enlazada en _sidebar.md existe en el allowlist y responde 200.
  const sidebarPages = parseSidebarPages(readFileSync(resolve(DOCS_DIR, "_sidebar.md"), "utf8"));
  assert(sidebarPages.length > 0, "_sidebar.md no enlaza ninguna página .md");
  for (const page of sidebarPages) {
    assert(allowlist.has(`/${page}`), `_sidebar.md enlaza /${page}, que no está en docs/`);
  }

  // Commit grabado por el Dockerfile en /version.txt.
  const versionResponse = await fetch(`${baseUrl}/version.txt`);
  assert(versionResponse.status === 200, `/version.txt: esperaba HTTP 200, llegó ${versionResponse.status}`);
  const version = (await versionResponse.text()).trim();
  if (expectedCommit) {
    assert(
      version === expectedCommit,
      `/version.txt dice "${version}", esperaba "${expectedCommit}"`,
    );
  } else {
    assert(/^[A-Za-z0-9._-]+$/.test(version), `/version.txt tiene un valor inválido: "${version}"`);
  }

  // Nada fuera del allowlist se sirve, y Caddy no hace fallback a index.html en 404.
  for (const missingPath of [
    "/package.json",
    "/bin/serve.mjs",
    "/test/components.test.mjs",
    "/componentes/_sidebar.md",
    "/no-such-page",
  ]) {
    await expectNotFound(baseUrl, missingPath);
  }

  console.log(
    `humo: OK (${image}, ${allowlist.size} archivos, ${sidebarPages.length} páginas, uid ${uid}, commit ${version})`,
  );
} catch (error) {
  if (started) {
    try {
      const logs = execFileSync("docker", ["logs", containerName], { encoding: "utf8" });
      if (logs) console.error("--- logs del contenedor ---\n" + logs);
    } catch {
      // Ignora error leyendo logs si el contenedor no llegó a escribir.
    }
  }
  console.error(`humo: FALLÓ — ${error.message}`);
  process.exitCode = 1;
} finally {
  cleanup();
}
