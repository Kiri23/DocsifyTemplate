/* docs-engine v0.1.0 | https://github.com/Kiri23/DocsifyTemplate */

// src/core/markdown-transform.js
import { unified } from "unified";
import remarkParse from "remark-parse";
import { visit } from "unist-util-visit";

// src/core/markdown-utils.js
function toCamelCase(name) {
  return name.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join("");
}

// src/core/markdown-transform.js
function yamlComponents(options = {}) {
  const { parseYaml, transforms = {} } = options;
  return function transformer(tree) {
    const replacements = [];
    visit(tree, "code", (node, index, parent) => {
      if (!node.lang || !transforms[node.lang] || !parent) return;
      try {
        const data = parseYaml(node.value);
        const result = transforms[node.lang](data, node);
        if (result != null) {
          replacements.push({ index, parent, result, position: node.position });
        }
      } catch (e) {
        console.error("[yaml-components] Error processing fence:", node.lang, e);
      }
    });
    for (const { index, parent, result, position } of replacements.reverse()) {
      parent.children.splice(index, 1, { type: "html", value: result, position });
    }
  };
}

// src/components/shared.js
import { html } from "htm/preact";
import { useState } from "preact/hooks";
var DarkContainer = ({ children, className }) => html`
  <div class="rounded-xl overflow-hidden border border-gray-700/60 bg-gray-900 my-5 shadow-md ${className || ""}">
    ${children}
  </div>
`;
var HeaderBar = ({ title, children }) => html`
  <div class="bg-gray-800/80 px-4 py-3 border-b border-gray-700/60 flex items-center justify-between">
    <span class="font-bold text-gray-100 text-base">${title}</span>
    ${children}
  </div>
`;
var TypeBadge = ({ type }) => {
  if (!type) return null;
  return html`
    <span class="inline-block bg-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded-md font-mono">
      ${type}
    </span>
  `;
};
var RequiredBadge = () => html`
  <span class="inline-block bg-rose-500/20 text-rose-300 text-xs px-2 py-0.5 rounded-md font-medium">
    required
  </span>
`;
var Chevron = ({ open, className }) => html`
  <span class="text-gray-500 text-xs transition-transform duration-200 inline-block ${open ? "rotate-90" : ""} ${className || ""}">
    ▶
  </span>
`;
var SectionLabel = ({ text }) => html`
  <span class="text-gray-500 text-xs font-semibold uppercase tracking-wider">
    ${text}
  </span>
`;

// src/components/entity-schema.js
import { html as html2 } from "htm/preact";
import { useState as useState2 } from "preact/hooks";
var FieldRow = ({ field }) => {
  const [open, setOpen] = useState2(false);
  const hasDetail = field.description || field.values && field.values.length > 0;
  return html2`
    <div class="border-b border-gray-700/50 last:border-b-0">
      <div
        class="flex items-center gap-2 px-4 py-2.5 ${hasDetail ? "cursor-pointer hover:bg-gray-800/40" : ""}"
        onClick=${() => hasDetail && setOpen(!open)}
      >
        ${hasDetail ? html2`<${Chevron} open=${open} />` : html2`<span class="w-2 inline-block" />`}
        <span class="text-gray-200 font-mono text-sm">${field.name}</span>
        <${TypeBadge} type=${field.type} />
        ${field.required && html2`<${RequiredBadge} />`}
      </div>
      ${open && hasDetail && html2`
        <div class="px-4 pb-3 pl-8 text-gray-400 text-sm space-y-1">
          ${field.description && html2`<p class="m-0">${field.description}</p>`}
          ${field.values && field.values.length > 0 && html2`
            <div class="flex flex-wrap gap-1">
              ${field.values.map((v, i) => html2`
                <span key=${i} class="bg-gray-800 text-gray-300 text-xs px-2 py-0.5 rounded font-mono">
                  ${String(v)}
                </span>
              `)}
            </div>
          `}
        </div>
      `}
    </div>
  `;
};
var EntitySchema = ({ data }) => {
  const name = data.name || "Entity";
  const fields = data.fields || [];
  return html2`
    <${DarkContainer}>
      <${HeaderBar} title=${name}>
        ${data.parent && html2`
          <span class="text-gray-400 text-xs font-mono">extends ${data.parent}</span>
        `}
      <//>
      <div>
        ${fields.map((field, i) => html2`
          <${FieldRow} key=${field.name || i} field=${field} />
        `)}
      </div>
    <//>
  `;
};

// src/components/card-grid.js
import { html as html3 } from "htm/preact";
var CardGrid = ({ data }) => {
  const cards = Array.isArray(data) ? data : data.items || data.cards || [];
  if (!cards || cards.length === 0) {
    return html3`<p class="text-text-muted text-center">No cards available</p>`;
  }
  return html3`
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 my-2">
      ${cards.map((card, i) => html3`
        <a
          key=${i}
          href=${card.href || "#"}
          class="block bg-surface rounded-xl p-5 md:p-6 min-h-[120px] border border-border hover:border-primary/40 hover:shadow-[0_2px_12px_rgba(8,145,178,0.08)] hover:-translate-y-0.5 transition-all duration-200 group no-underline"
          style="text-decoration: none"
        >
          <div class="text-2xl md:text-3xl mb-2 md:mb-3 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200 origin-left font-mono text-primary">
            ${card.icon}
          </div>
          <h3
            class="text-base md:text-lg font-bold text-text-primary mb-1 md:mb-1.5 group-hover:text-primary transition-colors"
            style="border: none; margin-top: 0; padding: 0;"
          >
            ${card.title || "Untitled"}
          </h3>
          <p class="text-sm text-text-muted leading-relaxed" style="margin: 0;">
            ${card.description || ""}
          </p>
        </a>
      `)}
    </div>
  `;
};

