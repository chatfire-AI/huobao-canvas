/**
 * 生成应用内更新的版本清单 release/latest.json：
 * 扫描 release/ 下的安装产物（mac zip / win Setup.exe），计算 sha256 + size。
 *
 * 用法：node scripts/make-update-feed.mjs [--base-url <url>]
 * 默认 base-url：https://github.com/chatfire-AI/huobao-canvas/releases/download/v<version>
 * （可用环境变量 UPDATE_BASE_URL / GITHUB_REPO 覆盖）
 * latest.json 与安装包一起上传 GitHub Release 即可。
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const DESKTOP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const RELEASE_DIR = path.join(DESKTOP_ROOT, 'release')
const pkg = JSON.parse(fs.readFileSync(path.join(DESKTOP_ROOT, 'package.json'), 'utf8'))
const version = pkg.version

const argBase = process.argv.includes('--base-url')
  ? process.argv[process.argv.indexOf('--base-url') + 1]
  : ''
const repo = process.env.GITHUB_REPO || 'chatfire-AI/huobao-canvas'
const baseUrl = (argBase || process.env.UPDATE_BASE_URL
  || `https://github.com/${repo}/releases/download/v${version}`).replace(/\/$/, '')

// 产物命名与 electron-builder.yml 对应：mac zip（.app 归档）/ win NSIS Setup
const ARTIFACTS = [
  { file: `HuobaoCanvas-${version}-arm64-mac.zip`, platform: 'darwin-arm64' },
  { file: `HuobaoCanvas-${version}-mac.zip`, platform: 'darwin-x64' },
  { file: `HuobaoCanvas Setup ${version}.exe`, platform: 'win32-x64' },
]

const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')

const platforms = {}
for (const artifact of ARTIFACTS) {
  const filePath = path.join(RELEASE_DIR, artifact.file)
  if (!fs.existsSync(filePath)) continue
  platforms[artifact.platform] = {
    url: `${baseUrl}/${encodeURIComponent(artifact.file)}`,
    sha256: sha256(filePath),
    size: fs.statSync(filePath).size,
  }
  console.log(`[feed] ${artifact.platform}: ${artifact.file}`)
}

if (!Object.keys(platforms).length) {
  console.error('[feed] release/ 下没有找到任何安装产物，请先执行 dist')
  process.exit(1)
}

const feed = { version, notes: '', platforms }
fs.writeFileSync(path.join(RELEASE_DIR, 'latest.json'), JSON.stringify(feed, null, 2))
console.log('[feed] release/latest.json 完成')
