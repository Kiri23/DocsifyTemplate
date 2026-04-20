// Typst renderer — converts parsed YAML component data to #functions

function escapeTypst(s) {
  if (typeof s !== 'string') return String(s || '');
  return s.replace(/\\/g, '\\\\').replace(/#/g, '\\#').replace(/\$/g, '\\$')
    .replace(/@/g, '\\@').replace(/</g, '\\<').replace(/>/g, '\\>').replace(/~/g, '\\~');
}

function q(s) {
  if (typeof s !== 'string') s = String(s || '');
  return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

export const typstRenderers = {
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
