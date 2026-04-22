import * as esbuild from 'esbuild';
import { readFileSync, copyFileSync, mkdirSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
const watch = process.argv.includes('--watch');

mkdirSync('dist', { recursive: true });

copyFileSync('src/styles/theme.css', 'dist/theme.css');

const banner = { js: `/* docs-engine v${pkg.version} | https://github.com/Kiri23/DocsifyTemplate */` };

const peerExternals = ['preact', 'preact/hooks', 'preact-custom-element', '@preact/signals', 'htm', 'unified', 'remark-parse', 'unist-util-visit'];

const builds = [
  // Core library — ESM, peer deps external (for bundlers and esm.sh importmap users)
  {
    entryPoints: ['src/index.js'],
    bundle: true,
    format: 'esm',
    outfile: 'dist/docs-engine.esm.js',
    banner,
    external: peerExternals,
  },
  // Docsify adapter — self-contained bundle (everything inlined, one preact instance)
  // Use this for simple <script type="module"> with no importmap
  {
    entryPoints: ['src/adapters/docsify/index.js'],
    bundle: true,
    format: 'esm',
    outfile: 'dist/docsify-adapter.js',
    minify: true,
    banner,
  },
  // Docsify adapter — ESM, peer deps external (for importmap users who control preact version)
  {
    entryPoints: ['src/adapters/docsify/index.js'],
    bundle: true,
    format: 'esm',
    outfile: 'dist/docsify-adapter.esm.js',
    minify: true,
    banner,
    external: peerExternals,
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
  }
}