// src/components/api-endpoint.js
import { html as html4 } from "htm/preact";
import { useState as useState3 } from "preact/hooks";
var methodColors = {
  GET: "bg-blue-500/90",
  POST: "bg-emerald-500/90",
  PUT: "bg-amber-500/90 text-black",
  PATCH: "bg-orange-500/90",
  DELETE: "bg-rose-500/90"
};
var ApiEndpoint = ({ data }) => {
  const [open, setOpen] = useState3(false);
  const method = (data.method || "GET").toUpperCase();
  const path = data.path || "/";
  const description = data.description || "";
  const params = data.params || [];
  const response = data.response || "";
  const hasDetail = params.length > 0 || response;
  return html4`
    <${DarkContainer}>
      <div class="flex items-center px-4 py-3 hover:bg-gray-800/40 transition-colors ${hasDetail ? "cursor-pointer" : ""}"
           onClick=${() => hasDetail && setOpen(!open)}>
        <span class="inline-block ${methodColors[method] || "bg-gray-500"} text-white text-xs font-bold px-2.5 py-1 rounded-md mr-3 font-mono tracking-wide">
          ${method}
        </span>
        <span class="font-mono text-gray-100 text-sm">${path}</span>
        ${description && html4`<span class="text-gray-400 text-sm ml-3">${description}</span>`}
        ${hasDetail && html4`<span class="ml-auto"><${Chevron} open=${open} /></span>`}
      </div>
      ${open && hasDetail && html4`
        <div class="px-4 py-3 bg-gray-800/40 border-t border-gray-700/60">
          ${params.length > 0 && html4`
            <div class="mb-3">
              <div class="text-gray-300 text-sm font-semibold mb-2">Parameters</div>
              <table class="text-left" style="background: white; border-radius: 0.5rem; overflow: hidden; border: 1px solid var(--color-border); width: auto !important; display: table">
                <thead>
                  <tr style="border-bottom: 1px solid var(--color-border-strong); background: var(--color-surface-raised)">
                    <th class="px-3 py-1.5 text-xs font-medium uppercase tracking-wide" style="color: var(--color-text-tertiary)">Name</th>
                    <th class="px-3 py-1.5 text-xs font-medium uppercase tracking-wide" style="color: var(--color-text-tertiary)">Type</th>
                    <th class="px-3 py-1.5 text-xs font-medium uppercase tracking-wide" style="color: var(--color-text-tertiary)">Required</th>
                  </tr>
                </thead>
                <tbody>
                  ${params.map((p) => html4`
                    <tr style="border-bottom: 1px solid var(--color-border); background: white">
                      <td class="px-3 py-2 font-mono text-sm" style="color: var(--color-primary-text)">${p.name}</td>
                      <td class="px-3 py-2 text-sm font-mono" style="color: var(--color-text-secondary)">${p.type || "any"}</td>
                      <td class="px-3 py-2">
                        ${p.required ? html4`<span class="text-rose-300 text-xs font-medium">required</span>` : html4`<span class="text-gray-500 text-xs">optional</span>`}
                      </td>
                    </tr>
                  `)}
                </tbody>
              </table>
            </div>
          `}
          ${response && html4`
            <div>
              <div class="text-gray-300 text-sm font-semibold mb-2">Response</div>
              <pre class="rounded-lg p-3 pt-10 text-sm overflow-x-auto"
                   style="background: var(--color-code-bg) !important; color: var(--color-code-text) !important; border: 1px solid rgba(255,255,255,0.1) !important; position: relative">
                <code style="background: transparent !important; color: inherit !important">${response}</code>
              </pre>
            </div>
          `}
        </div>
      `}
    <//>
  `;
};

// src/components/status-flow.js
import { html as html5 } from "htm/preact";
import { useState as useState4 } from "preact/hooks";
var stateColors = [
  { bg: "bg-blue-500/15", border: "border-blue-500/50", text: "text-blue-400", activeBg: "bg-blue-500", activeText: "text-white" },
  { bg: "bg-amber-500/15", border: "border-amber-500/50", text: "text-amber-400", activeBg: "bg-amber-500", activeText: "text-black" },
  { bg: "bg-emerald-500/15", border: "border-emerald-500/50", text: "text-emerald-400", activeBg: "bg-emerald-500", activeText: "text-white" },
  { bg: "bg-rose-500/15", border: "border-rose-500/50", text: "text-rose-400", activeBg: "bg-rose-500", activeText: "text-white" },
  { bg: "bg-purple-500/15", border: "border-purple-500/50", text: "text-purple-400", activeBg: "bg-purple-500", activeText: "text-white" },
  { bg: "bg-cyan-500/15", border: "border-cyan-500/50", text: "text-cyan-400", activeBg: "bg-cyan-500", activeText: "text-white" }
];
var StatusFlow = ({ data }) => {
  const [activeIndex, setActiveIndex] = useState4(null);
  const states = data.states || [];
  if (states.length === 0) return html5`<p class="text-text-muted">No states defined</p>`;
  return html5`
    <${DarkContainer}>
      <div class="flex flex-wrap items-center gap-2 mb-1 p-4">
        ${states.map((state, i) => {
    const color = stateColors[i % stateColors.length];
    const isActive = activeIndex === i;
    const btnClass = isActive ? `sf-btn ${color.activeBg} border ${color.border} ${color.activeText}` : `sf-btn ${color.bg} border ${color.border} ${color.text}`;
    return html5`
            <button class="${btnClass} text-sm font-medium px-3.5 py-1.5 rounded-lg transition-all duration-200 hover:opacity-80 whitespace-nowrap"
                    onClick=${() => setActiveIndex(isActive ? null : i)}>
              ${state.label || state.id}
            </button>
            ${i < states.length - 1 && html5`<span class="text-gray-600 mx-1.5 flex-shrink-0">→</span>`}
          `;
  })}
      </div>
      ${activeIndex !== null && html5`
        <div class="mt-3 px-4 py-3 bg-gray-800/40 rounded-lg border border-gray-700/50 mx-4 mb-4">
          ${states[activeIndex].trigger && html5`
            <div class="mb-2"><${SectionLabel} text="Trigger:" /> <span class="text-gray-300 text-sm">${states[activeIndex].trigger}</span></div>
          `}
          ${states[activeIndex].next && states[activeIndex].next.length > 0 && html5`
            <div class="mb-2"><${SectionLabel} text="Next states:" />${" "}
              <span class="text-sm">${states[activeIndex].next.map((n) => html5`<${TypeBadge} type=${n} />`)}</span>
            </div>
          `}
          ${states[activeIndex].effects && states[activeIndex].effects.length > 0 && html5`
            <div><${SectionLabel} text="Side effects:" />${" "}
              <span class="text-sm">${states[activeIndex].effects.map((e) => html5`
                <span class="inline-block bg-cyan-900/25 text-cyan-300 text-xs px-2 py-0.5 rounded-md mr-1">${e}</span>
              `)}</span>
            </div>
          `}
        </div>
      `}
    <//>
  `;
};

// src/components/config-example.js
import { html as html6 } from "htm/preact";
import { useState as useState5 } from "preact/hooks";
var ConfigExample = ({ data }) => {
  const [activeAnnotation, setActiveAnnotation] = useState5(null);
  const title = data.title || "";
  const code = data.code || "";
  const annotations = data.annotations || [];
  const lines = code.split("\n");
  const annotationMap = {};
  annotations.forEach((ann, idx) => {
    annotationMap[ann.line] = { index: idx + 1, text: ann.text };
  });
  return html6`
    <${DarkContainer}>
      ${title && html6`
        <${HeaderBar} title=${title}>
          <span class="text-gray-500 text-xs">${annotations.length} annotation${annotations.length !== 1 ? "s" : ""}</span>
        <//>
      `}
      <div class="py-3 font-mono text-sm leading-relaxed overflow-x-auto">
        ${lines.map((line, i) => {
    const lineNum = i + 1;
    const ann = annotationMap[lineNum];
    return html6`
            <div class="ce-line relative pr-8 ${ann ? "bg-cyan-500/5" : ""}">
              <span class="text-gray-600 select-none inline-block w-8 text-right mr-3 text-xs">${lineNum}</span>
              <span>${line}</span>
              ${ann && html6`
                <span class="ce-marker absolute -right-1 top-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500 text-white text-xs font-bold cursor-pointer hover:bg-cyan-400 transition-colors"
                      onClick=${(e) => {
      e.stopPropagation();
      setActiveAnnotation(activeAnnotation === ann.index ? null : ann.index);
    }}
                      title="Click for annotation">
                  ${ann.index}
                </span>
              `}
            </div>
          `;
  })}
      </div>
      ${annotations.map((ann, idx) => {
    const num = idx + 1;
    if (activeAnnotation !== num) return null;
    return html6`
          <div class="px-4 py-3 bg-gray-800/60 border-l-2 border-cyan-500 mx-4 my-2 rounded-r-lg">
            <div class="flex items-start gap-2">
              <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500 text-white text-xs font-bold flex-shrink-0 mt-0.5">${num}</span>
              <span class="text-gray-300 text-sm leading-relaxed">${ann.text}</span>
            </div>
          </div>
        `;
  })}
    <//>
  `;
};

