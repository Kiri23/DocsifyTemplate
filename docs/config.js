/**
 * DocsifyTemplate Configuration
 *
 * Edit this file to customize your docs site.
 * All values shown are defaults — only override what you need.
 *
 * The config is available at runtime via:
 *   import { getConfig } from '/lib/core/config.js';
 */
window.__docsifyTemplateConfig = {

  // ── Site ─────────────────────────────────────
  title: 'DocsifyTemplate Change Config',
  description: 'Zero-build-step interactive documentation framework',
  tagline: 'Docs that just work',

  // ── Theme ────────────────────────────────────
  // Change these to re-skin the entire site.
  // All components use CSS custom properties derived from these values.
  theme: {
    primary: '#0891b2',       // Main accent color
    // primaryLight: '#ecfeff',
    // primaryText: '#0e7490',
    // brand: '#95c22f',
    // surface: '#faf9f7',
    // codeBg: '#1e1e2e',
  },

  // ── Features ─────────────────────────────────
  features: {

    // AI Chat — Gemma 4 E2B running in-browser via WebGPU
    chat: {
      enabled: true,
      model: {
        id: 'onnx-community/gemma-4-E2B-it-ONNX',
        label: 'Gemma 4 E2B',
        architecture: 'gemma4',  // 'gemma4' | 'causal-lm'
        dtype: 'q4f16',
        nativeToolCalling: true,
      },
      tools: {
        export: true,           // "Export this page as PDF"
        navigate: true,         // "Go to the getting started page"
        switchTab: true,        // "Show me the technical reference"
        search: true,           // "Search for card-grid"
        generateComponent: true,// "Create a card grid with 4 items"
        scrollToSection: true,  // "Scroll to the architecture section"
      },
    },

    // PDF / LaTeX / Markdown export via Pandoc WASM
    export: {
      enabled: true,
      formats: ['pdf', 'latex-branded', 'markdown'],
      defaultFormat: 'pdf',
    },

    // Tabbed layout (Quick Start / Technical Reference split)
    tabs: {
      enabled: true,
      labels: {
        'quick-start': 'Quick Start',
        'technical': 'Technical Reference',
      },
    },

    // Copy button on code blocks
    copyButton: { enabled: true },

    // Mermaid diagrams
    mermaid: {
      enabled: true,
      theme: 'default',
    },

    // Dev tools (Eruda in-browser console)
    // Enable for development, disable for production
    devTools: { enabled: true },
  },

  // ── Components ───────────────────────────────
  // Override default components with custom implementations.
  // The key is the component name, the value is the path to your JS module.
  // Your module must export the same named function as the original.
  //
  // Example:
  //   components: {
  //     'card-grid': '/my-components/fancy-cards.js',
  //   },
  components: {},

  // ── Syntax Highlighting ──────────────────────
  prism: {
    languages: ['javascript', 'json', 'yaml', 'bash', 'csharp', 'markdown'],
  },

  // ── Extra <head> Tags ────────────────────────
  // head: [
  //   { tag: 'meta', attrs: { name: 'author', content: 'Your Name' } },
  //   { tag: 'script', attrs: { src: 'https://analytics.example.com/script.js', defer: true } },
  // ],
  head: [],
};
