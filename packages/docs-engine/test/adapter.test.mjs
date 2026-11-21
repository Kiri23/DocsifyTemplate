// The Docsify adapter registers itself on import. A page that brings its own components in
// window.__docsifyTemplateConfig gets them next to the default ones, with Docsify's hooks
// registered once, the same as a page that brings nothing.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const LOAD = fileURLToPath(new URL("load-adapter.mjs", import.meta.url));

/** What the adapter registered, loaded in a process of its own. */
function load(...args) {
  return JSON.parse(execFileSync("node", [LOAD, ...args], { encoding: "utf8" }).trim().split("\n").at(-1));
}

test("a page's own component is drawn from its fence, next to the default ones", () => {
  const { own, stock, fence } = load("own");
  assert.equal(own, true, "feedback-semana no quedó registrado");
  assert.equal(stock, true, "entity-schema dejó de estar");
  assert.equal(fence, true, "el fence ```feedback-semana no se volvió <feedback-semana>");
});

test("Docsify's hooks are registered once, with or without components of the page's own", () => {
  const plain = load();
  const withOwn = load("own");
  assert.deepEqual(withOwn.registered, plain.registered);
  assert.equal(plain.registered.beforeEach, 1);
  assert.equal(plain.own, false);
});
