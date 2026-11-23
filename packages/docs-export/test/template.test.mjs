// Guard for templates/branded.typ: every colour literal lives in the single top palette block.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const TEMPLATE_PATH = join(fileURLToPath(new URL("..", import.meta.url)), "templates", "branded.typ");
const COLOUR_LITERAL = /#[0-9a-f]{3,8}\b|\brgb\(/i;

test("branded.typ keeps all colour literals inside its top palette block", async () => {
  const source = await readFile(TEMPLATE_PATH, "utf8");
  const lines = source.split("\n");
  const paletteEnd = lines.findIndex((line) => line.startsWith("// ── Pandoc Helpers"));
  assert.ok(paletteEnd > 0, "expected a Pandoc Helpers section marker after the palette block");

  const stray = [];
  for (let i = paletteEnd; i < lines.length; i++) {
    const withoutComment = lines[i].replace(/\/\/.*$/, "");
    if (COLOUR_LITERAL.test(withoutComment)) {
      stray.push(`templates/branded.typ:${i + 1}: ${lines[i].trim()}`);
    }
  }
  assert.deepEqual(stray, [], `colour literals found outside the palette block:\n${stray.join("\n")}`);
});
