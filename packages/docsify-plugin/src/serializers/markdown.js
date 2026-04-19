// Markdown renderer — converts parsed YAML component data to readable markdown (LLM-friendly)

export const markdownRenderers = {
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
