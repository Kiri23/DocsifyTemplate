// Component Renderer Engine
// Pure functions for markdown processing, component rendering, and post-render enhancements.
// No Docsify dependency — consumed by component-renderer.js via window.__CREngine.

(function() {
  var FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)\n---/;

  // Code fence component registry — these "languages" get parsed as YAML and rendered
  var COMPONENT_REGISTRY = ['entity-schema', 'api-endpoint', 'status-flow', 'directive-table', 'step-type', 'config-example', 'card-grid', 'side-by-side', 'file-tree'];

  // --- Frontmatter ---

  function hasFrontmatter(markdown) {
    return FRONTMATTER_REGEX.test(markdown);
  }

  function extractFrontmatter(markdown) {
    var match = markdown.match(FRONTMATTER_REGEX);
    if (!match) return null;

    var metadata = {};
    match[1].split('\n').forEach(function(line) {
      var colonIndex = line.indexOf(':');
      if (colonIndex === -1) return;

      var key = line.substring(0, colonIndex).trim();
      var value = line.substring(colonIndex + 1).trim();

      // Handle arrays: [tag1, tag2]
      if (value.startsWith('[') && value.endsWith(']')) {
        value = value.slice(1, -1).split(',').map(function(v) { return v.trim(); });
      }

      metadata[key] = value;
    });

    return metadata;
  }

  function stripFrontmatter(markdown) {
    return markdown.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
  }

  // --- Section extraction ---

  function extractSections(markdown) {
    var content = stripFrontmatter(markdown);

    var sections = {
      quickStart: content,
      technical: content
    };

    var quickStartMatch = content.match(/##\s*Quick Start([\s\S]*?)(?=##\s*Technical Reference|$)/i);
    var technicalMatch = content.match(/##\s*Technical Reference([\s\S]*?)$/i);

    // Extract the title (# heading) to prepend to each section
    var titleMatch = content.match(/^#\s+(.+?)$/m);
    var title = titleMatch ? titleMatch[0] : '';

    if (quickStartMatch) {
      sections.quickStart = title + '\n\n' + quickStartMatch[0];
    }

    if (technicalMatch) {
      sections.technical = title + '\n\n' + technicalMatch[0];
    }

    return sections;
  }

  // --- String utilities ---

  // Convert "entity-schema" → "EntitySchema"
  function toCamelCase(name) {
    return name.split('-').map(function(part) {
      return part.charAt(0).toUpperCase() + part.slice(1);
    }).join('');
  }

  // HTML-unescape code content from Docsify's rendering
  function htmlUnescape(str) {
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'");
  }

  // --- Code fence component processing ---

  function processCodeFenceComponents(html) {
    var namesPattern = COMPONENT_REGISTRY.join('|');
    // Docsify uses "lang-" prefix (not "language-"), e.g. class="lang-entity-schema"
    var regex = new RegExp(
      '<pre[^>]*>\\s*<code[^>]*class="[^"]*(?:lang(?:uage)?)-(' + namesPattern + ')"[^>]*>([\\s\\S]*?)<\\/code>\\s*<\\/pre>',
      'gi'
    );

    return html.replace(regex, function(match, componentName, rawContent) {
      try {
        var unescaped = htmlUnescape(rawContent);
        var data = window.jsyaml.load(unescaped);
        var fnName = toCamelCase(componentName);
        var fn = window[fnName];
        if (typeof fn === 'function') {
          return fn(data);
        }
        console.warn('[component-renderer] No function found for:', fnName);
        return match;
      } catch (e) {
        console.error('[component-renderer] Error processing ' + componentName + ':', e);
        return match;
      }
    });
  }

  // --- Tab page builder ---

  function buildTabbedPage(html, rawMarkdown, metadata) {
    if (!metadata || metadata.type !== 'guide') {
      return html;
    }

    var quickStartHtml = '';
    var technicalHtml = '';

    // Split rendered HTML at "Technical Reference" heading
    var splitMarker = /<h2[^>]*>.*?Technical Reference.*?<\/h2>/i;
    var parts = html.split(splitMarker);

    if (parts.length >= 2) {
      quickStartHtml = parts[0];
      technicalHtml = '<h2>Technical Reference</h2>' + parts.slice(1).join('');
    } else {
      quickStartHtml = html;
      technicalHtml = html;
    }

    // Store for HTMX tab switching
    window.__pageSections = {
      'quick-start': quickStartHtml,
      'technical': technicalHtml
    };

    // Render with tabs, Quick Start active by default
    var tabs = window.Tabs([
      { label: 'Quick Start', href: '/api/switch/quick-start', active: true },
      { label: 'Technical Reference', href: '/api/switch/technical', active: false }
    ], 'tab-content');

    return tabs + '<div id="tab-content" class="tab-zone-quick-start" role="tabpanel">' + quickStartHtml + '</div>';
  }

  // --- Post-render enhancements ---

  function highlightCode() {
    if (window.Prism) {
      Prism.highlightAll();
    }
  }

  function processMermaidDiagrams() {
    if (!window.mermaid) return;

    // Docsify renders ```mermaid fences as <pre><code class="lang-mermaid">
    // We need to find those, extract the source, and replace with .mermaid div containers
    var mermaidCodes = document.querySelectorAll('.markdown-section pre code.lang-mermaid, .markdown-section pre code.language-mermaid');
    mermaidCodes.forEach(function(codeEl) {
      var pre = codeEl.parentElement;
      var source = codeEl.textContent;
      var container = document.createElement('div');
      container.className = 'mermaid';
      container.textContent = source;
      pre.parentElement.replaceChild(container, pre);
    });

    var mermaidEls = document.querySelectorAll('.markdown-section .mermaid');
    if (mermaidEls.length > 0) {
      // mermaid v10+ uses run(), v9 uses init()
      if (typeof mermaid.run === 'function') {
        mermaid.run({ nodes: mermaidEls });
      } else {
        mermaid.init(undefined, mermaidEls);
      }
    }
  }

  // --- Expose engine ---

  window.__CREngine = {
    COMPONENT_REGISTRY: COMPONENT_REGISTRY,
    hasFrontmatter: hasFrontmatter,
    extractFrontmatter: extractFrontmatter,
    stripFrontmatter: stripFrontmatter,
    extractSections: extractSections,
    toCamelCase: toCamelCase,
    htmlUnescape: htmlUnescape,
    processCodeFenceComponents: processCodeFenceComponents,
    buildTabbedPage: buildTabbedPage,
    highlightCode: highlightCode,
    processMermaidDiagrams: processMermaidDiagrams,
};
})();
