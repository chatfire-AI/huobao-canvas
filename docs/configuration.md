# 配置说明

ChatFire Canvas 的所有可变项都通过环境变量 / 运行时配置注入，无需改代码。

## 配置优先级

`window.__APP_CONFIG__`（部署注入的 `/config.js`）> `VITE_*` 环境变量（构建期）> 默认值。

## 配置项

| 项 | 环境变量 | 默认值 | 说明 |
|---|---|---|---|
| 推理基地址 | `VITE_API_BASE_URL` / `apiBaseUrl` | dev: 空串（同源代理）；prod: `https://api.chatfire.site` | 模型生成与目录请求基地址，可指向任意 OpenAI 兼容网关 |
| dev 代理目标 | `VITE_UPSTREAM` | `https://api.chatfire.site` | 仅 dev server 使用 |
| 存储 Provider | `VITE_STORAGE_PROVIDER` / `storageProvider` | `none` | `none`：生成结果保留厂商原始 URL/base64（临时链接会过期）；`s3`：直传用户自有对象存储桶（设置页配置）；`http`：转存到自建存储服务 |
| 存储上传地址 | `VITE_STORAGE_UPLOAD_URL` / `storageUploadUrl` | `/storage/upload` | provider 为 `http` 时生效 |
| 云端媒体域名 | `VITE_CLOUD_MEDIA_DOMAIN` / `cloudMediaDomain` | 空 | 用于识别"已转存"URL 并提示保留期 |

## Docker 部署环境变量（docker-compose）

| 变量 | 默认值 | 说明 |
|---|---|---|
| `UPSTREAM` | `https://api.chatfire.site` | nginx 反代的推理上游（容器内） |
| `API_BASE_URL` | 空 | 写入 `config.js` 的 `apiBaseUrl`，留空 = 同源反代（推荐，规避 CORS） |
| `STORAGE_PROVIDER` | `none` | 启用 storage profile 时设为 `http` |
| `STORAGE_PUBLIC_BASE` | `http://localhost:8080/storage` | 存储服务对外访问前缀 |
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

## 媒体转存

设置页「通用 → 媒体转存」三选一（存 localStorage `chatfire_canvas_storage_provider`）：

| 模式 | 说明 |
|---|---|
| `none`（默认） | 不转存。base64 结果刷新即失；厂商临时 URL 会过期，过期后节点标记"已过期" |
| `s3`（对象存储桶） | 直传用户自有桶。**S3 兼容**（AWS S3 / 火山 TOS / MinIO，SigV4 预签名 PUT）与**腾讯云 COS**（原生 q-sign 预签名）。配置（endpoint/region/bucket/AK/SK/访问域名）存 localStorage `chatfire_canvas_bucket_config`，凭证不出浏览器。前置条件：桶需配置 CORS（允许应用来源 PUT）+ 公开读或绑 CDN 域名；MinIO 等自建网关勾选 Path-Style。厂商临时 URL 的转存在浏览器受厂商 CORS 限制（base64 结果无影响），桌面端无此限制 |
| `http`（自建存储服务） | `docker compose --profile storage up -d` 启动 `apps/storage`（零依赖 Node 服务），base64 ≤30MB / URL 转存 ≤100MB（服务端下载，不受浏览器 CORS 限制，带 SSRF 防护） |

## API Key（BYOK）

- **官方直连**：设置页按厂商保存（`chatfire_canvas_provider_keys`），运行时按模型归属厂商自动取用
- **网关模式**：画布工具栏管理全局 Key（`chatfire_canvas_api_keys`），支持 URL 参数 `?api_key=sk-...`
- Key 仅存浏览器 localStorage，不上传任何服务端

## 推理端点约定

画布按模型 schema 动态挂载端点，前缀白名单：`/v1/`、`/v1beta/`、`/qwen/`、`/volcengine/`、`/vidu/`、`/minimax/`、`/xai/`。
异步任务（视频生成）依赖 ChatFire 网关的 `X-Chatfire-Task-Id` 头与 `/v1/tasks/{id}` 轮询约定；接非 ChatFire 端点时视频类能力可能不可用。