// src/components/directive-table.js
import { html as html7 } from "htm/preact";
import { useState as useState6 } from "preact/hooks";
var DirectiveRow = ({ dir }) => {
  const [open, setOpen] = useState6(false);
  const hasDetail = dir.example || dir.details;
  return html7`
    <div class="dt-directive border-b border-gray-700/50 last:border-b-0">
      <div class="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800/40 transition-colors ${hasDetail ? "cursor-pointer" : ""}"
           onClick=${() => hasDetail && setOpen(!open)}>
        <span class="mr-2">
          ${hasDetail ? html7`<${Chevron} open=${open} />` : html7`<span class="w-2 inline-block" />`}
        </span>
        <span class="font-mono text-cyan-300 text-sm whitespace-nowrap">${dir.name || ""}</span>
        <span class="text-gray-400 text-sm flex-1 truncate">${dir.description || ""}</span>
        <span class="ml-auto flex items-center gap-2 flex-shrink-0">
          <${TypeBadge} type=${dir.type} />
          ${dir.default !== void 0 && html7`
            <span class="inline-block bg-gray-700/60 text-gray-400 text-xs px-2 py-0.5 rounded-md">default: ${dir.default}</span>
          `}
        </span>
      </div>
      ${open && hasDetail && html7`
        <div class="px-4 py-3 bg-gray-800/40 border-t border-gray-700/50">
          ${dir.details && html7`<p class="text-gray-400 text-sm mb-2 leading-relaxed">${dir.details}</p>`}
          ${dir.example && html7`
            <pre class="!mt-0 !mb-0 rounded-lg bg-gray-950 border border-gray-700/50">
              <code class="language-json text-xs">${dir.example}</code>
            </pre>
          `}
        </div>
      `}
    </div>
  `;
};
var CategorySection = ({ cat }) => {
  const [open, setOpen] = useState6(true);
  const directives = cat.directives || [];
  return html7`
    <div class="dt-category">
      <div class="bg-gray-800/60 px-4 py-2.5 border-b border-gray-700/60 flex items-center gap-2 cursor-pointer"
           onClick=${() => setOpen(!open)}>
        <${Chevron} open=${open} />
        <span class="font-semibold text-gray-200 text-sm">${cat.name || "Uncategorized"}</span>
        <span class="text-gray-500 text-xs ml-auto">${directives.length}</span>
      </div>
      ${open && html7`
        <div>${directives.map((dir) => html7`<${DirectiveRow} dir=${dir} />`)}</div>
      `}
    </div>
  `;
};
var DirectiveTable = ({ data }) => {
  const [query, setQuery] = useState6("");
  const title = data.title || "Directives";
  const searchable = data.searchable !== false;
  const categories = data.categories || [];
  const totalCount = categories.reduce((sum, cat) => sum + (cat.directives || []).length, 0);
  const filteredCategories = categories.map((cat) => ({
    ...cat,
    directives: (cat.directives || []).filter((dir) => {
      if (!query) return true;
      const q2 = query.toLowerCase();
      return (dir.name || "").toLowerCase().includes(q2) || (dir.description || "").toLowerCase().includes(q2);
    })
  })).filter((cat) => cat.directives.length > 0);
  const visibleCount = filteredCategories.reduce((sum, cat) => sum + cat.directives.length, 0);
  return html7`
    <${DarkContainer}>
      <${HeaderBar} title=${title} />
      ${searchable && html7`
        <div class="px-4 py-3 border-b border-gray-700/60">
          <div class="relative">
            <input type="text" placeholder="Search directives..."
                   class="w-full bg-gray-800/60 text-gray-200 text-sm px-3 py-2 pl-8 rounded-lg border border-gray-600/60 focus:border-cyan-500 focus:outline-none transition-colors"
                   value=${query}
                   onInput=${(e) => setQuery(e.target.value)} />
            <span class="absolute left-2.5 top-2.5 text-gray-500 text-sm">🔍</span>
          </div>
          <div class="mt-2">
            <span class="text-gray-500 text-xs">${visibleCount} of ${totalCount} directives</span>
          </div>
        </div>
      `}
      <div class="max-h-[600px] overflow-y-auto">
        ${filteredCategories.map((cat) => html7`<${CategorySection} cat=${cat} />`)}
      </div>
    <//>
  `;
};

// src/components/step-type.js
import { html as html8 } from "htm/preact";
import { useState as useState7 } from "preact/hooks";
var StepType = ({ data }) => {
  const [exampleOpen, setExampleOpen] = useState7(false);
  const name = data.name || "Step";
  const category = data.category || "sync";
  const description = data.description || "";
  const properties = data.properties || [];
  const example = data.example || "";
  const badgeClass = category === "async" ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
  return html8`
    <${DarkContainer}>
      <div class="bg-gray-800/80 px-4 py-3 border-b border-gray-700/60 flex items-center gap-3">
        <span class="font-bold text-gray-100 text-base">${name}</span>
        <span class="inline-block text-xs px-2.5 py-0.5 rounded-md font-medium ${badgeClass}">
          ${category === "async" ? "async" : "sync"}
        </span>
      </div>
      ${description && html8`<div class="px-4 py-3 text-gray-300 text-sm leading-relaxed">${description}</div>`}
      ${properties.length > 0 && html8`
        <div class="border-t border-gray-700/60">
          <div class="px-4 py-2 bg-gray-800/40"><${SectionLabel} text="Properties" /></div>
          ${properties.map((prop) => html8`
            <div class="flex items-center gap-3 px-4 py-2 border-b border-gray-700/50 last:border-b-0">
              <span class="font-mono text-cyan-300 text-sm whitespace-nowrap">${prop.name || ""}</span>
              <span class="text-gray-400 text-sm flex-1">${prop.description || ""}</span>
              <span class="ml-auto flex items-center gap-2 flex-shrink-0">
                <${TypeBadge} type=${prop.type} />
                ${prop.required && html8`<${RequiredBadge} />`}
              </span>
            </div>
          `)}
        </div>
      `}
      ${example && html8`
        <div class="border-t border-gray-700/60">
          <div class="px-4 py-2 bg-gray-800/40 cursor-pointer flex items-center gap-2"
               onClick=${() => setExampleOpen(!exampleOpen)}>
            <${Chevron} open=${exampleOpen} />
            <${SectionLabel} text="Config Example" />
          </div>
          ${exampleOpen && html8`
            <div class="px-4 py-3 bg-gray-950/40">
              <pre class="!mt-0 !mb-0 rounded-lg bg-gray-950 border border-gray-700/50">
                <code class="language-json text-xs">${example}</code>
              </pre>
            </div>
          `}
        </div>
      `}
    <//>
  `;
};

