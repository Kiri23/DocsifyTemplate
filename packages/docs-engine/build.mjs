import * as esbuild from 'esbuild';
import { readFileSync, copyFileSync, mkdirSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
const watch = process.argv.includes('--watch');

mkdirSync('dist', { recursive: true });

// Copy theme.css → dist/docsify-kiri.css
copyFileSync('src/styles/theme.css', 'dist/docsify-kiri.css');

const config = {
  entryPoints: ['src/index.js'],
  bundle: true,
  format: 'iife',
  outfile: 'dist/docsify-kiri.min.js',
  minify: true,
  banner: {
    js: `/* docsify-kiri v${pkg.version} | https://github.com/Kiri23/DocsifyTemplate */`
  },
  // js-yaml, htmx, Prism, mermaid are accessed as window.* globals — not imported,
  // so esbuild won't try to bundle them. No external config needed.
};

if (watch) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log('Watching for changes...');
} else {
  const result = await esbuild.build(config);
  if (result.errors.length) process.exit(1);
  console.log(`Built dist/docsify-kiri.min.js`);
  console.log(`Copied dist/docsify-kiri.css`);
}
