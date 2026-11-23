// Guardia estática de packages/chat/: impide que regresen herramientas muertas de docs-engine,
// bloques YAML viejos o desincronización entre core/tools.js, core/worker.js y adapters/docsify.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHAT_TOOLS } from '../core/tools.js';

const CHAT_ROOT = fileURLToPath(new URL('..', import.meta.url));

const FORBIDDEN_PATTERNS = [
  /\.latex-export-select/,
  /\.latex-export-btn/,
  /window\.__pageSections/,
  /\b__pageSections\b/,
  /\bhx-get\b/,
  /\bdocs-engine\b/,
  /\bexport_page\b/,
  /\bswitch_tab\b/,
  /\bgenerate_component\b/,
  /\bswitchTab\b/,
  /\bgenerateComponent\b/,
  /\byaml\b/i,
  /\bcard-grid\b/,
  /\bapi-endpoint\b/,
  /\bstatus-flow\b/,
  /\bentity-schema\b/,
  /\bconfig-example\b/,
  /\bstep-type\b/,
  /\bside-by-side\b/,
  /\bfile-tree\b/,
  /\bdirective-table\b/,
];

async function sourceFilesIn(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'test' || entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...await sourceFilesIn(fullPath));
    } else if (entry.isFile()) {
      found.push(fullPath);
    }
  }
  return found.sort();
}

test('no file in packages/chat references dead docs-engine tools, hooks, or YAML components', async () => {
  const files = await sourceFilesIn(CHAT_ROOT);
  assert.ok(files.length >= 6, `expected at least 6 files in packages/chat, found ${files.length}`);

  const hits = [];
  for (const file of files) {
    const rel = relative(CHAT_ROOT, file);
    const lines = (await readFile(file, 'utf8')).split('\n');
    lines.forEach((line, index) => {
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(line)) {
          hits.push(`${rel}:${index + 1}: matched ${pattern} -> ${line.trim()}`);
        }
      }
    });
  }

  assert.equal(hits.join('\n'), '', 'dead tool or docs-engine reference found in packages/chat');
});

test('worker.js parses cleanly and consumes WORKER_TOOL_SCHEMAS from core/tools.js without an inline TOOLS list', async () => {
  const workerPath = join(CHAT_ROOT, 'core', 'worker.js');
  execFileSync(process.execPath, ['--check', workerPath], { stdio: 'pipe' });

  const workerSource = await readFile(workerPath, 'utf8');
  assert.match(workerSource, /import\s*\{\s*WORKER_TOOL_SCHEMAS\s*\}\s*from\s*["']\.\/tools\.js["']/);
  assert.match(workerSource, /templateOpts\.tools\s*=\s*WORKER_TOOL_SCHEMAS/);
  assert.doesNotMatch(workerSource, /\bconst\s+TOOLS\s*=/);
});

test('adapters/docsify.js loads cleanly, uses shared TOOL_CONFIG_MAP, and matches live tool names and parameters', async () => {
  const adapterMod = await import('../adapters/docsify.js');
  assert.equal(typeof adapterMod.injectGemmaChat, 'function');

  const adapterSource = await readFile(join(CHAT_ROOT, 'adapters', 'docsify.js'), 'utf8');
  assert.match(adapterSource, /import\s*\{\s*TOOL_CONFIG_MAP\s*\}\s*from\s*['"]\.\.\/core\/tools\.js['"]/);
  assert.doesNotMatch(adapterSource, /\bconst\s+TOOL_CONFIG_MAP\s*=/);

  const blockMatch = adapterSource.match(/const toolExecutors = \{([\s\S]*?)\n\};/);
  assert.ok(blockMatch, 'toolExecutors block not found in adapters/docsify.js');

  const executorSignatures = [...blockMatch[1].matchAll(/^  ['"]?([\w-]+)['"]?\s*:\s*async\s*\(\{\s*([^}]*)\}\)/gm)];
  const executorNames = [...blockMatch[1].matchAll(/^  ['"]?([\w-]+)['"]?\s*:/gm)].map(m => m[1]);
  assert.deepEqual(executorNames, CHAT_TOOLS.map(t => t.name));

  const paramsByTool = Object.fromEntries(
    executorSignatures.map(([, name, rawParams]) => [
      name,
      rawParams.split(',').map(p => p.trim().split(/[:=]/)[0].trim()).filter(Boolean),
    ])
  );
  for (const tool of CHAT_TOOLS) {
    assert.deepEqual(
      paramsByTool[tool.name],
      tool.schema.function.parameters.required,
      `executor parameters for ${tool.name} must match schema.parameters.required`,
    );
  }
});
