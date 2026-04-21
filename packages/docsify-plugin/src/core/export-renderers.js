// Export renderers — convert parsed YAML component data to output formats.
// Pure functions. No window, no document, no framework dependency.
// Each format exports a renderComponent(lang, data) function.

// --- Typst ---

function escapeTypst(s) {
  if (typeof s !== 'string') return String(s || '');
  return s.replace(/\\/g, '\\\\').replace(/#/g, '\\#').replace(/\$/g, '\\$')
    .replace(/@/g, '\\@').replace(/</g, '\\<').replace(/>/g, '\\>').replace(/~/g, '\\~');
}

function q(s) {
  if (typeof s !== 'string') s = String(s || '');
  return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

const typstRenderers = {
  'card-grid'(data) {
    const cards = Array.isArray(data) ? data : [];
    const out = ['#cardgridbegin()'];
    for (const card of cards) {
      out.push(`#card(${q(card.icon || '')}, ${q(card.title || 'Untitled')}, ${q(card.description || '')})`);
    }
    out.push('#cardgridend()');
    return out.join('\n');
  },
  'entity-schema'(data) {
    const out = [`#entitybegin(${q(data.name || 'Entity')}, ${q(data.parent || '')})`];
    for (const f of data.fields || []) {
      const vals = Array.isArray(f.values) ? f.values.join(', ') : '';
      out.push(`#entityfield(${q(f.name || '')}, ${q(f.type || 'any')}, ${f.required ? 'true' : 'false'}, ${q(f.description || '')}, ${q(vals)})`);
    }
    out.push('#entityend()');
    return out.join('\n');
  },
  'api-endpoint'(data) {
    const out = [`#apibegin(${q((data.method || 'GET').toUpperCase())}, ${q(data.path || '/')})`];
    if (data.description) out.push(`#apidesc(${q(data.description)})`);
    for (const p of data.params || []) {
      out.push(`#apiparam(${q(p.name || '')}, ${q(p.type || 'any')}, ${p.required ? 'true' : 'false'})`);
    }
    if (data.response) out.push(`#apiresponse(${q(data.response.trim())})`);
    out.push('#apiend()');
    return out.join('\n');
  },
  'status-flow'(data) {
    const states = data.states || [];
    const out = ['#flowbegin()'];
    states.forEach((s, idx) => {
      const nextStr = Array.isArray(s.next) ? s.next.join(', ') : '';
      const effectsStr = Array.isArray(s.effects) ? s.effects.join(', ') : '';
      out.push(`#flowstate(${q(s.label || s.id || 'State')}, ${q(s.trigger || '')}, ${q(nextStr)}, ${q(effectsStr)}, ${idx === states.length - 1 ? 'true' : 'false'})`);
    });
    out.push('#flowend()');
    return out.join('\n');
  },
  'directive-table'(data) {
    const out = [`#directivebegin(${q(data.title || 'Directives')})`];
    for (const cat of data.categories || []) {
      out.push(`#directivecategory(${q(cat.name || '')})`);
      for (const d of cat.directives || []) {
        out.push(`#directive(${q(d.name || '')}, ${q(d.type || '')}, ${q(String(d.default || ''))}, ${q(d.description || '')})`);
      }
    }
    out.push('#directiveend()');
    return out.join('\n');
  },
  'step-type'(data) {
    const out = [`#stepbegin(${q(data.name || 'Step')}, ${q((data.category || 'sync').toLowerCase())})`];
    if (data.description) out.push(`#stepdesc(${q(data.description)})`);
    for (const p of data.properties || []) {
      out.push(`#stepprop(${q(p.name || '')}, ${q(p.type || '')}, ${p.required ? 'true' : 'false'}, ${q(p.description || '')})`);
    }
    if (data.example) out.push(`#stepexample(${q(data.example.trim())})`);
    out.push('#stepend()');
    return out.join('\n');
  },
  'config-example'(data) {
    const out = [`#configbegin(${q(data.title || '')}, ${q(data.language || 'json')})`];
    if (data.code) out.push(`#configcode(${q(data.code.trim())})`);
    for (const a of data.annotations || []) {
      out.push(`#configannotation(${a.line || 0}, ${q(a.text || '')})`);
    }
    out.push('#configend()');
    return out.join('\n');
  },
  'side-by-side'(data) {
    const left = data.left || {};
    const right = data.right || {};
    return [
      '#sidebegin()',
      `#sidepanel(${q(left.title || '')}, ${q(left.content || '')}, ${q(left.language || '')})`,
      `#sidepanel(${q(right.title || '')}, ${q(right.content || '')}, ${q(right.language || '')})`,
      '#sideend()'
    ].join('\n');
  }
};

// --- LaTeX ---

function escapeLatex(s) {
  if (typeof s !== 'string') return String(s || '');
  s = s.replace(/\\/g, '\\textbackslash{}');
  s = s.replace(/([#$%&_{}<>~^])/g, '\\$1');
  s = s.replace(/\\textbackslash\\\{\\\}/g, '\\textbackslash{}');
  return s;
}

function escapeVerbatim(s) {
  if (typeof s !== 'string') return String(s || '');
  return s.replace(/\$/g, '\\$');
}

const latexRenderers = {
  'card-grid'(data) {
    const cards = Array.isArray(data) ? data : [];
    const out = ['\\cardgridbegin'];
    for (const card of cards) {
      out.push(`\\card{${escapeLatex(card.icon || '')}}{${escapeLatex(card.title || 'Untitled')}}{${escapeLatex(card.description || '')}}`);
    }
    out.push('\\cardgridend');
    return out.join('\n');
  },
  'entity-schema'(data) {
    const out = [`\\entitybegin{${escapeLatex(data.name || 'Entity')}}{${escapeLatex(data.parent || '')}}`];
    for (const f of data.fields || []) {
      const vals = Array.isArray(f.values) ? f.values.join(', ') : '';
      out.push(`\\entityfield{${escapeLatex(f.name || '')}}{${escapeLatex(f.type || 'any')}}{${f.required ? 'true' : 'false'}}{${escapeLatex(f.description || '')}}{${escapeLatex(vals)}}`);
    }
    out.push('\\entityend');
    return out.join('\n');
  },
  'api-endpoint'(data) {
    const out = [`\\apibegin{${(data.method || 'GET').toUpperCase()}}{${escapeLatex(data.path || '/')}}`];
    if (data.description) out.push(`\\apidesc{${escapeLatex(data.description)}}`);
    for (const p of data.params || []) {
      out.push(`\\apiparam{${escapeLatex(p.name || '')}}{${escapeLatex(p.type || 'any')}}{${p.required ? 'true' : 'false'}}`);
    }
    if (data.response) out.push(`\\apiresponse{${escapeVerbatim(data.response.trim())}}`);
    out.push('\\apiend');
    return out.join('\n');
  },
  'status-flow'(data) {
    const states = data.states || [];
    const out = ['\\flowbegin'];
    states.forEach((s, idx) => {
      const nextStr = Array.isArray(s.next) ? s.next.join(', ') : '';
      const effectsStr = Array.isArray(s.effects) ? s.effects.join(', ') : '';
      out.push(`\\flowstate{${escapeLatex(s.label || s.id || 'State')}}{${escapeLatex(s.trigger || '')}}{${escapeLatex(nextStr)}}{${escapeLatex(effectsStr)}}{${idx === states.length - 1 ? 'true' : 'false'}}`);
    });
    out.push('\\flowend');
    return out.join('\n');
  },
  'directive-table'(data) {
    const out = [`\\directivebegin{${escapeLatex(data.title || 'Directives')}}`];
    for (const cat of data.categories || []) {
      out.push(`\\directivecategory{${escapeLatex(cat.name || '')}}`);
      for (const d of cat.directives || []) {
        out.push(`\\directive{${escapeLatex(d.name || '')}}{${escapeLatex(d.type || '')}}{${escapeLatex(String(d.default || ''))}}{${escapeLatex(d.description || '')}}`);
      }
    }
    out.push('\\directiveend');
    return out.join('\n');
  },
  'step-type'(data) {
    const out = [`\\stepbegin{${escapeLatex(data.name || 'Step')}}{${(data.category || 'sync').toLowerCase()}}`];
    if (data.description) out.push(`\\stepdesc{${escapeLatex(data.description)}}`);
    for (const p of data.properties || []) {
      out.push(`\\stepprop{${escapeLatex(p.name || '')}}{${escapeLatex(p.type || '')}}{${p.required ? 'true' : 'false'}}{${escapeLatex(p.description || '')}}`);
    }
    if (data.example) out.push(`\\stepexample{${escapeVerbatim(data.example.trim())}}`);
    out.push('\\stepend');
    return out.join('\n');
  },
  'config-example'(data) {
    const out = [`\\configbegin{${escapeLatex(data.title || '')}}{${escapeLatex(data.language || 'json')}}`];
    if (data.code) out.push(`\\configcode{${escapeVerbatim(data.code.trim())}}`);
    for (const a of data.annotations || []) {
      out.push(`\\configannotation{${a.line || 0}}{${escapeLatex(a.text || '')}}`);
    }
    out.push('\\configend');
    return out.join('\n');
  },
  'side-by-side'(data) {
    const left = data.left || {};
    const right = data.right || {};
    return [
      '\\sidebegin',
      `\\sidepanel{${escapeLatex(left.title || '')}}{${left.language ? escapeVerbatim(left.content || '') : escapeLatex(left.content || '')}}{${escapeLatex(left.language || '')}}`,
      `\\sidepanel{${escapeLatex(right.title || '')}}{${right.language ? escapeVerbatim(right.content || '') : escapeLatex(right.content || '')}}{${escapeLatex(right.language || '')}}`,
      '\\sideend'
    ].join('\n');
  }
};

// --- Markdown / LLM ---

const markdownRenderers = {
  'card-grid'(data) {
    const cards = Array.isArray(data) ? data : [];
    return cards.map(c => `- **${c.title || 'Untitled'}**${c.description ? ': ' + c.description : ''}`).join('\n');
  },
  'entity-schema'(data) {
    const out = [
      `### Entity: ${data.name || 'Entity'}${data.parent ? ' (extends ' + data.parent + ')' : ''}`,
      '', '| Field | Type | Required | Description |', '|-------|------|----------|-------------|'
    ];
    for (const f of data.fields || []) {
      const desc = (f.description || '') + (Array.isArray(f.values) ? ' Values: ' + f.values.join(', ') : '');
      out.push(`| \`${f.name || ''}\` | \`${f.type || 'any'}\` | ${f.required ? 'Yes' : 'No'} | ${desc} |`);
    }
    return out.join('\n');
  },
  'api-endpoint'(data) {
    const out = [`### ${(data.method || 'GET').toUpperCase()} \`${data.path || '/'}\``];
    if (data.description) { out.push('', data.description); }
    if (data.params && data.params.length) {
      out.push('', '**Parameters:**');
      for (const p of data.params) {
        out.push(`- \`${p.name || ''}\` (${p.type || 'any'})${p.required ? ' (required)' : ''}`);
      }
    }
    if (data.response) { out.push('', '**Response:**', '```json', data.response.trim(), '```'); }
    return out.join('\n');
  },
  'status-flow'(data) {
    const states = data.states || [];
    const labels = states.map(s => s.label || s.id || '?');
    const out = ['### State Machine', '', '**Flow:** ' + labels.join(' → '), ''];
    for (const s of states) {
      out.push(`**${s.label || s.id || 'State'}**`);
      if (s.trigger) out.push('- Trigger: ' + s.trigger);
      if (Array.isArray(s.next) && s.next.length) out.push('- Next: ' + s.next.join(', '));
      if (Array.isArray(s.effects) && s.effects.length) out.push('- Effects: ' + s.effects.join(', '));
      out.push('');
    }
    return out.join('\n');
  },
  'directive-table'(data) {
    const out = [
      `### ${data.title || 'Directives'}`, '',
      '| Directive | Type | Default | Description |', '|-----------|------|---------|-------------|'
    ];
    for (const cat of data.categories || []) {
      for (const d of cat.directives || []) {
        out.push(`| \`${d.name || ''}\` | ${d.type || ''} | ${String(d.default || '---')} | ${d.description || ''} |`);
      }
    }
    return out.join('\n');
  },
  'step-type'(data) {
    const out = [`### Step: ${data.name || 'Step'} (${(data.category || 'sync').toLowerCase()})`];
    if (data.description) { out.push('', data.description); }
    if (data.properties && data.properties.length) {
      out.push('', '**Properties:**');
      for (const p of data.properties) {
        out.push(`- \`${p.name || ''}\` (${p.type || 'any'})${p.required ? ' (required)' : ''}${p.description ? ': ' + p.description : ''}`);
      }
    }
    if (data.example) { out.push('', '**Example:**', '```json', data.example.trim(), '```'); }
    return out.join('\n');
  },
  'config-example'(data) {
    const out = [];
    if (data.title) { out.push(`**${data.title}**`, ''); }
    out.push('```' + (data.language || 'json'), (data.code || '').trim(), '```');
    if (data.annotations && data.annotations.length) {
      out.push('', '**Annotations:**');
      for (const a of data.annotations) {
        out.push(`- Line ${a.line || 0}: ${a.text || ''}`);
      }
    }
    return out.join('\n');
  },
  'side-by-side'(data) {
    function panel(p, label) {
      const parts = [`**${p.title || label}:**`];
      if (p.content) {
        if (p.language) { parts.push('```' + p.language, p.content, '```'); }
        else { parts.push(p.content); }
      }
      return parts.join('\n');
    }
    return panel(data.left || {}, 'Left') + '\n\n' + panel(data.right || {}, 'Right');
  }
};

// --- Public API ---

export const exportFormats = {
  typst: typstRenderers,
  latex: latexRenderers,
  markdown: markdownRenderers
};

// Pandoc raw block wrappers — ensures output passes through verbatim
const rawBlockWrappers = {
  typst: (s) => '\n```{=typst}\n' + s + '\n```\n',
  latex: (s) => '\n```{=latex}\n' + s + '\n```\n',
  markdown: null  // markdown output IS markdown — no wrapping needed
};

// Returns a renderComponent callback for use with transformMarkdown
export function createExportRenderer(format) {
  const renderers = exportFormats[format];
  if (!renderers) throw new Error('Unknown export format: ' + format);
  const wrap = rawBlockWrappers[format];

  return function renderForExport(lang, data) {
    const renderer = renderers[lang];
    if (!renderer) return null;
    const output = renderer(data);
    return wrap ? wrap(output) : output;
  };
}
