import * as esbuild from 'esbuild';
import { readFileSync, copyFileSync, mkdirSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
const watch = process.argv.includes('--watch');

mkdirSync('dist', { recursive: true });
// Also output to docs/vendor/ so docs/index.html can reference with relative paths
mkdirSync('../../docs/vendor/docs-engine', { recursive: true });

copyFileSync('src/styles/theme.css', 'dist/theme.css');
copyFileSync('src/styles/theme.css', '../../docs/vendor/docs-engine/theme.css');

const banner = { js: `/* docs-engine v${pkg.version} | https://github.com/Kiri23/DocsifyTemplate */` };

const builds = [
  // Core library — ESM, for bundlers and esm.sh
  {
    entryPoints: ['src/index.js'],
    bundle: true,
    format: 'esm',
    outfile: 'dist/docs-engine.esm.js',
    banner,
    // peer deps — consumer provides these
    external: ['preact', 'preact/hooks', 'preact-custom-element', '@preact/signals', 'htm', 'unified', 'remark-parse', 'unist-util-visit'],
  },
  // Docsify adapter — ESM bundle, self-contained, for <script type="module">
  {
    entryPoints: ['src/adapters/docsify/index.js'],
    bundle: true,
    format: 'esm',
    outfile: 'dist/docsify-adapter.js',
    minify: true,
    banner,
    // loaded via importmap in Docsify context
    external: ['preact', 'preact/hooks', 'preact-custom-element', '@preact/signals', 'htm', 'unified', 'remark-parse', 'unist-util-visit'],
  },
];

if (watch) {
  const contexts = await Promise.all(builds.map(c => esbuild.context(c)));
  await Promise.all(contexts.map(ctx => ctx.watch()));
  console.log('Watching...');
} else {
  for (const config of builds) {
    const result = await esbuild.build(config);
    if (result.errors.length) process.exit(1);
    console.log(`Built ${config.outfile}`);
    // Mirror to docs/vendor/ for the demo site
    const vendorPath = config.outfile.replace('dist/', '../../docs/vendor/docs-engine/');
    copyFileSync(config.outfile, vendorPath);
    console.log(`  → ${vendorPath}`);
  }
  console.log('Copied dist/theme.css → docs/vendor/docs-engine/theme.css');
}
