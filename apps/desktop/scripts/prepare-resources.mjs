/**
 * 组装 electron-builder extraResources 来源目录（每次全量重建）：
 *   resources/frontend  ← apps/web/dist（vite 产物，内嵌 server 静态托管的来源）
 * 打包后落在 process.resourcesPath/frontend。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DESKTOP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const REPO_ROOT = path.resolve(DESKTOP_ROOT, '..', '..')
const RESOURCES = path.join(DESKTOP_ROOT, 'resources')
const FRONTEND_DIST = path.join(REPO_ROOT, 'apps', 'web', 'dist')

if (!fs.existsSync(path.join(FRONTEND_DIST, 'index.html'))) {
  console.error('[prepare-resources] 未找到 apps/web/dist/index.html，请先执行 pnpm --dir ../web build')
  process.exit(1)
}

fs.rmSync(RESOURCES, { recursive: true, force: true })
fs.cpSync(FRONTEND_DIST, path.join(RESOURCES, 'frontend'), { recursive: true })

console.log('[prepare-resources] resources/frontend 完成')
