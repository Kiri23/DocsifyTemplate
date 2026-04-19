// Thin re-export — implementation moved to packages/chat/
// This file exists so existing imports don't break.
export { createChatEngine, getModelCatalog, buildSystemPrompt } from '../../../chat/core/chat-engine.js';

// Legacy compat: SYSTEM_PROMPT as a static string (uses default tool config)
import { buildSystemPrompt } from '../../../chat/core/chat-engine.js';
export const SYSTEM_PROMPT = buildSystemPrompt();

// Legacy compat: MODEL_CATALOG as a static array (uses default model config)
import { getModelCatalog } from '../../../chat/core/chat-engine.js';
export const MODEL_CATALOG = getModelCatalog();
