// Pruebas del catálogo compartido de herramientas vivas en core/tools.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHAT_TOOLS, WORKER_TOOL_SCHEMAS, TOOL_CONFIG_MAP } from '../core/tools.js';

const LIVE_TOOLS = ['navigate_to_page', 'search_docs', 'scroll_to_section'];

test('CHAT_TOOLS, WORKER_TOOL_SCHEMAS and TOOL_CONFIG_MAP declare only the 3 live tools', () => {
  assert.deepEqual(CHAT_TOOLS.map(t => t.name), LIVE_TOOLS);
  assert.deepEqual(WORKER_TOOL_SCHEMAS.map(s => s.function.name), LIVE_TOOLS);
  assert.deepEqual(TOOL_CONFIG_MAP, {
    navigate_to_page: 'navigate',
    search_docs: 'search',
    scroll_to_section: 'scrollToSection',
  });

  for (const schema of WORKER_TOOL_SCHEMAS) {
    assert.equal(schema.type, 'function');
    assert.ok(schema.function.description.length > 0);
    assert.equal(schema.function.parameters.type, 'object');
    assert.ok(Object.isFrozen(schema.function.parameters.properties));
    for (const req of schema.function.parameters.required) {
      assert.ok(req in schema.function.parameters.properties, `missing property ${req}`);
    }
  }
});