// src/components/side-by-side.js
import { html as html9 } from "htm/preact";

// src/core/registry.js
var _components = {};
if (typeof window !== "undefined") window.PreactComponents = _components;
function register(fenceName, component) {
  const key = toCamelCase(fenceName);
  if (_components[key]) {
    console.warn(`[registry] Overwriting component: ${key} (fence: ${fenceName})`);
  }
  _components[key] = component;
}
function registerAll(map) {
  Object.entries(map).forEach(([fenceName, component]) => register(fenceName, component));
}
function getComponent(name) {
  return _components[toCamelCase(name)];
}

// src/components/side-by-side.js
function Panel({ panel }) {
  const title = panel.title || "";
  const content = panel.content || "";
  const language = panel.language || "";
  const component = panel.component || "";
  const panelData = panel.data != null ? panel.data : null;
  let body;
  if (component && panelData != null) {
    const Component = getComponent(component);
    if (Component) {
      body = html9`<div class="overflow-auto"><${Component} data=${panelData} /></div>`;
    } else {
      body = html9`<div class="text-red-500 text-sm">Component not found: ${component}</div>`;
    }
  } else if (language) {
    body = html9`<pre class="!m-0 !rounded-md !bg-gray-900"><code class="language-${language}">${content}</code></pre>`;
  } else {
    body = html9`<div class="text-sm text-text-secondary whitespace-pre-wrap break-words">${content}</div>`;
  }
  return html9`
    <div class="flex-1 min-w-0">
      <div class="bg-surface border border-border rounded-lg p-4 h-full">
        ${title && html9`
          <div class="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2 pb-2 border-b border-border">${title}</div>
        `}
        ${body}
      </div>
    </div>
  `;
}
var SideBySide = ({ data }) => {
  return html9`
    <div class="flex flex-col md:flex-row gap-4 my-4">
      <${Panel} panel=${data.left || {}} />
      <${Panel} panel=${data.right || {}} />
    </div>
  `;
};

// src/components/file-tree.js
import { html as html10 } from "htm/preact";
function TreeNode({ node, prefix }) {
  const name = node.name || "";
  const desc = node.description || "";
  return html10`
    <div>
      <div class="flex items-baseline leading-relaxed">
        <span class="text-gray-600 select-none whitespace-pre" style="font-family: var(--font-mono)">${prefix}</span>
        <span class="font-mono text-cyan-300 text-sm">${name}</span>
        ${desc && html10`
          <span class="text-gray-500 mx-1.5">—</span>
          <span class="text-gray-400 text-sm">${desc}</span>
        `}
      </div>
      ${node.children && node.children.map((child, i) => {
    const isLast = i === node.children.length - 1;
    const connector = isLast ? "\u2514\u2500\u2500 " : "\u251C\u2500\u2500 ";
    const childPrefix = prefix + (isLast ? "    " : "\u2502   ");
    return html10`<${TreeNode} node=${{ ...child, _connector: connector }} prefix=${childPrefix} />`;
  })}
    </div>
  `;
}
var FileTree = ({ data }) => {
  const title = data.title || "";
  const root = data.root || "";
  const items = data.items || [];
  return html10`
    <${DarkContainer}>
      ${title && html10`<${HeaderBar} title=${title} />`}
      <div class="px-4 py-3 font-mono text-sm overflow-x-auto">
        ${root && html10`<div class="text-gray-300 font-semibold text-sm mb-1">${root}</div>`}
        ${items.map((item, i) => {
    const isLast = i === items.length - 1;
    const connector = isLast ? "\u2514\u2500\u2500 " : "\u251C\u2500\u2500 ";
    const childPrefix = isLast ? "    " : "\u2502   ";
    return html10`
            <div class="flex items-baseline leading-relaxed">
              <span class="text-gray-600 select-none whitespace-pre" style="font-family: var(--font-mono)">${connector}</span>
              <span class="font-mono text-cyan-300 text-sm">${item.name || ""}</span>
              ${item.description && html10`
                <span class="text-gray-500 mx-1.5">—</span>
                <span class="text-gray-400 text-sm">${item.description}</span>
              `}
            </div>
            ${item.children && item.children.map((child, j) => {
      const isChildLast = j === item.children.length - 1;
      const cc = isChildLast ? "\u2514\u2500\u2500 " : "\u251C\u2500\u2500 ";
      const cp = childPrefix + (isChildLast ? "    " : "\u2502   ");
      return html10`<${TreeNode} node=${child} prefix=${childPrefix + cc} />`;
    })}
          `;
  })}
      </div>
    <//>
  `;
};

// src/components/node-list.js
import { html as html11 } from "htm/preact";

// src/state/demo-store.js
import { signal, computed } from "@preact/signals";
var nodes = [
  {
    id: "n1",
    title: "Engineering DNA",
    type: "general",
    importance: 0.9,
    summary: "Separate engine from transport = keeping the DAG clean."
  },
  {
    id: "n2",
    title: "DAG + credit assignment",
    type: "general",
    importance: 0.85,
    summary: "Forward DAG + reverse traversal. Backprop, build systems, workflows."
  },
  {
    id: "n3",
    title: "Fractal DAG",
    type: "general",
    importance: 0.85,
    summary: "Same DAG pattern at every zoom level, from one line to full SaaS."
  },
  {
    id: "n4",
    title: "Structure-first",
    type: "general",
    importance: 0.9,
    summary: "Graphs as the product, apps as views over the same structure."
  },
  {
    id: "n5",
    title: "DocsifyTemplate drift detection",
    type: "task",
    importance: 0.9,
    summary: "Backprop pattern for detecting stale docs via reverse traversal."
  }
];
var selectedId = signal(null);
var selectedNode = computed(
  () => nodes.find((n) => n.id === selectedId.value) ?? null
);

