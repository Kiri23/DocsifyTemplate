#!/usr/bin/env node
// Prueba de humo de la imagen de docs-site: la arranca en un puerto local efímero, comprueba que
// corre sin privilegios, que sirve el index, el runtime de docs-site, todas las páginas del
// sidebar y /version.txt tal como están en el repo, y que nada fuera del allowlist entra en /srv.
//
//   node deploy/smoke-image.mjs ghcr.io/kiri23/docsify-template-docs:ci "$(git rev-parse HEAD)"

import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DOCS_DIR = resolve(REPO_ROOT, "packages/docs-site/docs");
const SITE_DIR = resolve(REPO_ROOT, "packages/docs-site");

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
  const actual = await response.text();
  const expected = readFileSync(repoFile, "utf8");
  assert(actual === expected, `${urlPath}: el contenido servido no coincide con ${repoFile}`);
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
  // Puerto efímero asignado por Docker en loopback: evita colisiones con otros procesos.
  docker(["run", "-d", "--name", containerName, "-p", "127.0.0.1::8080", image]);
  started = true;

  const portMapping = docker(["port", containerName, "8080/tcp"]).split("\n")[0];
  const baseUrl = `http://${portMapping}`;

  const uid = docker(["exec", containerName, "id", "-u"]);
  assert(uid !== "0", `el contenedor corre como root (uid ${uid})`);

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

  // Runtime del navegador y componente propio del sitio.
  const runtimeChecks = [
    ["/site.js", resolve(SITE_DIR, "site.js"), "javascript"],
    ["/as/mod.js", resolve(SITE_DIR, "as/mod.js"), "javascript"],
    ["/as/core.js", resolve(SITE_DIR, "as/core.js"), "javascript"],
    ["/components/mod.js", resolve(SITE_DIR, "components/mod.js"), "javascript"],
    ["/components/terminal.js", resolve(SITE_DIR, "components/terminal.js"), "javascript"],
    ["/plugins/file-links.js", resolve(SITE_DIR, "plugins/file-links.js"), "javascript"],
    ["/theme/mod.js", resolve(SITE_DIR, "theme/mod.js"), "javascript"],
    ["/theme/themes/promptbench.css", resolve(SITE_DIR, "theme/themes/promptbench.css"), "text/css"],
    ["/theme/tokens.css", resolve(SITE_DIR, "theme/tokens.css"), "text/css"],
    ["/propios/retro-semanal.js", resolve(DOCS_DIR, "propios/retro-semanal.js"), "javascript"],
    ["/propios/semana-46.json", resolve(DOCS_DIR, "propios/semana-46.json"), "application/json"],
    ["/propios/semana-47.json", resolve(DOCS_DIR, "propios/semana-47.json"), "application/json"],
  ];
  for (const [urlPath, repoFile, contentType] of runtimeChecks) {
    await expectFile(baseUrl, urlPath, repoFile, contentType);
  }

  // Sidebar y cada página que enlaza.
  await expectFile(baseUrl, "/_sidebar.md", resolve(DOCS_DIR, "_sidebar.md"));
  const sidebarPages = parseSidebarPages(readFileSync(resolve(DOCS_DIR, "_sidebar.md"), "utf8"));
  assert(sidebarPages.length > 0, "_sidebar.md no enlaza ninguna página .md");
  for (const page of sidebarPages) {
    await expectFile(baseUrl, `/${page}`, resolve(DOCS_DIR, page));
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

  // Nada fuera del allowlist entra en /srv, y Caddy no hace fallback a index.html en 404.
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
    `humo: OK (${image}, ${sidebarPages.length} páginas, ${runtimeChecks.length} activos, uid ${uid}, commit ${version})`,
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
