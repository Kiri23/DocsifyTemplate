// Config Example — Preact + HTM
// No more window._ceToggle — state lives in the component.
import { html } from 'htm/preact';
import { useState } from 'preact/hooks';
import { DarkContainer, HeaderBar } from './shared.js';

const ConfigExample = ({ data }) => {
  const [activeAnnotation, setActiveAnnotation] = useState(null);
  const title = data.title || '';
  const code = data.code || '';
  const annotations = data.annotations || [];
  const lines = code.split('\n');

  const annotationMap = {};
  annotations.forEach((ann, idx) => { annotationMap[ann.line] = { index: idx + 1, text: ann.text }; });

  return html`
    <${DarkContainer}>
      ${title && html`
        <${HeaderBar} title=${title}>
          <span class="text-gray-500 text-xs">${annotations.length} annotation${annotations.length !== 1 ? 's' : ''}</span>
        <//>
      `}
      <div class="py-3 font-mono text-sm leading-relaxed overflow-x-auto">
        ${lines.map((line, i) => {
          const lineNum = i + 1;
          const ann = annotationMap[lineNum];
          return html`
            <div class="ce-line relative pr-8 ${ann ? 'bg-cyan-500/5' : ''}">
              <span class="text-gray-600 select-none inline-block w-8 text-right mr-3 text-xs">${lineNum}</span>
              <span>${line}</span>
              ${ann && html`
                <span class="ce-marker absolute -right-1 top-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500 text-white text-xs font-bold cursor-pointer hover:bg-cyan-400 transition-colors"
                      onClick=${(e) => { e.stopPropagation(); setActiveAnnotation(activeAnnotation === ann.index ? null : ann.index); }}
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
        return html`
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

export { ConfigExample };
