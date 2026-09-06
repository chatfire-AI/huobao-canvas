# 火宝画布桌面版（Electron）

Electron 37 壳 + 内嵌 `apps/server`（canvas-server），桌面端获得与 Web 服务端模式一致的完整能力：
画布 SQLite 存储、API Key 入库、运行队列（刷新/重启后任务凭 runId 恢复）。

## 架构

```
BrowserWindow ──loadURL──→ http://127.0.0.1:<空闲端口>
                                ↑ utilityProcess.fork(build/server.mjs)
                                │   · esbuild 单文件 bundle（内联 web src 闭包，零 npm 依赖）
                                │   · node:sqlite（Electron 内置 Node 22.16，无需原生模块）
                                │   · FRONTEND_DIST 静态托管（resources/frontend = apps/web/dist）
                                │   · routes/proxy.js 承接渲染端网关/厂商同源转发
                                └ 数据：userData/data（canvas.db + files/）
```

- `src/main.js`：单实例锁 → 空闲端口 → fork server → `/api/healthz` 健康轮询 → 开窗口
- `src/preload.js`：`window.canvasDesktop`（更新 API + 运行时版本）
- `src/updater.js`：自实现应用内更新（latest.json feed + sha256 + mac 换包 / win NSIS `/S`）

## 开发

```bash
pnpm install

# 方式一：HMR（另开两个终端跑 web / server 的 dev）
pnpm --dir ../web dev        # vite :8022（PORT 可覆盖）
pnpm --dir ../server dev     # canvas-server :16812
CANVAS_DEV_URL=http://localhost:8022 npm run dev

# 方式二：内嵌服务端全链路（先 build web 产物）
pnpm --dir ../web build
npm run dev
```

## 打包分发

```bash
npm run dist       # mac：dmg + zip（arm64 / x64，未签名）
npm run dist:win   # win：NSIS 安装程序（x64，未签名）
npm run feed       # 扫描 release/ 生成 latest.json（随安装包上传 GitHub Release）
```

产物在 `release/`。mac 未签名：首次打开需「右键 → 打开」；正式分发需 Apple 签名 + notarize
（`electron-builder.yml` 已留配置位）。Windows 未签名会触发 SmartScreen 提示。

应用内更新：打包版启动 20s 后静默检查 `CANVAS_UPDATE_FEED`
（默认 `https://github.com/chatfire-AI/huobao-canvas/releases/latest/download/latest.json`），
设置页「应用更新」可手动检查/下载/安装。