// src/components/node-list.js
var NodeList = () => html11`
  <div class="bg-surface-raised rounded-xl p-4 border border-border">
    <div class="flex items-center gap-2 mb-3">
      <span class="inline-flex w-2 h-2 rounded-full bg-primary"></span>
      <h4 class="text-sm font-bold text-text-secondary m-0" style="border: none;">
        Fence 1 — Node list
      </h4>
    </div>
    <ul class="flex flex-col gap-1 m-0 p-0" style="list-style: none;">
      ${nodes.map((node) => {
  const isActive = selectedId.value === node.id;
  return html11`
          <li key=${node.id} style="margin: 0;">
            <button
              type="button"
              onClick=${() => selectedId.value = node.id}
              class=${`w-full text-left px-3 py-2 rounded-md transition-colors border ${isActive ? "bg-primary-light text-primary-text font-semibold border-primary/30" : "bg-surface hover:bg-surface-sunken text-text-primary border-transparent"}`}
              style="cursor: pointer;"
            >
              <span class="text-xs text-text-tertiary font-mono mr-2">${node.id}</span>
              ${node.title}
            </button>
          </li>
        `;
})}
    </ul>
  </div>
`;

// src/components/node-panel.js
import { html as html12 } from "htm/preact";
var NodePanel = () => {
  const node = selectedNode.value;
  if (!node) {
    return html12`
      <div class="bg-surface-raised rounded-xl p-6 border border-dashed border-border-strong text-center">
        <div class="flex items-center justify-center gap-2 mb-2">
          <span class="inline-flex w-2 h-2 rounded-full bg-text-muted"></span>
          <h4 class="text-sm font-bold text-text-secondary m-0" style="border: none;">
            Fence 2 — Node panel
          </h4>
        </div>
        <p class="text-sm text-text-tertiary m-0">
          Select a node in fence 1 to populate this panel.
        </p>
      </div>
    `;
  }
  return html12`
    <div class="bg-surface-raised rounded-xl p-4 border border-primary/40">
      <div class="flex items-center gap-2 mb-3">
        <span class="inline-flex w-2 h-2 rounded-full bg-primary"></span>
        <h4 class="text-sm font-bold text-text-secondary m-0" style="border: none;">
          Fence 2 — Node panel
        </h4>
      </div>
      <h3 class="text-lg font-bold text-text-primary mb-2" style="border: none; margin-top: 0;">
        ${node.title}
      </h3>
      <p class="text-sm text-text-secondary mb-3" style="margin-top: 0;">
        ${node.summary}
      </p>
      <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm m-0">
        <dt class="text-text-tertiary">ID</dt>
        <dd class="font-mono text-text-primary m-0">${node.id}</dd>
        <dt class="text-text-tertiary">Type</dt>
        <dd class="text-text-primary m-0">${node.type}</dd>
        <dt class="text-text-tertiary">Importance</dt>
        <dd class="text-text-primary m-0">${node.importance}</dd>
      </dl>
    </div>
  `;
};

// src/components/utils.js
function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function generateId(prefix, name) {
  var slug = name ? name.toLowerCase().replace(/[^a-z0-9]+/g, "-") : "";
  var rand = Math.random().toString(36).substr(2, 6);
  return prefix + "-" + (slug ? slug + "-" : "") + rand;
}

// src/components/code-block.js
window.copyToClipboard = function(button) {
  var code = button.getAttribute("data-code").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;/g, "'");
  navigator.clipboard.writeText(code).then(function() {
    var originalText = button.textContent;
    button.textContent = "Copied!";
    setTimeout(function() {
      button.textContent = originalText;
    }, 2e3);
  }).catch(function(err) {
    console.error("Failed to copy:", err);
  });
};

