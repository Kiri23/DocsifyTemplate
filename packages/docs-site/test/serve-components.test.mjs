// serve.mjs --components: the page it builds names the repo's own modules, from the folder, and it
// refuses a module outside the folder or one that doesn't exist.
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SERVE = fileURLToPath(new URL("../bin/serve.mjs", import.meta.url));
const root = mkdtempSync(join(tmpdir(), "serve-components-"));
const folder = join(root, "docs");
mkdirSync(join(folder, "propios"), { recursive: true });
writeFileSync(join(folder, "README.md"), "# Repo\n");
writeFileSync(join(folder, "propios", "retro.js"), "export {};\n");
writeFileSync(join(root, "afuera.js"), "export {};\n");
after(() => rmSync(root, { recursive: true, force: true }));

test("the page serve.mjs builds names the module from the folder", async () => {
  const port = 3990 + Math.floor(Math.random() * 9);
  const server = spawn("node", [SERVE, folder, "--port", String(port), "--components", join(folder, "propios", "retro.js")]);
  try {
    await new Promise((resolve, reject) => {
      server.stdout.on("data", resolve);
      server.on("exit", (code) => reject(new Error(`serve.mjs exited with ${code}`)));
    });
    const page = await (await fetch(`http://127.0.0.1:${port}/`)).text();
    assert.match(page, /"components":\["propios\/retro\.js"\]/);
  } finally {
    server.kill();
  }
});

test("serve.mjs refuses a module outside the folder or one that isn't there", () => {
  const outside = spawnSync("node", [SERVE, folder, "--components", join(root, "afuera.js")], { encoding: "utf8" });
  assert.equal(outside.status, 2);
  assert.match(outside.stderr, /tiene que estar dentro de/);
  const missing = spawnSync("node", [SERVE, folder, "--components", join(folder, "propios", "nada.js")], { encoding: "utf8" });
  assert.equal(missing.status, 2);
  assert.match(missing.stderr, /no existe/);
});
