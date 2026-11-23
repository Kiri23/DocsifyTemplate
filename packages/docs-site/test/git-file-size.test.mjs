// Keeps large binaries (like a stray *.wasm.bak that slips past .gitignore) out of the repo,
// so CDNs with a repo size cap (like jsDelivr's 50 MB limit) keep serving it.
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { lstatSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const MAX_TRACKED_FILE_BYTES = 2 * 1024 * 1024;

const tempDirs = [];
after(() => tempDirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

/** Lists every file git tracks in the repo alongside its size on disk. */
function trackedFileSizesIn(repoRoot) {
  const output = execFileSync("git", ["-C", repoRoot, "ls-files", "-z"], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  const entries = [];
  for (const path of output.split("\0")) {
    if (!path) continue;
    const stats = lstatSync(join(repoRoot, path));
    if (stats.isDirectory()) continue;
    entries.push({ path, bytes: stats.size });
  }
  return entries;
}

/** Returns the files above the size cap, largest first. */
function oversizedFiles(entries, { maxBytes = MAX_TRACKED_FILE_BYTES } = {}) {
  return entries
    .filter(({ bytes }) => bytes > maxBytes)
    .sort((a, b) => b.bytes - a.bytes);
}

/** Formats bytes in megabytes for human-readable failure messages. */
function formatMegabytes(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Builds the failure message listing every offending file and its size. */
function formatOversizedFiles(oversized, { maxBytes = MAX_TRACKED_FILE_BYTES } = {}) {
  if (oversized.length === 0) return "";
  const header = `Tracked files exceeding the ${formatMegabytes(maxBytes)} (${maxBytes} bytes) limit:`;
  const lines = oversized.map(
    ({ path, bytes }) => `  - ${path}: ${formatMegabytes(bytes)} (${bytes} bytes)`,
  );
  return [header, ...lines].join("\n");
}

test("no git-tracked file exceeds the 2 MB size cap", () => {
  const entries = trackedFileSizesIn(REPO_ROOT);
  assert.ok(entries.length >= 50, `only ${entries.length} tracked files checked: did the repo root move?`);
  const oversized = oversizedFiles(entries, { maxBytes: MAX_TRACKED_FILE_BYTES });
  assert.equal(formatOversizedFiles(oversized, { maxBytes: MAX_TRACKED_FILE_BYTES }), "");
});

test("oversizedFiles catches files above the cap and leaves files at or below it", () => {
  const entries = [
    { path: "packages/docs-site/site.js", bytes: 4 * 1024 },
    { path: "docs/exact-limit.bin", bytes: MAX_TRACKED_FILE_BYTES },
    { path: "packages/docs-site/one-byte-over.bin", bytes: MAX_TRACKED_FILE_BYTES + 1 },
    { path: "packages/docs-engine/pandoc.wasm.bak", bytes: 58 * 1024 * 1024 },
  ];
  const oversized = oversizedFiles(entries, { maxBytes: MAX_TRACKED_FILE_BYTES });
  assert.deepEqual(
    oversized.map(({ path }) => path),
    ["packages/docs-engine/pandoc.wasm.bak", "packages/docs-site/one-byte-over.bin"],
  );
  const report = formatOversizedFiles(oversized, { maxBytes: MAX_TRACKED_FILE_BYTES });
  assert.match(report, /packages\/docs-engine\/pandoc\.wasm\.bak: 58\.00 MB/);
  assert.match(report, /packages\/docs-site\/one-byte-over\.bin: 2\.00 MB/);
  assert.doesNotMatch(report, /exact-limit\.bin/);
});

test("trackedFileSizesIn flags a large tracked binary in a git repo, including names with spaces", () => {
  const dir = mkdtempSync(join(tmpdir(), "git-file-size-"));
  tempDirs.push(dir);
  execFileSync("git", ["init", "-q", dir]);
  writeFileSync(join(dir, "small.md"), "hello\n");
  writeFileSync(join(dir, "with space pandoc.wasm.bak"), Buffer.alloc(1024));
  execFileSync("git", ["-C", dir, "add", "small.md", "with space pandoc.wasm.bak"]);

  const entries = trackedFileSizesIn(dir);
  const oversized = oversizedFiles(entries, { maxBytes: 512 });
  assert.deepEqual(oversized, [{ path: "with space pandoc.wasm.bak", bytes: 1024 }]);
});
