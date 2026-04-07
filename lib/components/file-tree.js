// File Tree — Preact + HTM
import { html } from 'htm/preact';
import { DarkContainer, HeaderBar } from './shared.js';

function TreeNode({ node, prefix }) {
  const name = node.name || '';
  const desc = node.description || '';

  return html`
    <div>
      <div class="flex items-baseline leading-relaxed">
        <span class="text-gray-600 select-none whitespace-pre" style="font-family: var(--font-mono)">${prefix}</span>
        <span class="font-mono text-cyan-300 text-sm">${name}</span>
        ${desc && html`
          <span class="text-gray-500 mx-1.5">—</span>
          <span class="text-gray-400 text-sm">${desc}</span>
        `}
      </div>
      ${node.children && node.children.map((child, i) => {
        const isLast = i === node.children.length - 1;
        const connector = isLast ? '└── ' : '├── ';
        const childPrefix = prefix + (isLast ? '    ' : '│   ');
        return html`<${TreeNode} node=${{ ...child, _connector: connector }} prefix=${childPrefix} />`;
      })}
    </div>
  `;
}

const FileTree = ({ data }) => {
  const title = data.title || '';
  const root = data.root || '';
  const items = data.items || [];

  return html`
    <${DarkContainer}>
      ${title && html`<${HeaderBar} title=${title} />`}
      <div class="px-4 py-3 font-mono text-sm overflow-x-auto">
        ${root && html`<div class="text-gray-300 font-semibold text-sm mb-1">${root}</div>`}
        ${items.map((item, i) => {
          const isLast = i === items.length - 1;
          const connector = isLast ? '└── ' : '├── ';
          const childPrefix = isLast ? '    ' : '│   ';
          return html`
            <div class="flex items-baseline leading-relaxed">
              <span class="text-gray-600 select-none whitespace-pre" style="font-family: var(--font-mono)">${connector}</span>
              <span class="font-mono text-cyan-300 text-sm">${item.name || ''}</span>
              ${item.description && html`
                <span class="text-gray-500 mx-1.5">—</span>
                <span class="text-gray-400 text-sm">${item.description}</span>
              `}
            </div>
            ${item.children && item.children.map((child, j) => {
              const isChildLast = j === item.children.length - 1;
              const cc = isChildLast ? '└── ' : '├── ';
              const cp = childPrefix + (isChildLast ? '    ' : '│   ');
              return html`<${TreeNode} node=${child} prefix=${childPrefix + cc} />`;
            })}
          `;
        })}
      </div>
    <//>
  `;
};

export { FileTree };
