/**
 * 应用内更新器（无 Apple 签名方案，与 huobao-drama 同款自实现）
 *
 * - 清单：CANVAS_UPDATE_FEED（默认 GitHub Releases 的 releases/latest/download/latest.json）
 * - macOS：下载 zip（.app 归档）→ sha256 校验 → 解压 → 旧包改名 .old 备胎 → 新包就位
 *   → `open` 拉起新应用 → 当前实例退出；下次启动清理 .old
 * - Windows：下载 Setup.exe → sha256 校验 → detached 静默安装（/S）→ 当前实例退出
 * - 未打包（dev）模式整体禁用
 */
const { app, ipcMain } = require('electron')
const fs = require('node:fs')
const fsp = require('node:fs/promises')
const path = require('node:path')
const crypto = require('node:crypto')
const { spawn, execFile } = require('node:child_process')

const FEED_URL = process.env.CANVAS_UPDATE_FEED
  || 'https://github.com/chatfire-AI/huobao-canvas/releases/latest/download/latest.json'

/** 更新包内的 .app 名称（与 electron-builder productName 一致） */
const APP_BUNDLE_NAME = 'HuobaoCanvas.app'

let state = { status: 'idle', currentVersion: '' }
let getWindow = () => null

function sendProgress(percent) {
  state.downloadProgress = percent
  getWindow()?.webContents.send('canvas:update-progress', percent)
}

function setState(patch) {
  state = { ...state, ...patch }
}

// ---- 工具 ----

function compareVersions(a, b) {
  const pa = a.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0)
  const pb = b.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0)
  }
  return 0
}

async function sha256(file) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256')
    fs.createReadStream(file)
      .on('data', (chunk) => hash.update(chunk))
      .on('end', () => resolve(hash.digest('hex')))
      .on('error', reject)
  })
}

/** 当前运行的架构键（与 latest.json 的 platforms 键一致） */
function platformKey() {
  return `${process.platform}-${process.arch}`
}

/** 已安装 app 的 .app 路径（仅 macOS、打包态有效） */
function installedAppBundle() {
  // process.execPath = .../HuobaoCanvas.app/Contents/MacOS/HuobaoCanvas
  return path.resolve(path.dirname(process.execPath), '..', '..')
}

