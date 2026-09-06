# 配置说明

ChatFire Canvas 的所有可变项都通过环境变量 / 运行时配置注入，无需改代码。

## 配置优先级

`window.__APP_CONFIG__`（部署注入的 `/config.js`）> `VITE_*` 环境变量（构建期）> 默认值。

## 配置项

| 项 | 环境变量 | 默认值 | 说明 |
|---|---|---|---|
| 推理基地址 | `VITE_API_BASE_URL` / `apiBaseUrl` | dev: 空串（同源代理）；prod: `https://api.firemux.com` | 模型生成与目录请求基地址，可指向任意 OpenAI 兼容网关 |
| dev 代理目标 | `VITE_UPSTREAM` | `https://api.firemux.com` | 仅 dev server 使用 |

## Docker 部署环境变量（docker-compose）

| 变量 | 默认值 | 说明 |
|---|---|---|
| `UPSTREAM` | `https://api.firemux.com` | nginx 反代的推理上游（容器内） |
| `API_BASE_URL` | 空 | 写入 `config.js` 的 `apiBaseUrl`，留空 = 同源反代（推荐，规避 CORS） |
| `EXPIRE_DAYS` | `7` | 媒体保留天数提示 |

## 模型目录模式

设置页可切换，存 localStorage（`chatfire_canvas_catalog_mode`），部署默认值用 `VITE_CATALOG_MODE` / `catalogMode`：

| 模式 | 说明 |
|---|---|
| `official`（默认） | 厂商官方直连。模型目录来自内置预设（`src/config/providers/`，12 家厂商），按厂商配置 Key（设置页），请求经 `/official/{providerId}/` 同源反代到厂商官方域名 |
| `gateway` | ChatFire 网关。目录来自 `${API_BASE_URL}/sys/model/*`（回退 `/v1/models`），单一全局 Key（Bearer） |

### 厂商官方预设结构

`src/config/providers/{厂商}.js`：`{ id, label, icon, docsUrl, baseUrl, proxyPrefix, auth, testPath, models[] }`。
- `auth.type`：`bearer` / `x-api-key`（Claude，带 `anthropic-version`）/ `x-goog-api-key`（Gemini）/ `token`（Vidu 的 `Authorization: Token`）
- 端点显式声明 `protocolKey`（对应 8 个协议适配器之一）；异步端点带 `query` 轮询配置（`path/statusPath/completedValues/failedValues/taskIdPath`）
- `modelSchema.inputTransform` 用 `$$ {field}` / `@conditional` 模板把表单重组为厂商官方请求体

### 反代与 DNS 注意

- `/official/*` 反代在 dev（vite proxy）与生产（nginx）均已内置；nginx 使用运行时 resolver + `proxy_ssl_server_name on`（SNI）+ `ipv6=off`
- 若宿主机有代理工具（Clash fake-ip 等）污染容器 DNS：compose 已默认指定公共 DNS（223.5.5.5）；海外厂商若需走本机代理，移除 `dns:` 配置改用宿主机 DNS
- api.x.ai 等域名存在 DNS 污染，无代理环境直连可能失败


## API Key（BYOK）

- **官方直连**：设置页按厂商保存（`chatfire_canvas_provider_keys`），运行时按模型归属厂商自动取用
- **网关模式**：画布工具栏管理全局 Key（`chatfire_canvas_api_keys`），支持 URL 参数 `?api_key=sk-...`
- Key 仅存浏览器 localStorage，不上传任何服务端

## 推理端点约定

画布按模型 schema 动态挂载端点，前缀白名单：`/v1/`、`/v1beta/`、`/qwen/`、`/volcengine/`、`/vidu/`、`/minimax/`、`/xai/`。
异步任务（视频生成）依赖 ChatFire 网关的 `X-Chatfire-Task-Id` 头与 `/v1/tasks/{id}` 轮询约定；接非 ChatFire 端点时视频类能力可能不可用。

## 服务端存储与运行引擎（apps/server）

自部署画布服务（Node ≥22.13，内置 node:sqlite，零 npm 依赖）：

- **画布数据**：projects/graphs 两表，前端单轨直连（无本地 IndexedDB 兜底；服务端不可用时画布保存/加载呈现错误状态）。本地开发需同时运行 apps/server（`pnpm -C apps/server dev`）。
- **设置（API Key / baseUrl / 网关地址）**：settings 表。前端所有 Key 写入防抖镜像到服务端；启动时服务端非空则以服务端为准（换浏览器即拿到全部 Key）。**Key 明文存服务端，仅适合内网/可信环境部署，公开站点不要存真实 Key。**
- **运行队列（runs 表）**：全部模型调用经服务端执行（`POST /api/runs`），复用前端的 providers 配置与协议适配器。提交即持久化 runId 到节点，刷新/换浏览器后自动轮询恢复；异步视频任务由服务端 ticker 轮询（预算 2 小时）。Veo 鉴权视频 / base64 结果落 `data/files/`，经 `/api/files/*` 同源访问。
- **环境变量**：`PORT`（默认 16812）、`DATA_DIR`（默认 ./data）。compose 内已由 nginx `/api/` 反代同源接入。
