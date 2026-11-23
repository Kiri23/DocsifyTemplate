// Pruebas del system prompt, el autocompletado y el gating de herramientas en core/chat-engine.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSystemPrompt, createChatEngine } from '../core/chat-engine.js';
import { buildSystemPrompt as publicBuildSystemPrompt } from '../index.js';

const LIVE_TOOLS = ['navigate_to_page', 'search_docs', 'scroll_to_section'];
const DEAD_TOOLS = ['export_page', 'switch_tab', 'generate_component'];

test('buildSystemPrompt advertises only live tools and live action verbs by default', () => {
  assert.equal(publicBuildSystemPrompt, buildSystemPrompt);
  const prompt = buildSystemPrompt();

  for (const tool of LIVE_TOOLS) {
    assert.match(prompt, new RegExp(`- ${tool}:`), `expected ${tool} in system prompt`);
  }
  assert.match(prompt, /\(navigate, search, scroll\)/);

  for (const dead of DEAD_TOOLS) {
    assert.doesNotMatch(prompt, new RegExp(dead));
  }
  assert.doesNotMatch(prompt, /\b(export|create|switch|YAML)\b/i);
});

test('buildSystemPrompt gates each live tool independently via toolConfig', () => {
  const cases = [
    { key: 'navigate', hiddenTool: 'navigate_to_page', hiddenVerb: 'navigate', kept: ['search_docs', 'scroll_to_section'] },
    { key: 'search', hiddenTool: 'search_docs', hiddenVerb: 'search', kept: ['navigate_to_page', 'scroll_to_section'] },
    { key: 'scrollToSection', hiddenTool: 'scroll_to_section', hiddenVerb: 'scroll', kept: ['navigate_to_page', 'search_docs'] },
  ];

  for (const c of cases) {
    const prompt = buildSystemPrompt({ [c.key]: false });
    assert.doesNotMatch(prompt, new RegExp(c.hiddenTool), `${c.key}: false must hide ${c.hiddenTool}`);
    assert.doesNotMatch(prompt, new RegExp(`DO something \\([^)]*\\b${c.hiddenVerb}\\b`), `${c.key}: false must drop ${c.hiddenVerb} verb`);
    for (const kept of c.kept) {
      assert.match(prompt, new RegExp(`- ${kept}:`), `${c.key}: false must keep ${kept}`);
    }
  }
});

test('buildSystemPrompt omits AVAILABLE ACTIONS when all tools are disabled', () => {
  const prompt = buildSystemPrompt({
    navigate: false,
    search: false,
    scrollToSection: false,
  });
  assert.doesNotMatch(prompt, /AVAILABLE ACTIONS/);
  for (const tool of LIVE_TOOLS) {
    assert.doesNotMatch(prompt, new RegExp(tool));
  }
});

test('buildSystemPrompt ignores legacy dead-tool flags even when set to true', () => {
  const prompt = buildSystemPrompt({
    export: true,
    switchTab: true,
    generateComponent: true,
  });
  for (const dead of DEAD_TOOLS) {
    assert.doesNotMatch(prompt, new RegExp(dead));
  }
});

test('getToolCompletions returns only live tools and filters by query', () => {
  const engine = createChatEngine();
  const all = engine.getToolCompletions('');
  assert.deepEqual(all.map(t => t.label), LIVE_TOOLS);

  assert.deepEqual(engine.getToolCompletions('nav').map(t => t.label), ['navigate_to_page']);
  assert.deepEqual(engine.getToolCompletions('HEADING').map(t => t.label), ['scroll_to_section']);
  assert.deepEqual(engine.getToolCompletions('search').map(t => t.label), ['search_docs']);

  for (const dead of DEAD_TOOLS) {
    assert.deepEqual(engine.getToolCompletions(dead), []);
  }
});

test('getToolCompletions respects individual and full toolConfig gating', () => {
  assert.deepEqual(
    createChatEngine({ tools: { navigate: false } }).getToolCompletions('').map(t => t.label),
    ['search_docs', 'scroll_to_section'],
  );
  assert.deepEqual(
    createChatEngine({ tools: { search: false } }).getToolCompletions('').map(t => t.label),
    ['navigate_to_page', 'scroll_to_section'],
  );
  assert.deepEqual(
    createChatEngine({ tools: { scrollToSection: false } }).getToolCompletions('').map(t => t.label),
    ['navigate_to_page', 'search_docs'],
  );
  assert.deepEqual(
    createChatEngine({ tools: { navigate: false, search: false, scrollToSection: false } }).getToolCompletions(''),
    [],
  );
});

test('buildWorkerMessages embeds the gated system prompt in the first user message', () => {
  const engine = createChatEngine({ tools: { search: false } });
  const messages = engine.buildWorkerMessages('Sample doc context');

  assert.equal(messages[0].role, 'user');
  assert.match(messages[0].content, /navigate_to_page/);
  assert.match(messages[0].content, /scroll_to_section/);
  assert.doesNotMatch(messages[0].content, /search_docs/);
  for (const dead of DEAD_TOOLS) {
    assert.doesNotMatch(messages[0].content, new RegExp(dead));
  }
});
