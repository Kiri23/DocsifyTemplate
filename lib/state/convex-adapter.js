// Convex → signal adapter.
// Opt-in: only activates when window.__convexConfig is set before this module
// loads. When active, replaces the local `buildBacklinksIndex()` scan with a
// live query subscription — the signal store keeps the same shape, so panels,
// wiki-link rendering, and auto-inject all work unchanged.
//
// Enable by adding to docs/index.html BEFORE the renderer loads:
//
//   <script>
//     window.__convexConfig = {
//       url: 'https://content-peccary-627.convex.cloud',
//       projectKey: 'docsify-demo',
//     };
//   </script>
//
// If __convexConfig is absent, this module is a no-op and the local scan runs.

import { backlinksIndex, basenameMap } from './backlinks-store.js';

export async function connectConvex(config) {
  if (!config || !config.url || !config.projectKey) return null;

  const { ConvexClient } = await import('https://esm.sh/convex@1/browser');
  const client = new ConvexClient(config.url);

  // Live subscription. Convex re-fires this callback every time a mutation
  // touches any row matched by the query's read set.
  const unsubscribe = client.onUpdate(
    'backlinks:getIndex',
    { projectKey: config.projectKey },
    (index) => {
      backlinksIndex.value = index;

      // Derive basenameMap from the keys we now know about so wiki-links can
      // resolve. (Convex doesn't know the sidebar; keys are every target that
      // has at least one inbound link. Good enough for most cases; fall back
      // to the local sidebar scan's basenameMap if you need every page.)
      const bm = {};
      for (const path of Object.keys(index)) {
        const base = path.split('/').pop().toLowerCase();
        if (base) bm[base] = path;
      }
      basenameMap.value = { ...basenameMap.value, ...bm };
    },
    (err) => {
      console.warn('[convex-adapter] live query error:', err);
    },
  );

  console.log('[convex-adapter] subscribed to backlinks:getIndex');
  return { client, unsubscribe };
}

// Auto-boot if config is present on the window.
if (typeof window !== 'undefined' && window.__convexConfig) {
  connectConvex(window.__convexConfig).catch((err) => {
    console.error('[convex-adapter] boot failed:', err);
  });
}
