/**
 * 打主进程 + preload：src/main.js → dist/main.js、src/preload.js → dist/preload.js。
 * CJS 产物：__dirname 天然可用；updater.js 经 require 一并 bundle；electron 外部化。
 */
import { build } from 'esbuild'

await build({
  entryPoints: ['src/main.js', 'src/preload.js'],
  outdir: 'dist',
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node22',
  external: ['electron'],
  sourcemap: true,
})

console.log('[build-main] dist/main.js + dist/preload.js 完成')
