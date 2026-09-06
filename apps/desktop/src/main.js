/**
 * Electron 主进程 — 火宝画布桌面壳
 *
 * 职责：取空闲端口 → utilityProcess.fork 拉起内嵌 canvas-server（esbuild 单文件 bundle，
 * 含 FRONTEND_DIST 静态托管）→ 轮询 /api/healthz → 开窗口 loadURL。
 * 窗口与服务同源（http://127.0.0.1:<port>），前端 /api/* 全部相对路径直达，
 * 画布存储 / Key 入库 / 运行队列在桌面端与 Web 服务端模式行为一致。
 *
 * dev 模式：CANVAS_DEV_URL=http://localhost:8023 electron . → 直接加载 vite dev server
 * （/api 由 vite 代理到本机 canvas-server），不 fork 内嵌服务，保留 HMR。
 */
const { app, BrowserWindow, dialog, shell, utilityProcess } = require('electron')
const net = require('node:net')
const path = require('node:path')
const { registerUpdater, markQuitting } = require('./updater')

// 主进程打 CJS 产物，__dirname 天然可用
const DESKTOP_ROOT = path.resolve(__dirname, '..')
const SERVER_BUNDLE = path.join(DESKTOP_ROOT, 'build', 'server.mjs')
// CANVAS_DEV_URL：dev HMR 入口（跳过内嵌服务，/api 走 vite 代理）
const DEV_URL = process.env.CANVAS_DEV_URL || ''

let mainWindow = null
let server = null
let quitting = false
let serverPort = 0

// userData 显式按模式区分：打包版 / dev 版数据（SQLite、结果文件）与单实例锁互不干扰
app.setPath('userData', path.join(
  app.getPath('appData'),
  app.isPackaged ? 'HuobaoCanvas' : 'HuobaoCanvas-Dev',
))

if (!app.requestSingleInstanceLock()) {
  // 双开会抢 SQLite 写锁；让已有实例聚焦窗口即可
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
  // utilityProcess 要求 app ready 之后才能创建
  app.whenReady().then(bootstrap)
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address()
      srv.close(() => resolve(addr.port))
    })
    srv.on('error', reject)
  })
}

async function waitHealthy(port, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs
  let lastErr = null
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/healthz`)
      if (res.ok) return
    } catch (err) {
      lastErr = err
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error(`内嵌服务启动超时: ${String(lastErr)}`)
}

// ---- 内嵌 canvas-server ----

function startServer() {
  const userData = app.getPath('userData')
  const frontendDist = app.isPackaged
    ? path.join(process.resourcesPath, 'frontend')
    : path.resolve(DESKTOP_ROOT, '..', 'web', 'dist')

  server = utilityProcess.fork(SERVER_BUNDLE, [], {
    env: {
      ...process.env,
      PORT: String(serverPort),
      DATA_DIR: path.join(userData, 'data'),
      FRONTEND_DIST: frontendDist,
      CANVAS_DESKTOP: '1',
    },
    serviceName: 'canvas-server',
    stdio: 'pipe',
  })
  console.log(`[main] server forked from ${SERVER_BUNDLE}, port=${serverPort}`)
  server.stdout?.on('data', (chunk) => process.stdout.write(`[server] ${chunk}`))
  server.stderr?.on('data', (chunk) => process.stderr.write(`[server] ${chunk}`))
  server.on('exit', (code) => {
    server = null
    if (!quitting) {
      dialog.showErrorBox('火宝画布', `内嵌服务异常退出（code ${code}），应用即将关闭。请重新启动。`)
      app.quit()
    }
  })
}

// ---- 窗口 ----

function createWindow(targetUrl) {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1080,
    minHeight: 700,
    title: '火宝画布',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  })
  mainWindow.once('ready-to-show', () => mainWindow?.show())
  // 页面标题自带产品名，避免文件路径兜底标题
  mainWindow.on('page-title-updated', (e) => e.preventDefault())
  mainWindow.on('closed', () => { mainWindow = null })

  // 外链一律交给系统浏览器（如设置页「前往获取 Key」），应用内不弹新窗
  const isAppUrl = (url) => url.startsWith(targetUrl)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url) && !isAppUrl(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  // 主窗口意外导航到外部地址时同样拦下并转浏览器
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (isAppUrl(url)) return
    e.preventDefault()
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url)
  })
  return mainWindow.loadURL(targetUrl)
}

// ---- 启动 ----

async function bootstrap() {
  try {
    // dev HMR：直接加载 vite dev server（需自行启动 web + server 两个 dev 进程）
    if (DEV_URL) {
      console.log(`[main] dev 模式，加载 ${DEV_URL}（不启动内嵌服务）`)
      await createWindow(DEV_URL)
      return
    }
    serverPort = await getFreePort()
    console.log(`[main] port=${serverPort} userData=${app.getPath('userData')}`)
    startServer()
    await waitHealthy(serverPort)
    console.log('[main] server healthy, opening window')
    await createWindow(`http://127.0.0.1:${serverPort}`)
  } catch (err) {
    console.error('[main] 启动失败:', err)
    dialog.showErrorBox('火宝画布', `启动失败：\n${err?.message || err}`)
    app.quit()
  }
}

registerUpdater(() => mainWindow)

app.on('before-quit', () => {
  quitting = true
  markQuitting()
  server?.kill()
})

app.on('window-all-closed', () => {
  app.quit()
})
