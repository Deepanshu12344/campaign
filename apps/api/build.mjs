/* global console, process */
import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));

// Externalize all dependencies EXCEPT @campaigns/shared so it is bundled directly into dist/index.js
const external = Object.keys(pkg.dependencies || {}).filter(
  (dep) => dep !== '@campaigns/shared'
);

// Also externalize peerDependencies or common native node internals
external.push('@prisma/client', 'prisma');

async function build() {
  console.log('Building apps/api production bundle with esbuild...');

  await esbuild.build({
    entryPoints: {
      index: path.resolve(__dirname, 'src/index.ts'),
      seed: path.resolve(__dirname, 'prisma/seed.ts'),
    },
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outdir: path.resolve(__dirname, 'dist'),
    external,
    sourcemap: true,
    logLevel: 'info',
  });

  console.log('Production build completed successfully: dist/index.js and dist/seed.js');
}

build().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