async function fetchFeed() {
  const res = await fetch(FEED_URL, { signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error(`版本清单请求失败（HTTP ${res.status}）`)
  const feed = await res.json()
  if (!feed?.version || !feed?.platforms) throw new Error('版本清单格式不正确')
  return feed
}

// ---- 检查 ----

async function doCheck() {
  if (!app.isPackaged) {
    setState({ status: 'error', error: '开发模式不支持更新' })
    return state
  }
  setState({ status: 'checking', error: undefined })
  try {
    const feed = await fetchFeed()
    const latestVersion = feed.version.replace(/^v/, '')
    setState({
      status: compareVersions(latestVersion, app.getVersion()) > 0 ? 'available' : 'up-to-date',
      latestVersion,
      notes: feed.notes,
      error: undefined,
    })
  } catch (err) {
    setState({ status: 'error', error: err.message })
  }
  return state
}

// ---- 下载 ----

async function doDownload() {
  if (state.status !== 'available' && state.status !== 'downloaded') {
    throw new Error('当前没有可下载的更新')
  }
  const feed = await fetchFeed()
  const asset = feed.platforms[platformKey()]
  if (!asset) throw new Error(`暂未提供 ${platformKey()} 平台的更新包`)

  setState({ status: 'downloading', downloadProgress: 0 })
  // 大文件下载不设整体超时（progress 由流驱动）；网络中断会触发 fetch 异常走 error
  const res = await fetch(asset.url)
  if (!res.ok || !res.body) throw new Error(`更新包下载失败（HTTP ${res.status}）`)

  const total = asset.size || Number(res.headers.get('content-length')) || 0
  const dir = path.join(app.getPath('temp'), 'huobao-canvas-update')
  await fsp.mkdir(dir, { recursive: true })
  const fileName = decodeURIComponent(asset.url.split('/').pop() || `update-${Date.now()}`)
  const dest = path.join(dir, fileName)

  let received = 0
  let lastReport = 0
  const out = fs.createWriteStream(dest)
  const reader = res.body.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    received += value.byteLength
    if (!out.write(Buffer.from(value))) {
      await new Promise((r) => out.once('drain', r))
    }
    const now = Date.now()
    if (total && now - lastReport > 200) {
      lastReport = now
      sendProgress(Math.min(99, Math.round((received / total) * 100)))
    }
  }
  out.end()
  await new Promise((resolve, reject) => {
    out.on('finish', resolve)
    out.on('error', reject)
  })

  // 完整性校验
  const actual = await sha256(dest)
  if (asset.sha256 && actual !== asset.sha256) {
    await fsp.rm(dest, { force: true })
    throw new Error('更新包校验失败（sha256 不匹配），已取消安装')
  }

  setState({ status: 'downloaded', downloadProgress: 100, downloadedFile: dest })
  sendProgress(100)
  return state
}

// ---- 安装（成功后当前实例退出，不会返回） ----

async function doApply() {
  if (state.status !== 'downloaded' || !state.downloadedFile) {
    throw new Error('请先下载更新')
  }
  const downloaded = state.downloadedFile

  if (process.platform === 'darwin') {
    const bundle = installedAppBundle()
    const tmpExtract = path.join(app.getPath('temp'), `huobao-canvas-update-extract-${Date.now()}`)
    await new Promise((resolve, reject) => {
      execFile('unzip', ['-q', '-o', downloaded, '-d', tmpExtract], (err) => (err ? reject(err) : resolve()))
    })
    const newApp = path.join(tmpExtract, APP_BUNDLE_NAME)
    if (!fs.existsSync(newApp)) throw new Error(`更新包内容异常（未找到 ${APP_BUNDLE_NAME}）`)

    const oldBundle = `${bundle}.old`
    fs.rmSync(oldBundle, { recursive: true, force: true })
    fs.renameSync(bundle, oldBundle)
    try {
      fs.renameSync(newApp, bundle)
    } catch (err) {
      // 就位失败：旧包回滚
      fs.renameSync(oldBundle, bundle)
      throw err
    } finally {
      fs.rmSync(tmpExtract, { recursive: true, force: true })
    }
    // detached 拉起新应用后当前实例退出；下次启动清理 .old 备胎
    spawn('open', [bundle], { detached: true, stdio: 'ignore' }).unref()
    app.quit()
    return
  }

  if (process.platform === 'win32') {
    // NSIS 静默安装：detached 拉起安装器后退出当前实例
    spawn(downloaded, ['/S'], { detached: true, stdio: 'ignore' }).unref()
    app.quit()
    return
  }

  throw new Error(`不支持的平台: ${process.platform}`)
}

// ---- 注册 ----

function registerUpdater(getWindowFn) {
  getWindow = getWindowFn
  state.currentVersion = app.getVersion()

  ipcMain.handle('canvas:update-state', () => state)
  ipcMain.handle('canvas:update-check', () => doCheck())
  ipcMain.handle('canvas:update-download', async () => {
    try {
      return await doDownload()
    } catch (err) {
      setState({ status: 'error', error: err.message })
      throw err
    }
  })
  ipcMain.handle('canvas:update-apply', () => doApply())

  // 启动后静默检查一次（发现新版时渲染层经 update-state 轮询/toast 提示）
  setTimeout(() => { if (!quittingApp()) void doCheck() }, 20000).unref?.()

  // 清理上次更新留下的旧包备胎。延后 3s：更新后首次启动时旧实例可能仍在退出，
  // 立即删除可能与其收尾写入竞争；失败不阻断（下次启动会再试）
  if (app.isPackaged && process.platform === 'darwin') {
    setTimeout(() => {
      const oldBundle = `${installedAppBundle()}.old`
      try {
        if (fs.existsSync(oldBundle)) fs.rmSync(oldBundle, { recursive: true, force: true })
      } catch { /* 残留留给下次启动重试 */ }
    }, 3000).unref?.()
  }
}

function quittingApp() {
  // updater 自身无 quitting 状态，避免循环依赖：main 设置 global 注入
  return globalThis.__canvasQuitting === true
}

/** main.js 在 before-quit 时调用 */
function markQuitting() {
  globalThis.__canvasQuitting = true
}

module.exports = { registerUpdater, markQuitting }
