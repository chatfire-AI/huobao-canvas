# canvas-server（火宝画布服务端）

零 npm 依赖的 Node 服务（需 **Node ≥ 22.13**，用内置 `node:sqlite` 与 `fetch`），承担三件事：

1. **画布数据存储**——项目/图快照落 SQLite，任何浏览器打开同一部署即同一份数据
2. **设置镜像**——API Key / baseUrl 覆盖 / 网关地址入库（换浏览器拿到全部 Key）
3. **模型调用运行队列**——全部模型调用在服务端执行（Key、协议适配、异步任务轮询都在服务端完成），提交即持久化 runId，浏览器刷新后凭 runId 恢复任务

## 模块结构

```
src/
  index.js       入口：http 服务 + 路由装配 + 全局错误处理
  http.js        HTTP 基础设施（sendJson / readJson / CORS / 路由匹配 / HttpError）
  db.js          SQLite 连接 + 建表 + 预编译语句（projects / graphs / settings / runs）
  engine.js      运行引擎（复用 apps/web 纯函数：providers 配置 / 协议适配器 / transform）
  routes/
    canvas.js    画布项目与图快照
    settings.js  设置（Key 镜像）
    runs.js      运行队列 + 厂商连通测试
    files.js     结果文件静态访问
    proxy.js     网关/厂商反代（Electron 内嵌模式承接渲染端同源转发；Web 部署由 nginx 先行截走）
    static.js    前端静态托管（FRONTEND_DIST 存在时挂载，SPA fallback；Electron 内嵌模式用）
```

> `engine.js` 直接 import `apps/web/src` 的纯函数模块（providers 配置、协议适配器、
> inputTransform 模板引擎）——单一实现，前后端共用，不存在复制漂移。
> 因此 Docker 构建上下文是**仓库根目录**，按相同相对路径 COPY web 侧闭包；
> Electron 桌面端则用 esbuild 把本服务打成单文件 bundle（apps/desktop/scripts/build-server.mjs）。

## 接口文档

所有接口均在 `/api` 前缀下，JSON 出入（除 `GET /api/graphs/:id` 与 `/api/files/:name` 直出原文）。

### 探活

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/healthz` | 存活探测。前端据此决定走服务端还是回退浏览器 BYOK 链路（回退时画布存储不可用） |

### 画布项目

| 方法 | 路径 | 请求体 / 参数 | 说明 |
|---|---|---|---|
| GET | `/api/projects` | — | 项目列表（含 `nodeCount`，按 `updatedAt` 倒序） |
| POST | `/api/projects` | `{ id, name, createdAt?, updatedAt? }` | 新建/覆盖项目（幂等） |
| GET | `/api/projects/:id` | — | 单个项目；404 = 不存在 |
| PUT | `/api/projects/:id` | `{ name?, updatedAt? }` | 局部更新（重命名） |
| DELETE | `/api/projects/:id` | — | 删除项目（级联删除图快照） |

### 画布图快照（整图覆盖写，客户端权威）

| 方法 | 路径 | 请求体 | 说明 |
|---|---|---|---|
| GET | `/api/graphs/:projectId` | — | 图快照原文（nodes / edges / viewport / pendingDeletion） |
| PUT | `/api/graphs/:projectId` | `{ nodes, edges, viewport, updatedAt? }` | 整体覆盖保存 |

### 设置（Key 镜像）

| 方法 | 路径 | 请求体 | 说明 |
|---|---|---|---|
| GET | `/api/settings` | — | 全部设置 `{ name: value }`（provider keys / 全局 Key / 网关地址） |
| PUT | `/api/settings` | `{ name: value, ... }` | 合并写入（按 name 覆盖）。**Key 为明文，仅内网/可信环境部署** |

键名与浏览器 localStorage 对齐：`chatfire_canvas_provider_keys`、`chatfire_canvas_api_keys`、`chatfire_canvas_current_key`、`chatfire_canvas_gateway_base`、`chatfire_canvas_catalog`（模型目录覆盖）。

### 模型目录

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/catalog` | 生效中的模型目录：`{ models, overrides }`——预设（110 模型）叠加 settings 表里的用户覆盖（启停/隐藏/自定义/编辑预设），引擎执行与浏览器目录同源 |

### 运行队列（全量服务端执行）

| 方法 | 路径 | 请求体 / 参数 | 说明 |
|---|---|---|---|
| POST | `/api/runs` | `{ model, endpointPath, formData, projectId?, nodeId? }` | 提交运行，立即返回 `202 { runId }`，后台执行 |
| GET | `/api/runs/:id` | — | 运行状态与结果（见下方出参） |
| GET | `/api/runs?active=1` | — | 活动运行列表（画布加载对账用） |
| DELETE | `/api/runs/:id` | — | 取消（中止在途请求；厂商侧异步任务本地标记取消） |
| POST | `/api/providers/:id/test` | — | 厂商连通测试（服务端代发，Key 用 settings 里的） |

`GET /api/runs/:id` 出参：

```jsonc
{
  "id": "run_...", "projectId": "...", "nodeId": "...",
  "status": "queued | running | waiting | completed | failed | cancelled",
  "result": { ... },            // 厂商原始响应
  "parsedResults": [ ... ],     // 提取后的结果（文本 / URL / /api/files/…）
  "unavailableReason": "",      // 结果不可用时原因
  "error": "",                  // failed 时的错误信息
  "createdAt": "...", "updatedAt": "..."
}
```

### 结果文件

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/files/:name` | Veo 鉴权视频 / base64 结果落盘后的持久访问（7 天缓存头） |

### 反代与静态托管（Electron 内嵌模式）

非 `/api` 前缀，仅在请求到达本服务时生效（Web 部署由 nginx 先行截走，不会到达）：

| 路径 | 说明 |
|---|---|
| `/v1/*`、`/v1beta/*`、`/sys/*`、`/qwen/*`、`/volcengine/*`、`/vidu/*`、`/minimax/*`、`/xai/*`、`/zhipu/*` | 透传到网关地址（settings `chatfire_canvas_gateway_base` > 内置公共网关）；调用方未带鉴权头时用服务端 Key 兜底注入 |
| `/official/{providerId}/*` | 透传到厂商官方 baseUrl（含 settings baseUrl 覆盖）；同样支持服务端 Key 兜底 |
| 其余 GET 路径 | `FRONTEND_DIST` 存在时托管前端静态产物，未命中回退 `index.html`（SPA） |

## 运行

```bash
# 本地开发（默认 :16812，数据落 ./data）
pnpm start            # = node src/index.js
pnpm dev              # --watch 热重启

# Docker（compose 内已配好，nginx 经 /api/ 同源反代）
docker compose up -d
```

环境变量：`PORT`（默认 16812）、`DATA_DIR`（默认 `./data`）、`FRONTEND_DIST`（前端产物目录，Electron 注入；为空则不挂载 static 路由）。

## 行为约定

- **异步任务轮询预算**：720 次 × 10s ≈ 2 小时（长视频友好）；401/403 不烧预算等下一轮
- **结果文件**：Gemini Veo 鉴权链接 / `b64_json` 由服务端下载/解码落 `data/files/`，返回 `/api/files/…` 相对 URL（同源直用）
- **清理**：已完成 runs 保留 7 天后由 ticker 清理
- **无鉴权**：设计为自部署内网使用；公网部署请自行加反代层鉴权，且不要在设置里存真实 Key
- **进程重启**：`queued/running` 的运行标记失败（提交动作只存在内存）；`waiting`（已拿到厂商 taskId）的运行继续轮询
