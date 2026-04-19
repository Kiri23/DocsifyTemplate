// LaTeX renderer — converts parsed YAML component data to \commands

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

export const latexRenderers = {
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
