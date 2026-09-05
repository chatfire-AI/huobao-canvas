# 架构说明

## 总览

```
浏览器（apps/web）
 ├─ 画布 UI：Vue 3 + Vue Flow + Naive UI
 ├─ 画布数据：Dexie / IndexedDB（纯本地，不上服务端）
 ├─ 模型调用栈：useCanvasModelNode → useModelRunner → useRequestPipeline → 协议适配层
 └─ 推理请求：fetch → nginx 反代 / dev proxy → 上游网关（默认 ChatFire 公共 API）

```

## 前端模块（apps/web/src）

| 目录 | 职责 |
|---|---|
| `views/canvas/` | 画布本体：`index.vue`（组装点）、`composables/`（图操作 / Dexie 持久化 / 节点运行适配）、`components/`（工具栏、PromptDock、预览、缩放控件）、`components/nodes/`（文本/图像/视频/分组节点）、`components/edges/`、`utils/`（序列化、布局、连线规则）、`constants/` |
| `views/playground/protocols/` | 多厂商协议适配（Gemini / DashScope / 火山等），请求构造 + SSE 解析 |
| `views/playground/composables/` | 模型目录加载、schema 合并、API Key（BYOK 本地存储） |
| `views/playground/utils/` | 端点路径解析（前缀白名单校验）、schema 合并、聊天协议 |
| `composables/useRequestPipeline.js` | 统一请求管线：发送、SSE、异步任务轮询（120 次 × 5s） |
| `api/` | 模型目录客户端（`/sys/model/*`，回退 `/v1/models`）、存储客户端 |
| `config/` | 运行时配置单一来源（`window.__APP_CONFIG__` > `VITE_*` > 默认） |

## 节点体系

- 节点类型：`textNode` / `imageNode` / `videoNode` / `groupNode`（`audioNode`/`musicNode` 仅为旧数据兼容保留）
- 节点类型 ↔ 模型分类：text→1（对话）、image→2（图像）、video→3（视频）
- 状态机：`idle / running / waiting / success / unavailable / expired / error`
- 连线规则：`utils/connectionRules.js` 的类型矩阵；支持拖线落点直接创建下游节点

## 数据持久化

- Dexie 库 `chatfire-platform-canvas`（schema v2）：`canvas_projects` + `canvas_graphs`
- graph 存 `{nodes, edges, viewport}`，按项目防抖保存；项目上限 50
- 加载时 `repairCanvasGraphForLoad` 做兼容修复
- 当前项目 ID 存 localStorage `chatfire_canvas_current_project_id`

## 运行链路

PromptDock 收集 prompt+参数+参考图 → `useCanvasModelNode` 解析上游输入（URL/b64/File→dataURL）
→ `useModelRunner`/`useRequestPipeline` 按协议适配器构造请求 → fetch 上游网关
→ 同步 JSON / SSE / 异步任务轮询 → 结果写回节点 payload → Dexie 保存。
