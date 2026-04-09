// @docsify-template/chat — Browser-native AI chat widget
//
// Core (framework-agnostic):
//   import { createChatEngine, getModelCatalog, buildSystemPrompt } from '@docsify-template/chat';
//
// Adapters (import by path):
//   import { injectGemmaChat } from '@docsify-template/chat/adapters/docsify';
//
// UI primitives (for custom integrations):
//   import { createWidget, appendBubble, ... } from '@docsify-template/chat/ui/chat-dom';

export { createChatEngine, getModelCatalog, buildSystemPrompt } from './core/chat-engine.js';
