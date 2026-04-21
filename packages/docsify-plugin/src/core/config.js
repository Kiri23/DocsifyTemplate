/**
 * DocsifyTemplate Configuration
 *
 * Starlight-inspired config pattern adapted for zero-build-step.
 * Instead of Zod + Vite virtual modules, we use a plain JS object
 * with defaults + validation at runtime.
 *
 * Usage in docs/index.html:
 *   <script>
 *     window.__docsifyTemplateConfig = { title: 'My Docs', ... };
 *   </script>
 *
 * Features read config via: import { getConfig } from '/lib/core/config.js';
 */

// ── Schema Defaults ─────────────────────────────────────────

const DEFAULTS = {
  // ── Site ─────────────────────────────────────
  title: 'DocsifyTemplate',
  description: '',
  tagline: '',

  // ── Theme ────────────────────────────────────
  theme: {
    // Brand colors — change these to re-skin the entire site
    primary: '#0891b2',
    primaryLight: '#ecfeff',
    primaryText: '#0e7490',
    brand: '#95c22f',

    // Surfaces
    surface: '#faf9f7',
    surfaceRaised: '#f5f5f4',
    surfaceSunken: '#efedeb',

    // Borders
    border: '#e7e5e4',
    borderStrong: '#d6d3d1',

    // Text
    textPrimary: '#1c1917',
    textSecondary: '#44403c',
    textTertiary: '#78716c',
    textMuted: '#a8a29e',

    // Technical zone
    techSurface: '#f8fafc',
    techAccent: '#6366f1',
    techHeading: '#1e293b',
    techSubheading: '#334155',
    techText: '#475569',

    // Code
    codeBg: '#1e1e2e',
    codeText: '#cdd6f4',

    // Semantic
    success: '#34d399',
  },

  // ── Docsify ──────────────────────────────────
  docsify: {
    loadSidebar: true,
    subMaxLevel: 3,
    auto2top: true,
    search: {
      placeholder: 'Search...',
      noData: 'No results.',
      depth: 6,
    },
  },

  // ── Features (enable/disable) ────────────────
  features: {
    // AI Chat — Gemma 4 E2B in-browser via WebGPU
    chat: {
      enabled: true,
      model: {
        id: 'onnx-community/gemma-4-E2B-it-ONNX',
        label: 'Gemma 4 E2B',
        architecture: 'gemma4',
        dtype: 'q4f16',
        nativeToolCalling: true,
        maxNewTokens: 1024,
      },
      // Tool calling
      tools: {
        export: true,
        navigate: true,
        switchTab: true,
        search: true,
        generateComponent: true,
        scrollToSection: true,
      },
    },

    // PDF / LaTeX / Markdown export via Pandoc WASM
    export: {
      enabled: true,
      formats: ['pdf', 'latex-branded', 'markdown'],
      defaultFormat: 'pdf',
      exportAll: true, // Show "Export All" button
    },

    // Tabbed layout (Quick Start / Technical Reference)
    tabs: {
      enabled: true,
      labels: {
        'quick-start': 'Quick Start',
        'technical': 'Technical Reference',
      },
      // Frontmatter type that triggers tabbed layout
      triggerType: 'guide',
    },

    // Copy button on code blocks
    copyButton: {
      enabled: true,
    },

    // Tutorial header (step indicator)
    tutorialHeader: {
      enabled: true,
    },

    // Mermaid diagrams
    mermaid: {
      enabled: true,
      theme: 'default',
      startOnLoad: false,
    },

    // Dev tools (Eruda console)
    devTools: {
      enabled: false, // Off by default in production
    },
  },

  // ── Components ───────────────────────────────
  // Override default components with custom implementations.
  // Keys are component names, values are paths to JS modules.
  // Example: { 'card-grid': '/my-components/custom-card-grid.js' }
  components: {},

  // ── Sidebar ──────────────────────────────────
  sidebar: {
    // Auto-generated from _sidebar.md by default (Docsify handles this)
    // Set to an array to define programmatically:
    // [{ title: 'Guide', items: [{ title: 'Getting Started', path: '/guide/start' }] }]
    items: null,
  },

  // ── Syntax Highlighting ──────────────────────
  prism: {
    languages: ['javascript', 'json', 'yaml', 'bash', 'csharp', 'markdown'],
  },

  // ── Head ─────────────────────────────────────
  // Extra tags for <head>
  head: [],
};

