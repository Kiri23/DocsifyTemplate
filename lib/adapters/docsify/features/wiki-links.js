// Wiki-link renderer — turns `[[basename]]` or `[[basename|alias]]` in rendered
// markdown into real anchor tags resolved via the backlinks basename map.
// Runs at doneEach (post-markdown). See lib/scan/backlinks.js for the index.

import { basenameMap } from '../../../state/backlinks-store.js';

const WIKI_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

function resolve(name) {
  return basenameMap.value[name.trim().toLowerCase()] || null;
}

function insideCode(node) {
  for (let n = node.parentNode; n && n !== document.body; n = n.parentNode) {
    if (n.nodeType === 1 && (n.tagName === 'CODE' || n.tagName === 'PRE')) return true;
  }
  return false;
}

export function renderWikiLinks(section) {
  const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT, null);
  const hits = [];
  let node;
  while ((node = walker.nextNode())) {
    if (node.nodeValue.includes('[[') && !insideCode(node)) hits.push(node);
  }
  for (const textNode of hits) {
    const frag = document.createDocumentFragment();
    let last = 0;
    const str = textNode.nodeValue;
    for (const m of str.matchAll(WIKI_REGEX)) {
      if (m.index > last) frag.appendChild(document.createTextNode(str.slice(last, m.index)));
      const target = resolve(m[1]);
      const label = (m[2] || m[1]).trim();
      if (target) {
        const a = document.createElement('a');
        a.href = `#${target}`;
        a.textContent = label;
        a.className = 'wiki-link';
        frag.appendChild(a);
      } else {
        frag.appendChild(document.createTextNode(m[0]));
      }
      last = m.index + m[0].length;
    }
    if (last < str.length) frag.appendChild(document.createTextNode(str.slice(last)));
    textNode.parentNode.replaceChild(frag, textNode);
  }
}