// src/components/region-toggle.js
function processRegionDirectives() {
  var directives = document.querySelectorAll(".markdown-section [data-region]");
  directives.forEach(function(div) {
    var raw = div.getAttribute("data-region");
    if (!raw) return;
    var regions = raw.split(",").map(function(part) {
      var eqIndex = part.indexOf("=");
      if (eqIndex === -1) return null;
      return {
        key: part.substring(0, eqIndex).trim().toLowerCase(),
        label: part.substring(eqIndex + 1).trim()
      };
    }).filter(Boolean);
    if (regions.length === 0) return;
    var headingLevel = null;
    var sibling = div.nextElementSibling;
    while (sibling) {
      var tagMatch = sibling.tagName && sibling.tagName.match(/^H(\d)$/);
      if (tagMatch) {
        headingLevel = parseInt(tagMatch[1]);
        break;
      }
      sibling = sibling.nextElementSibling;
    }
    if (!headingLevel) return;
    var groups = [];
    var currentGroup = null;
    var collected = [];
    sibling = div.nextElementSibling;
    while (sibling) {
      var tagMatch = sibling.tagName && sibling.tagName.match(/^H(\d)$/);
      if (tagMatch) {
        var level = parseInt(tagMatch[1]);
        if (level === headingLevel) {
          if (currentGroup) groups.push(currentGroup);
          currentGroup = { heading: sibling.textContent.trim(), elements: [sibling] };
          collected.push(sibling);
          sibling = sibling.nextElementSibling;
          continue;
        }
        if (level < headingLevel) break;
      }
      if (currentGroup) {
        currentGroup.elements.push(sibling);
        collected.push(sibling);
      }
      sibling = sibling.nextElementSibling;
    }
    if (currentGroup) groups.push(currentGroup);
    if (groups.length === 0) return;
    var regionGroups = regions.map(function(region) {
      var match = null;
      groups.forEach(function(g) {
        if (g.heading.toLowerCase().indexOf(region.label.toLowerCase()) !== -1 || region.label.toLowerCase().indexOf(g.heading.toLowerCase()) !== -1) {
          match = g;
        }
      });
      return { region, group: match };
    });
    var toggleId = generateId("rt");
    var toggleContainer = document.createElement("div");
    toggleContainer.className = "region-toggle rounded-lg border border-border bg-surface my-4 overflow-hidden";
    var buttonBar = document.createElement("div");
    buttonBar.className = "flex border-b border-border bg-surface-raised";
    regions.forEach(function(region, i) {
      var btn = document.createElement("button");
      btn.textContent = region.label;
      btn.className = i === 0 ? "rt-btn flex-1 px-4 py-2.5 text-sm font-medium bg-primary text-white transition-colors" : "rt-btn flex-1 px-4 py-2.5 text-sm font-medium text-text-muted hover:text-text-secondary transition-colors";
      btn.setAttribute("data-rt-group", toggleId);
      btn.setAttribute("data-rt-index", i);
      btn.onclick = function() {
        buttonBar.querySelectorAll(".rt-btn").forEach(function(b) {
          b.className = "rt-btn flex-1 px-4 py-2.5 text-sm font-medium text-text-muted hover:text-text-secondary transition-colors";
        });
        btn.className = "rt-btn flex-1 px-4 py-2.5 text-sm font-medium bg-primary text-white transition-colors";
        toggleContainer.querySelectorAll(".rt-panel").forEach(function(p, pi) {
          p.style.display = pi === i ? "block" : "none";
        });
      };
      buttonBar.appendChild(btn);
    });
    toggleContainer.appendChild(buttonBar);
    regionGroups.forEach(function(rg, i) {
      var panel = document.createElement("div");
      panel.className = "rt-panel p-4";
      panel.style.display = i === 0 ? "block" : "none";
      if (rg.group) {
        rg.group.elements.forEach(function(el, elIdx) {
          if (elIdx === 0) return;
          panel.appendChild(el.cloneNode(true));
        });
      } else {
        panel.innerHTML = '<p class="text-text-muted">No content for ' + escapeHtml(rg.region.label) + "</p>";
      }
      toggleContainer.appendChild(panel);
    });
    collected.forEach(function(el) {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    div.parentNode.replaceChild(toggleContainer, div);
  });
}
if (typeof window !== "undefined") window.processRegionDirectives = processRegionDirectives;

// src/components/index.js
var defaultComponents = {
  "entity-schema": EntitySchema,
  "card-grid": CardGrid,
  "api-endpoint": ApiEndpoint,
  "status-flow": StatusFlow,
  "config-example": ConfigExample,
  "directive-table": DirectiveTable,
  "step-type": StepType,
  "side-by-side": SideBySide,
  "file-tree": FileTree,
  "dark-container": DarkContainer,
  "header-bar": HeaderBar,
  "type-badge": TypeBadge,
  "required-badge": RequiredBadge,
  "chevron": Chevron,
  "section-label": SectionLabel,
  "node-list": NodeList,
  "node-panel": NodePanel
};

// src/core/custom-elements.js
import register2 from "preact-custom-element";
import { h } from "preact";
function withJsonProps(Component) {
  return function WrappedComponent({ "data-props": raw, ...rest }) {
    const data = raw ? JSON.parse(raw) : {};
    return h(Component, { data, ...rest });
  };
}
function defineCustomElements(components) {
  for (const [tag, Component] of Object.entries(components)) {
    if (!tag.includes("-")) continue;
    if (customElements.get(tag)) continue;
    register2(withJsonProps(Component), tag, ["data-props"], { shadow: false });
  }
}
function renderCustomElement(tag, data) {
  const json = JSON.stringify(data || {}).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return `<${tag} data-props="${json}"></${tag}>`;
}

// src/core/config.js
var DEFAULTS = {
  // ── Site ─────────────────────────────────────
  title: "DocsifyTemplate",
  description: "",
  tagline: "",
  // ── Theme ────────────────────────────────────
  theme: {
    // Brand colors — change these to re-skin the entire site
    primary: "#0891b2",
    primaryLight: "#ecfeff",
    primaryText: "#0e7490",
    brand: "#95c22f",
    // Surfaces
    surface: "#faf9f7",
    surfaceRaised: "#f5f5f4",
    surfaceSunken: "#efedeb",
    // Borders
    border: "#e7e5e4",
    borderStrong: "#d6d3d1",
    // Text
    textPrimary: "#1c1917",
    textSecondary: "#44403c",
    textTertiary: "#78716c",
    textMuted: "#a8a29e",
    // Technical zone
    techSurface: "#f8fafc",
    techAccent: "#6366f1",
    techHeading: "#1e293b",
    techSubheading: "#334155",
    techText: "#475569",
    // Code
    codeBg: "#1e1e2e",
    codeText: "#cdd6f4",
    // Semantic
    success: "#34d399"
  },
  // ── Docsify ──────────────────────────────────
  docsify: {
    loadSidebar: true,
    subMaxLevel: 3,
    auto2top: true,
    search: {
      placeholder: "Search...",
      noData: "No results.",
      depth: 6
    }
  },
  // ── Features (enable/disable) ────────────────
  features: {
    // AI Chat — Gemma 4 E2B in-browser via WebGPU
    chat: {
      enabled: true,
      model: {
        id: "onnx-community/gemma-4-E2B-it-ONNX",
        label: "Gemma 4 E2B",
        architecture: "gemma4",
        dtype: "q4f16",
        nativeToolCalling: true,
        maxNewTokens: 1024
      },
      // Tool calling
      tools: {
        export: true,
        navigate: true,
        switchTab: true,
        search: true,
        generateComponent: true,
        scrollToSection: true
      }
    },
    // PDF / LaTeX / Markdown export via Pandoc WASM
    export: {
      enabled: true,
      formats: ["pdf", "latex-branded", "markdown"],
      defaultFormat: "pdf",
      exportAll: true
      // Show "Export All" button
    },
    // Tabbed layout (Quick Start / Technical Reference)
    tabs: {
      enabled: true,
      labels: {
        "quick-start": "Quick Start",
        "technical": "Technical Reference"
      },
      // Frontmatter type that triggers tabbed layout
      triggerType: "guide"
    },
    // Copy button on code blocks
    copyButton: {
      enabled: true
    },
    // Tutorial header (step indicator)
    tutorialHeader: {
      enabled: true
    },
    // Mermaid diagrams
    mermaid: {
      enabled: true,
      theme: "default",
      startOnLoad: false
    },
    // Dev tools (Eruda console)
    devTools: {
      enabled: false
      // Off by default in production
    }
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
    items: null
  },
  // ── Syntax Highlighting ──────────────────────
  prism: {
    languages: ["javascript", "json", "yaml", "bash", "csharp", "markdown"]
  },
  // ── Head ─────────────────────────────────────
  // Extra tags for <head>
  head: []
};
function validateConfig(config) {
  const errors = [];
  if (config.title && typeof config.title !== "string") {
    errors.push("config.title must be a string");
  }
  if (config.theme) {
    for (const [key, value] of Object.entries(config.theme)) {
      if (typeof value === "string" && !value.match(/^#[0-9a-fA-F]{3,8}$/)) {
        errors.push(`config.theme.${key}: "${value}" is not a valid hex color`);
      }
    }
  }
  if (config.features?.chat?.enabled && config.features?.chat?.model) {
    if (!config.features.chat.model.id) {
      errors.push("config.features.chat.model.id is required when chat is enabled");
    }
  }
  const validFormats = ["pdf", "latex-branded", "markdown"];
  if (config.features?.export?.formats) {
    for (const fmt of config.features.export.formats) {
      if (!validFormats.includes(fmt)) {
        errors.push(`config.features.export.formats: "${fmt}" is not valid. Use: ${validFormats.join(", ")}`);
      }
    }
  }
  if (errors.length > 0) {
    console.error("[DocsifyTemplate] Configuration errors:");
    errors.forEach((e) => console.error("  -", e));
  }
  return errors;
}
function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] === void 0) continue;
    if (source[key] !== null && typeof source[key] === "object" && !Array.isArray(source[key]) && typeof target[key] === "object" && target[key] !== null && !Array.isArray(target[key])) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}
