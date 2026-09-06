# 架构说明

## 总览

```
apps/web（Vue 3 前端） + apps/server（画布存储/设置镜像/运行队列） + apps/desktop（Electron 桌面壳）
 ├─ 画布 UI：Vue 3 + Vue Flow + Naive UI
 ├─ 画布数据：apps/server（SQLite 单轨；服务端不可用时呈现保存错误状态，不回退本地）
 ├─ 模型调用栈：useCanvasModelNode → useModelRunner → useRequestPipeline
 │    ├─ 服务端模式（/api/healthz 可达）：提交 /api/runs 由 server 引擎执行，runId 持久化，刷新可恢复
 │    └─ 浏览器回退：BYOK（Key 在 localStorage），fetch → nginx 反代 / dev proxy → 上游网关
 └─ 桌面端：Electron 内嵌 apps/server（utilityProcess.fork）+ 同源 loadURL，能力与 Web 服务端模式一致
```

## 前端模块（apps/web/src）

| 目录 | 职责 |
|---|---|
| `views/canvas/` | 画布本体：`index.vue`（组装点）、`composables/`（图操作 / useCanvasStorage 服务端持久化 / 节点运行适配）、`components/`（工具栏、PromptDock、预览、缩放控件）、`components/nodes/`（文本/图像/视频/分组节点）、`components/edges/`、`utils/`（序列化、布局、连线规则）、`constants/` |
| `views/playground/protocols/` | 多厂商协议适配（Gemini / DashScope / 火山等），请求构造 + 结果提取；纯函数，apps/server 引擎直接复用 |
| `views/playground/composables/` | 模型目录加载、schema 合并、API Key（BYOK 本地存储） |
| `views/playground/utils/` | 端点路径解析（前缀白名单校验）、schema 合并、聊天协议 |
| `composables/useRequestPipeline.js` | 统一请求管线：服务端分支（/api/runs 提交+轮询）优先，浏览器分支（发送、异步任务轮询）兜底 |
| `api/canvasServer.js` | 服务端客户端：画布存储（projects/graphs）、设置镜像（settings）、运行队列（runs：submit/poll/cancel/testProvider） |
| `api/localCatalog.js` | 本地模型目录源：厂商预设 + 用户覆盖（启停/隐藏/自定义），覆盖写入时镜像到 server settings 表 |
| `utils/desktopBridge.js` | appFetch 统一请求入口：原生 fetch + 网关绝对地址同源回落（浏览器/Electron 同链路） |
| `config/` | 运行时配置单一来源（`window.__APP_CONFIG__` > `VITE_*` > 默认） |

## 服务端（apps/server，零 npm 依赖，Node ≥22.13）

| 模块 | 职责 |
|---|---|
| `src/index.js` | http 服务 + 路由装配；路由顺序：/api 业务 → proxy 反代 → static 兜底 |
| `src/db.js` | `node:sqlite` 连接 + 建表（projects/graphs/settings/runs）+ 预编译语句 |
| `src/engine.js` | 运行引擎：复用 web 纯函数模块执行模型调用、异步任务轮询（720×10s≈2h）、结果文件落盘 |
| `src/routes/canvas.js` | 画布项目与图快照 CRUD（graph 存 `{nodes, edges, viewport}`，按项目防抖保存，上限 50） |
| `src/routes/settings.js` | 设置镜像（Key/baseUrl/网关地址/目录覆盖，整块 JSON 存取） |
| `src/routes/runs.js` | 运行队列 API + 厂商连通测试 |
| `src/routes/files.js` | 结果文件静态访问（Veo 鉴权视频 / base64 落盘产物） |
| `src/routes/proxy.js` | 网关/厂商反代（镜像 nginx 挂载语义；仅 Electron 内嵌时承接，Web 部署被 nginx 先行截走） |
| `src/routes/static.js` | 前端静态托管（`FRONTEND_DIST` 存在时挂载，SPA fallback；Electron 内嵌模式用） |

## 桌面端（apps/desktop，Electron 37）

```
src/main.js    单实例锁 → 空闲端口 → utilityProcess.fork 内嵌 server（build/server.mjs）
               → /api/healthz 健康轮询 → BrowserWindow loadURL（127.0.0.1 同源）
src/preload.js contextBridge 暴露 window.canvasDesktop（更新 API + 版本信息）
src/updater.js 自实现应用内更新：latest.json feed + sha256 校验 + mac 换包 / win NSIS /S
scripts/       esbuild 打包（main cjs / server esm 单文件）+ resources 组装 + 更新清单生成
```

- 数据目录：`~/Library/Application Support/HuobaoCanvas[-Dev]/data`（SQLite + 结果文件），dev/打包隔离
- 打包：`pnpm dist`（electron-builder → mac dmg+zip / win nsis；未签名，配置位已留）
- 内嵌 server 经 `FRONTEND_DIST` 托管 `resources/frontend`（apps/web/dist），窗口同源加载，
  `/api/*`、网关/厂商相对路径（proxy 路由）全部直达服务端，前端零改动
- dev HMR：`CANVAS_DEV_URL=http://localhost:8023 npm run dev`（配合 web/server 两个 dev 进程）

## 节点体系

- 节点类型：`textNode` / `imageNode` / `videoNode` / `groupNode`（`audioNode`/`musicNode` 仅为旧数据兼容保留）
- 节点类型 ↔ 模型分类：text→1（对话）、image→2（图像）、video→3（视频）
- 状态机：`idle / running / waiting / success / unavailable / expired / error`
- 连线规则：`utils/connectionRules.js` 的类型矩阵；支持拖线落点直接创建下游节点
- @ 引用：PromptDock 内输入 @ 列出已连入的媒体素材（图1/图2…），选中插入「图N」位置标记

## 运行链路

PromptDock 收集 prompt+参数+参考图 → `useCanvasModelNode` 解析上游输入（URL/b64/File→dataURL）
→ 服务端模式：`POST /api/runs` 拿 runId（立即持久化到节点 payload.task）→ 轮询至终态
→ 浏览器回退：`useModelRunner`/`useRequestPipeline` 协议适配 → fetch 上游
→ 结果写回节点 payload → `useCanvasStorage` 保存到 server SQLite。
加载时 `repairCanvasGraphForLoad` 做兼容修复（RUNNING/WAITING + runId → WAITING 恢复轮询）。
