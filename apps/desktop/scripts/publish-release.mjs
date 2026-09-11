/**
 * 一键发布 — GitHub Releases(海外) + 腾讯 COS(国内) 双通道
 *
 * 用法(在 apps/desktop/ 下执行):
 *   npm run publish [-- --notes "更新说明"] [-- --skip-gh]
 *
 * 前置:
 *   - release/ 已有本版本产物(pnpm dist / dist:win 之后;exe 需已有点号名副本)
 *   - gh 已登录(上传 GitHub);.env.local 已配 TENCENT_SECRET_ID/KEY(上传 COS)
 *
 * 产物布局:
 *   GitHub: vX.Y.Z Release(空格文件名自动规范化为点号,见 make-update-feed)
 *   COS:    huobao-canvas/vX.Y.Z/<点号文件名> + huobao-canvas/latest.json(指向 COS 直链)
 *
 * 国内下载基址(COS_BASE_URL)与更新器兜底源保持一致,将来绑自定义域名/加 CDN 只改这一处。
 */
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { execFileSync } from 'child_process'
import { fileURLToPath } from 'url'
import { cosPut } from './cos-upload.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DESKTOP = path.resolve(__dirname, '..')
const RELEASE = path.join(DESKTOP, 'release')

/** 国内下载基址:默认桶默认域名,可被 COS_BASE_URL 覆盖(如 https://dl.chatfire.site/huobao-canvas) */
const COS_BASE_URL = process.env.COS_BASE_URL || 'https://huobao-installer-1304922933.cos.ap-guangzhou.myqcloud.com/huobao-canvas'
const COS_KEY_PREFIX = 'huobao-canvas'

const pkg = JSON.parse(fs.readFileSync(path.join(DESKTOP, 'package.json'), 'utf8'))
const version = pkg.version
const tag = `v${version}`

const argv = process.argv.slice(2)
function argOf(flag) { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : undefined }
const notes = argOf('--notes') || ''
const skipGh = argv.includes('--skip-gh')

// 与 make-update-feed 相同的产物清单(GitHub 服务端会把空格转点号,统一用点号名)
const assets = [
  `HuobaoCanvas-${version}-arm64.dmg`,
  `HuobaoCanvas-${version}.dmg`,
  `HuobaoCanvas-${version}-arm64-mac.zip`,
  `HuobaoCanvas-${version}-mac.zip`,
  `HuobaoCanvas.Setup.${version}.exe`,
]
const existing = assets.filter(f => fs.existsSync(path.join(RELEASE, f)))
if (!existing.length) {
  console.error(`release/ 下没有版本 ${version} 的产物,请先 pnpm dist / dist:win`)
  process.exit(1)
}

// ---- 1. GitHub(海外通道) ----
if (!skipGh) {
  console.log(`[1/3] GitHub Release ${tag} …`)
  const ghArgs = ['release', 'upload', tag, ...existing.map(f => path.join(RELEASE, f)), '--clobber']
  execFileSync('gh', ghArgs, { stdio: 'inherit' })
  console.log(`  ✓ 已上传 ${existing.length} 个资产(Release 不存在时会自动创建草稿,需 gh release edit 发布)`)
}

// ---- 2. latest.json(双通道各一份:GitHub 版指向 GitHub,COS 版指向 COS) ----
console.log('[2/3] 生成更新清单 latest.json …')
async function sha256(file) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256')
    fs.createReadStream(file).on('data', c => hash.update(c)).on('end', () => resolve(hash.digest('hex'))).on('error', reject)
  })
}
const buildFeed = async (baseUrl) => {
  const platforms = {}
  for (const f of existing) {
    const key = f.includes('Setup') ? 'win32-x64'
      : f.includes('-arm64') ? 'darwin-arm64'
      : 'darwin-x64'
    // 同一平台 dmg/zip 都存在时只取 zip(更新器用),dmg 是给手动安装的
    if (key !== 'win32-x64' && !f.endsWith('.zip')) continue
    platforms[key] = {
      url: `${baseUrl}/${encodeURIComponent(f)}`,
      sha256: await sha256(path.join(RELEASE, f)),
      size: fs.statSync(path.join(RELEASE, f)).size,
    }
  }
  return { version, notes, platforms }
}

// GitHub 版(沿用 make-update-feed 的 base-url 约定)
const ghFeed = await buildFeed(`https://github.com/chatfire-AI/huobao-canvas/releases/download/${tag}`)
fs.writeFileSync(path.join(RELEASE, 'latest.json'), JSON.stringify(ghFeed, null, 2))
if (!skipGh) execFileSync('gh', ['release', 'upload', tag, path.join(RELEASE, 'latest.json'), '--clobber'], { stdio: 'inherit' })

// COS 版(桶内固定路径 latest.json,更新器国内源入口)
const cosFeed = await buildFeed(`${COS_BASE_URL}/v${version}`)
fs.writeFileSync(path.join(RELEASE, 'latest.cos.json'), JSON.stringify(cosFeed, null, 2))
console.log(`  ✓ latest.json(GitHub) / latest.cos.json(COS) 平台: ${Object.keys(cosFeed.platforms).join(', ')}`)

// ---- 3. COS(国内通道) ----
console.log('[3/3] 上传腾讯 COS …')
for (const f of existing) {
  await cosPut(path.join(RELEASE, f), `${COS_KEY_PREFIX}/v${version}/${f}`, {
    cacheControl: 'public, max-age=2592000', // 安装包按版本命名内容不变,缓存 30 天
  })
  console.log(`  ✓ v${version}/${f}`)
}
await cosPut(path.join(RELEASE, 'latest.cos.json'), `${COS_KEY_PREFIX}/latest.json`, {
  cacheControl: 'no-cache', // 更新发现入口,必须实时
})
console.log(`  ✓ latest.json (no-cache)`)

console.log(`
发布完成:
  海外  https://github.com/chatfire-AI/huobao-canvas/releases/${tag}
  国内  ${COS_BASE_URL}/latest.json
`)