var _config = null;
function initConfig(userConfig = {}) {
  const merged = deepMerge(DEFAULTS, userConfig);
  validateConfig(merged);
  _config = Object.freeze(merged);
  return _config;
}
function getConfig() {
  if (!_config) throw new Error("[config] Call initConfig() before getConfig()");
  return _config;
}
function isFeatureEnabled(featurePath) {
  const config = getConfig();
  const parts = featurePath.split(".");
  let current = config.features;
  for (const part of parts) {
    if (current == null) return false;
    current = current[part];
  }
  if (typeof current === "object" && current !== null) {
    return current.enabled !== false;
  }
  return !!current;
}
function getThemeCSS() {
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

// src/serializers/latex.js
function escapeLatex(s) {
  if (typeof s !== "string") return String(s || "");
  s = s.replace(/\\/g, "\\textbackslash{}");
  s = s.replace(/([#$%&_{}<>~^])/g, "\\$1");
  s = s.replace(/\\textbackslash\\\{\\\}/g, "\\textbackslash{}");
  return s;
}
function escapeVerbatim(s) {
  if (typeof s !== "string") return String(s || "");
  return s.replace(/\$/g, "\\$");
}
var latexRenderers = {
  "card-grid"(data) {
    const cards = Array.isArray(data) ? data : [];
    const out = ["\\cardgridbegin"];
    for (const card of cards) {
      out.push(`\\card{${escapeLatex(card.icon || "")}}{${escapeLatex(card.title || "Untitled")}}{${escapeLatex(card.description || "")}}`);
    }
    out.push("\\cardgridend");
    return out.join("\n");
  },
  "entity-schema"(data) {
    const out = [`\\entitybegin{${escapeLatex(data.name || "Entity")}}{${escapeLatex(data.parent || "")}}`];
    for (const f of data.fields || []) {
      const vals = Array.isArray(f.values) ? f.values.join(", ") : "";
      out.push(`\\entityfield{${escapeLatex(f.name || "")}}{${escapeLatex(f.type || "any")}}{${f.required ? "true" : "false"}}{${escapeLatex(f.description || "")}}{${escapeLatex(vals)}}`);
    }
    out.push("\\entityend");
    return out.join("\n");
  },
  "api-endpoint"(data) {
    const out = [`\\apibegin{${(data.method || "GET").toUpperCase()}}{${escapeLatex(data.path || "/")}}`];
    if (data.description) out.push(`\\apidesc{${escapeLatex(data.description)}}`);
    for (const p of data.params || []) {
      out.push(`\\apiparam{${escapeLatex(p.name || "")}}{${escapeLatex(p.type || "any")}}{${p.required ? "true" : "false"}}`);
    }
    if (data.response) out.push(`\\apiresponse{${escapeVerbatim(data.response.trim())}}`);
    out.push("\\apiend");
    return out.join("\n");
  },
  "status-flow"(data) {
    const states = data.states || [];
    const out = ["\\flowbegin"];
    states.forEach((s, idx) => {
      const nextStr = Array.isArray(s.next) ? s.next.join(", ") : "";
      const effectsStr = Array.isArray(s.effects) ? s.effects.join(", ") : "";
      out.push(`\\flowstate{${escapeLatex(s.label || s.id || "State")}}{${escapeLatex(s.trigger || "")}}{${escapeLatex(nextStr)}}{${escapeLatex(effectsStr)}}{${idx === states.length - 1 ? "true" : "false"}}`);
    });
    out.push("\\flowend");
    return out.join("\n");
  },
  "directive-table"(data) {
    const out = [`\\directivebegin{${escapeLatex(data.title || "Directives")}}`];
    for (const cat of data.categories || []) {
      out.push(`\\directivecategory{${escapeLatex(cat.name || "")}}`);
      for (const d of cat.directives || []) {
        out.push(`\\directive{${escapeLatex(d.name || "")}}{${escapeLatex(d.type || "")}}{${escapeLatex(String(d.default || ""))}}{${escapeLatex(d.description || "")}}`);
      }
    }
    out.push("\\directiveend");
    return out.join("\n");
  },
  "step-type"(data) {
    const out = [`\\stepbegin{${escapeLatex(data.name || "Step")}}{${(data.category || "sync").toLowerCase()}}`];
    if (data.description) out.push(`\\stepdesc{${escapeLatex(data.description)}}`);
    for (const p of data.properties || []) {
      out.push(`\\stepprop{${escapeLatex(p.name || "")}}{${escapeLatex(p.type || "")}}{${p.required ? "true" : "false"}}{${escapeLatex(p.description || "")}}`);
    }
    if (data.example) out.push(`\\stepexample{${escapeVerbatim(data.example.trim())}}`);
    out.push("\\stepend");
    return out.join("\n");
  },
  "config-example"(data) {
    const out = [`\\configbegin{${escapeLatex(data.title || "")}}{${escapeLatex(data.language || "json")}}`];
    if (data.code) out.push(`\\configcode{${escapeVerbatim(data.code.trim())}}`);
    for (const a of data.annotations || []) {
      out.push(`\\configannotation{${a.line || 0}}{${escapeLatex(a.text || "")}}`);
    }
    out.push("\\configend");
    return out.join("\n");
  },
  "side-by-side"(data) {
    const left = data.left || {};
    const right = data.right || {};
    return [
      "\\sidebegin",
      `\\sidepanel{${escapeLatex(left.title || "")}}{${left.language ? escapeVerbatim(left.content || "") : escapeLatex(left.content || "")}}{${escapeLatex(left.language || "")}}`,
      `\\sidepanel{${escapeLatex(right.title || "")}}{${right.language ? escapeVerbatim(right.content || "") : escapeLatex(right.content || "")}}{${escapeLatex(right.language || "")}}`,
      "\\sideend"
    ].join("\n");
  }
};

// src/serializers/typst.js
function q(s) {
  if (typeof s !== "string") s = String(s || "");
  return '"' + s.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}
var typstRenderers = {
  "card-grid"(data) {
    const cards = Array.isArray(data) ? data : [];
    const out = ["#cardgridbegin()"];
    for (const card of cards) {
      out.push(`#card(${q(card.icon || "")}, ${q(card.title || "Untitled")}, ${q(card.description || "")})`);
    }
    out.push("#cardgridend()");
    return out.join("\n");
  },
  "entity-schema"(data) {
    const out = [`#entitybegin(${q(data.name || "Entity")}, ${q(data.parent || "")})`];
    for (const f of data.fields || []) {
      const vals = Array.isArray(f.values) ? f.values.join(", ") : "";
      out.push(`#entityfield(${q(f.name || "")}, ${q(f.type || "any")}, ${f.required ? "true" : "false"}, ${q(f.description || "")}, ${q(vals)})`);
    }
    out.push("#entityend()");
    return out.join("\n");
  },
  "api-endpoint"(data) {
    const out = [`#apibegin(${q((data.method || "GET").toUpperCase())}, ${q(data.path || "/")})`];
    if (data.description) out.push(`#apidesc(${q(data.description)})`);
    for (const p of data.params || []) {
      out.push(`#apiparam(${q(p.name || "")}, ${q(p.type || "any")}, ${p.required ? "true" : "false"})`);
    }
    if (data.response) out.push(`#apiresponse(${q(data.response.trim())})`);
    out.push("#apiend()");
    return out.join("\n");
  },
  "status-flow"(data) {
    const states = data.states || [];
    const out = ["#flowbegin()"];
    states.forEach((s, idx) => {
      const nextStr = Array.isArray(s.next) ? s.next.join(", ") : "";
      const effectsStr = Array.isArray(s.effects) ? s.effects.join(", ") : "";
      out.push(`#flowstate(${q(s.label || s.id || "State")}, ${q(s.trigger || "")}, ${q(nextStr)}, ${q(effectsStr)}, ${idx === states.length - 1 ? "true" : "false"})`);
    });
    out.push("#flowend()");
    return out.join("\n");
  },
  "directive-table"(data) {
    const out = [`#directivebegin(${q(data.title || "Directives")})`];
    for (const cat of data.categories || []) {
      out.push(`#directivecategory(${q(cat.name || "")})`);
      for (const d of cat.directives || []) {
        out.push(`#directive(${q(d.name || "")}, ${q(d.type || "")}, ${q(String(d.default || ""))}, ${q(d.description || "")})`);
      }
    }
    out.push("#directiveend()");
    return out.join("\n");
  },
  "step-type"(data) {
    const out = [`#stepbegin(${q(data.name || "Step")}, ${q((data.category || "sync").toLowerCase())})`];
    if (data.description) out.push(`#stepdesc(${q(data.description)})`);
    for (const p of data.properties || []) {
      out.push(`#stepprop(${q(p.name || "")}, ${q(p.type || "")}, ${p.required ? "true" : "false"}, ${q(p.description || "")})`);
    }
    if (data.example) out.push(`#stepexample(${q(data.example.trim())})`);
    out.push("#stepend()");
    return out.join("\n");
  },
  "config-example"(data) {
    const out = [`#configbegin(${q(data.title || "")}, ${q(data.language || "json")})`];
    if (data.code) out.push(`#configcode(${q(data.code.trim())})`);
    for (const a of data.annotations || []) {
      out.push(`#configannotation(${a.line || 0}, ${q(a.text || "")})`);
    }
    out.push("#configend()");
    return out.join("\n");
  },
  "side-by-side"(data) {
    const left = data.left || {};
    const right = data.right || {};
    return [
      "#sidebegin()",
      `#sidepanel(${q(left.title || "")}, ${q(left.content || "")}, ${q(left.language || "")})`,
      `#sidepanel(${q(right.title || "")}, ${q(right.content || "")}, ${q(right.language || "")})`,
      "#sideend()"
    ].join("\n");
  }
};

// src/serializers/markdown.js
var markdownRenderers = {
  "card-grid"(data) {
    const cards = Array.isArray(data) ? data : [];
    return cards.map((c) => `- **${c.title || "Untitled"}**${c.description ? ": " + c.description : ""}`).join("\n");
  },
  "entity-schema"(data) {
    const out = [
      `### Entity: ${data.name || "Entity"}${data.parent ? " (extends " + data.parent + ")" : ""}`,
      "",
      "| Field | Type | Required | Description |",
      "|-------|------|----------|-------------|"
    ];
    for (const f of data.fields || []) {
      const desc = (f.description || "") + (Array.isArray(f.values) ? " Values: " + f.values.join(", ") : "");
      out.push(`| \`${f.name || ""}\` | \`${f.type || "any"}\` | ${f.required ? "Yes" : "No"} | ${desc} |`);
    }
    return out.join("\n");
  },
  "api-endpoint"(data) {
    const out = [`### ${(data.method || "GET").toUpperCase()} \`${data.path || "/"}\``];
    if (data.description) {
      out.push("", data.description);
    }
    if (data.params && data.params.length) {
      out.push("", "**Parameters:**");
      for (const p of data.params) {
        out.push(`- \`${p.name || ""}\` (${p.type || "any"})${p.required ? " (required)" : ""}`);
      }
    }
    if (data.response) {
      out.push("", "**Response:**", "```json", data.response.trim(), "```");
    }
    return out.join("\n");
  },
  "status-flow"(data) {
    const states = data.states || [];
    const labels = states.map((s) => s.label || s.id || "?");
    const out = ["### State Machine", "", "**Flow:** " + labels.join(" \u2192 "), ""];
    for (const s of states) {
      out.push(`**${s.label || s.id || "State"}**`);
      if (s.trigger) out.push("- Trigger: " + s.trigger);
      if (Array.isArray(s.next) && s.next.length) out.push("- Next: " + s.next.join(", "));
      if (Array.isArray(s.effects) && s.effects.length) out.push("- Effects: " + s.effects.join(", "));
      out.push("");
    }
    return out.join("\n");
  },
  "directive-table"(data) {
    const out = [
      `### ${data.title || "Directives"}`,
      "",
      "| Directive | Type | Default | Description |",
      "|-----------|------|---------|-------------|"
    ];
    for (const cat of data.categories || []) {
      for (const d of cat.directives || []) {
        out.push(`| \`${d.name || ""}\` | ${d.type || ""} | ${String(d.default || "---")} | ${d.description || ""} |`);
      }
    }
    return out.join("\n");
  },
  "step-type"(data) {
    const out = [`### Step: ${data.name || "Step"} (${(data.category || "sync").toLowerCase()})`];
    if (data.description) {
      out.push("", data.description);
    }
    if (data.properties && data.properties.length) {
      out.push("", "**Properties:**");
      for (const p of data.properties) {
        out.push(`- \`${p.name || ""}\` (${p.type || "any"})${p.required ? " (required)" : ""}${p.description ? ": " + p.description : ""}`);
      }
    }
    if (data.example) {
      out.push("", "**Example:**", "```json", data.example.trim(), "```");
    }
    return out.join("\n");
  },
  "config-example"(data) {
    const out = [];
    if (data.title) {
      out.push(`**${data.title}**`, "");
    }
    out.push("```" + (data.language || "json"), (data.code || "").trim(), "```");
    if (data.annotations && data.annotations.length) {
      out.push("", "**Annotations:**");
      for (const a of data.annotations) {
        out.push(`- Line ${a.line || 0}: ${a.text || ""}`);
      }
    }
    return out.join("\n");
  },
  "side-by-side"(data) {
    function panel(p, label) {
      const parts = [`**${p.title || label}:**`];
      if (p.content) {
        if (p.language) {
          parts.push("```" + p.language, p.content, "```");
        } else {
          parts.push(p.content);
        }
      }
      return parts.join("\n");
    }
    return panel(data.left || {}, "Left") + "\n\n" + panel(data.right || {}, "Right");
  }
};
export {
  defaultComponents,
  defineCustomElements,
  getComponent,
  getConfig,
  getThemeCSS,
  initConfig,
  isFeatureEnabled,
  latexRenderers as latexTransforms,
  markdownRenderers as markdownTransforms,
  register,
  registerAll,
  renderCustomElement,
  typstRenderers as typstTransforms,
  yamlComponents
};
