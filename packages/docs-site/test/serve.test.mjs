// serve.mjs as a running server: what it serves, what it refuses, and where it listens.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { networkInterfaces, tmpdir } from "node:os";
import { join } from "node:path";
import { connect } from "node:net";
import { fileURLToPath } from "node:url";

const SERVE = fileURLToPath(new URL("../bin/serve.mjs", import.meta.url));
const PORT = 3900 + Math.floor(Math.random() * 90);
const BASE = `http://127.0.0.1:${PORT}`;
let server;
let root;

before(async () => {
  root = mkdtempSync(join(tmpdir(), "serve-"));
  const folder = join(root, "repo");
  mkdirSync(folder);
  mkdirSync(join(folder, ".github"));
  writeFileSync(join(folder, "README.md"), "# Repo\n");
  writeFileSync(join(folder, ".env"), "TOKEN=secreto\n");
  writeFileSync(join(folder, ".github", "notes.md"), "# hidden\n");
  writeFileSync(join(root, "afuera.md"), "# outside the folder\n");
  symlinkSync(join(root, "afuera.md"), join(folder, "fuera.md"));
  symlinkSync(join(folder, "README.md"), join(folder, "adentro.md"));
  server = spawn("node", [SERVE, folder, "--port", String(PORT)]);
  await new Promise((resolve, reject) => {
    server.stdout.on("data", resolve);
    server.on("exit", (code) => reject(new Error(`serve.mjs exited with ${code}`)));
  });
});

after(() => {
  server.kill();
  rmSync(root, { recursive: true, force: true });
});

const status = async (path) => (await fetch(BASE + path)).status;

test("serves the folder's files", async () => {
  assert.equal(await status("/README.md"), 200);
  assert.equal(await status("/adentro.md"), 200);
});

test("never serves a file or a folder whose name starts with a dot", async () => {
  assert.equal(await status("/.env"), 404);
  assert.equal(await status("/.github/notes.md"), 404);
});

test("never follows a link that points outside the folder", async () => {
  assert.equal(await status("/fuera.md"), 404);
});

test("the generated sidebar lists neither hidden files nor outside links", async () => {
  const sidebar = await (await fetch(BASE + "/_sidebar.md")).text();
  assert.equal(sidebar, "[README.md](/README.md)\n[adentro.md](/adentro.md)".replace(/\[/g, "* ["));
});

test("listens on this machine only, not on the network", async () => {
  const lan = Object.values(networkInterfaces()).flat()
    .find((i) => i.family === "IPv4" && !i.internal)?.address;
  if (!lan) return; // no network address to try
  const reached = await new Promise((resolve) => {
    const socket = connect(PORT, lan, () => { socket.destroy(); resolve(true); });
    socket.on("error", () => resolve(false));
  });
  assert.equal(reached, false, `reached the server at ${lan}:${PORT}`);
});

// Last: before the fix, this request killed the server and every test after it.
test("a badly encoded URL gets a 400 and the server keeps going", async () => {
  assert.equal(await status("/%E0%A4%A"), 400);
  assert.equal(await status("/README.md"), 200);
});
