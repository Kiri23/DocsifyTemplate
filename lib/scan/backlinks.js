// Backlinks scanner — runtime, zero-build.
// Fetches all docs listed in _sidebar.md, extracts markdown links between them,
// and returns a reverse index { targetPath → [sourcePath, ...] }.
//
// Why runtime (not build): this project has no build step. Fetching a few dozen
// small .md files once on page load is cheaper than shipping a bundler.
// See issue #12.

const SIDEBAR_URL = '/docs/_sidebar.md';

// `[text](/content/foo)` or `[text](/content/foo.md)` — docsify accepts both.
// Skip external (http), anchors (#), and mailto.
const LINK_REGEX = /\[([^\]]+)\]\(([^)\s]+)\)/g;

function normalize(path) {
  // Strip trailing .md and fragments; leading slash kept.
  return path.replace(/\.md($|#|\?)/, '$1').split('#')[0].split('?')[0];
}

function isInternal(url) {
  if (!url) return false;
  if (/^[a-z]+:/i.test(url)) return false;
  if (url.startsWith('#')) return false;
  if (url.startsWith('mailto:')) return false;
  return true;
}

export function extractSidebarPaths(sidebarMd) {
  const paths = new Set();
  for (const m of sidebarMd.matchAll(LINK_REGEX)) {
    const url = m[2];
    if (!isInternal(url)) continue;
    paths.add(normalize(url));
  }
  return [...paths];
}

export function extractLinks(md) {
  const out = [];
  for (const m of md.matchAll(LINK_REGEX)) {
    const url = m[2];
    if (!isInternal(url)) continue;
    out.push(normalize(url));
  }
  return out;
}

async function fetchMd(path) {
  // Try /docs${path}.md first (common case), fall back to /docs${path}/README.md.
  const candidates = [`/docs${path}.md`, `/docs${path}/README.md`, `/docs${path}`];
  for (const url of candidates) {
    try {
      const r = await fetch(url);
      if (r.ok) return await r.text();
    } catch (_) { /* try next */ }
  }
  return null;
}

export async function buildBacklinksIndex() {
  const sidebarRes = await fetch(SIDEBAR_URL);
  if (!sidebarRes.ok) return {};
  const sidebarMd = await sidebarRes.text();
  const paths = extractSidebarPaths(sidebarMd);

  const forward = {};
  await Promise.all(paths.map(async (p) => {
    const md = await fetchMd(p);
    if (md === null) return;
    forward[p] = extractLinks(md).filter((t) => paths.includes(t) && t !== p);
  }));

  const reverse = {};
  for (const [source, targets] of Object.entries(forward)) {
    for (const target of targets) {
      (reverse[target] ||= []).push(source);
    }
  }
  for (const k of Object.keys(reverse)) {
    reverse[k] = [...new Set(reverse[k])].sort();
  }
  return reverse;
}
