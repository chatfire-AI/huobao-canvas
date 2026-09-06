/**
 * 打内嵌 canvas-server：apps/server/src/index.js → build/server.mjs（单文件 ESM）。
 *
 * server 零 npm 依赖（node:http / node:sqlite / 内置 fetch），bundle 会把
 * engine.js 对 apps/web/src 的反向 import（providers 预设 / 协议适配器 /
 * inputTransform）全部内联——打包时无需拷贝 web src 闭包。
 * utilityProcess.fork 以 ELECTRON_RUN_AS_NODE 加载本文件（Node 22.16 ≥ 22.13，
 * node:sqlite 可用；启动日志有 ExperimentalWarning 属预期）。
 */
import { build } from 'esbuild'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DESKTOP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const REPO_ROOT = path.resolve(DESKTOP_ROOT, '..', '..')

await build({
  entryPoints: [path.join(REPO_ROOT, 'apps/server/src/index.js')],
  outfile: path.join(DESKTOP_ROOT, 'build', 'server.mjs'),
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node22',
  sourcemap: true,
})

console.log('[build-server] build/server.mjs 完成')