// ── Validation ──────────────────────────────────────────────

function validateConfig(config) {
  const errors = [];

  // Title is required
  if (config.title && typeof config.title !== 'string') {
    errors.push('config.title must be a string');
  }

  // Theme colors must be valid hex
  if (config.theme) {
    for (const [key, value] of Object.entries(config.theme)) {
      if (typeof value === 'string' && !value.match(/^#[0-9a-fA-F]{3,8}$/)) {
        errors.push(`config.theme.${key}: "${value}" is not a valid hex color`);
      }
    }
  }

  // Chat model must have an id
  if (config.features?.chat?.enabled && config.features?.chat?.model) {
    if (!config.features.chat.model.id) {
      errors.push('config.features.chat.model.id is required when chat is enabled');
    }
  }

  // Export formats must be valid
  const validFormats = ['pdf', 'latex-branded', 'markdown'];
  if (config.features?.export?.formats) {
    for (const fmt of config.features.export.formats) {
      if (!validFormats.includes(fmt)) {
        errors.push(`config.features.export.formats: "${fmt}" is not valid. Use: ${validFormats.join(', ')}`);
      }
    }
  }

  if (errors.length > 0) {
    console.error('[DocsifyTemplate] Configuration errors:');
    errors.forEach(e => console.error('  -', e));
  }

  return errors;
}

// ── Deep Merge ──────────────────────────────────────────────

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] === undefined) continue;
    if (
      source[key] !== null &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      typeof target[key] === 'object' &&
      target[key] !== null &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

// ── Hex to RGB ──────────────────────────────────────────────

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return `${(bigint >> 16) & 255} ${(bigint >> 8) & 255} & ${bigint & 255}`;
}

// ── Config Singleton ────────────────────────────────────────

let _config = null;

/**
 * Initialize config from user settings. Call once at startup.
 * Merges user config over defaults, validates, and freezes.
 */
export function initConfig(userConfig = {}) {
  const merged = deepMerge(DEFAULTS, userConfig);
  validateConfig(merged);
  _config = Object.freeze(merged);
  return _config;
}

/**
 * Get the current resolved config. Throws if not initialized.
 */
export function getConfig() {
  if (!_config) {
    // Auto-init from window if available
    const userConfig = (typeof window !== 'undefined' && window.__docsifyTemplateConfig) || {};
    return initConfig(userConfig);
  }
  return _config;
}

/**
 * Check if a feature is enabled.
 */
export function isFeatureEnabled(featurePath) {
  const config = getConfig();
  const parts = featurePath.split('.');
  let current = config.features;
  for (const part of parts) {
    if (current == null) return false;
    current = current[part];
  }
  if (typeof current === 'object' && current !== null) {
    return current.enabled !== false;
  }
  return !!current;
}

/**
 * Generate CSS custom properties string from theme config.
 * Inject into <style> or apply to :root.
 */
export function getThemeCSS() {
  const config = getConfig();
  const t = config.theme;

  return `
    --color-primary: ${t.primary};
    --color-primary-light: ${t.primaryLight};
    --color-primary-text: ${t.primaryText};
    --color-brand: ${t.brand};
    --color-surface: ${t.surface};
    --color-surface-raised: ${t.surfaceRaised};
    --color-surface-sunken: ${t.surfaceSunken};
    --color-border: ${t.border};
    --color-border-strong: ${t.borderStrong};
    --color-text-primary: ${t.textPrimary};
    --color-text-secondary: ${t.textSecondary};
    --color-text-tertiary: ${t.textTertiary};
    --color-text-muted: ${t.textMuted};
    --color-tech-surface: ${t.techSurface};
    --color-tech-accent: ${t.techAccent};
    --color-tech-heading: ${t.techHeading};
    --color-tech-subheading: ${t.techSubheading};
    --color-tech-text: ${t.techText};
    --color-code-bg: ${t.codeBg};
    --color-code-text: ${t.codeText};
    --color-success: ${t.success};
  `.trim();
}

/**
 * Generate Docsify config object from merged config.
 */
export function getDocsifyConfig() {
  const config = getConfig();
  return {
    name: config.title,
    ...config.docsify,
  };
}

/**
 * Get the list of enabled Prism languages.
 */
export function getPrismLanguages() {
  return getConfig().prism.languages;
}

// Export defaults for reference
export { DEFAULTS };
