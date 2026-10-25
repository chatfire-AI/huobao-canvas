# 对标 infinite-canvas：对比结论与实施路线图

> 日期：2026-09-27。对标仓库：https://github.com/basketikun/infinite-canvas（v0.19.0，MIT）。
> 本文档是四个方向（画布性能 / 存储数据层 / 插件系统 / AI Agent 操控画布）的详细实施方案。

## 一、实机流畅度对比结论

测试方法：Playwright 无头 Chromium，1440×900，rAF 逐帧采样 + longtask 观察，操作含滚轮平移、缩放、框选、拖拽节点。

| 场景 | 火宝画布 | infinite-canvas |
|---|---|---|
| 空画布平移/缩放/框选 | **120 FPS，0 掉帧，0 长任务** | ~107 FPS，1.3–2.8% 掉帧，6–24 个长任务 |
| 带节点平移/缩放 | **120 FPS，p95 10ms** | 120 FPS，p95 10ms |
| 带节点框选 | **120 FPS，0 掉帧** | 104 FPS，2.1% 掉帧 |
| 拖拽单节点 | 114 FPS，p95 **15.2ms** | **120 FPS，p95 10ms** |

**结论：常规规模下火宝画布更流畅**（Vue Flow 变换管线稳定、零长任务）。唯一落后项是拖拽节点帧尾（p95 15.2ms）。

交互模型差异：火宝 = Figma 触控板逻辑（滚轮平移 / 捏合缩放），infinite-canvas = PS 逻辑（滚轮缩放 / 中键·空格平移）。**保持火宝现状**，贴合 Mac 主力用户。

### 现状核查要点（代码实证）

| 项 | 现状 | 优化空间 |
|---|---|---|
| 图片持久化 | 生成图已落盘 `/api/files` 引用；序列化强清洗 base64 | 小 |
| 连线视口裁剪 | `only-render-visible-elements` 已开 | 小 |
| 拖拽更新路径 | shallowRef 不可变替换；拖拽中跳过保存；history 350ms 合并 | 小（watcher 噪音可再压） |
| history 快照 | 全量 `JSON.parse(JSON.stringify())` clone + 全量 stringify 指纹，50 步上限 | **中**（大画布 O(全图) 开销） |
| 用户上传图片 | 仅 PromptDock 入口，`createObjectURL` 本地预览，**刷新即丢** | 功能缺陷（需修复） |
| 画布粘贴/拖入图片 | **无入口** | 功能空白 |
| MiniMap | 常开无开关，大画布全量 SVG | 小 |
| 插件 / Agent | **完全空白**，无任何预留接口 | 从零开始 |

## 二、实施路线图

### Phase 1：画布性能加固（本次实施）

- **P1.1 拖拽期 watcher 静默**：`useCanvasHistory` 与保存 watcher 目前在拖拽每帧仍被触发（靠提前返回/重置防抖兜底）。改为拖拽期间显式暂停（`dragging` 计数标志），拖拽结束一次性结算。目标：拖拽 p95 从 15.2ms 降到 ≤12ms。
- **P1.2 history 快速指纹**：结算时先做一遍 O(n) 轻量指纹（节点数 + 各节点 id/type/取整坐标/data 引用比较），引用未变的节点不重复 stringify；指纹不同才 clone。撤销/重做保持快照回放语义不变。
- **P1.3 MiniMap 显隐开关**：缩放控件加 MiniMap 切换按钮（状态持久化 localStorage）；节点数 >150 时默认收起。
- 验收：重跑 `/tmp/canvas-bench-nodes.mjs` 基准，拖拽节点 p95 ≤12ms，其余项不回退。

### Phase 2：存储/数据层补全（本次实施）

- **P2.1 上传图片落盘**：服务端 `routes/files.js` 新增 `POST /api/files`（JSON base64 body，复用 25MB 上限，写 `data/files/`，返回 `/api/files/<name>` URL，文件名加随机前缀防碰撞与路径穿越）。前端 `handleAssetUpload` 改为：先 `createObjectURL` 即时预览 → 后台上传 → 成功后把节点 `payload` 换成持久 URL（`sourceType: 'upload'`），失败保留本地并标记。修复"刷新即丢"。
- **P2.2 画布级粘贴/拖放建图**：pane 上监听 `paste`（剪贴板含图片）与 `drop`（图片文件）→ 在落点创建 ImageNode → 走 P2.1 上传链路。
- 验收：上传/粘贴图片 → 刷新页面 → 图片仍在；graph JSON 不含 base64（sanitize 已有保障）。

### Phase 3：插件系统 MVP（下一阶段，需确认后开工）

借鉴 infinite-canvas 的宿主运行时方案，Vue 版：

- **P3.1 节点注册表动态化**：现有静态 `nodeTypes` map 改造为可动态注册表（`registerNodeType(type, def)` + 版本计数 ref），内置节点经同一 API 注册；插件节点类型命名 `plugin:<pluginId>:<name>`。创建菜单（ConnectionDropMenu/快捷添加）监听版本计数自动刷新。
- **P3.2 宿主运行时**：`globalThis.HuobaoCanvasRuntime = { Vue 运行时关键 API, injectCSS, 事件总线 emit/on, registerNodeType, 插件私有存储(按 pluginId 隔离, localStorage 前缀) }`。插件构建时 Vue external，运行时不打包第二份 Vue。
- **P3.3 加载器**：URL → fetch → Blob URL → 原生 `import()` ESM → 校验导出 `HuobaoPlugin { id, name, nodes[], css?, setup? }` → 注册节点/注入 CSS/执行 setup；卸载逆序清理。已装插件清单存 localStorage，启动时自动重载；`public/plugins/index.json` 本地发现。
- **P3.4 SDK + 示例插件**：`@huobao/plugin-sdk`（`definePlugin()` 类型 + `buildPlugin()` esbuild 封装），1 个官方示例插件（Markdown 便签节点）走通"开发→构建→URL 安装→画布使用"全流程。
- 明确不做（MVP 外）：远程插件市场、权限沙箱、插件间通信。

### Phase 4：AI Agent 操控画布 MVP（下下一阶段，需确认后开工）

与 infinite-canvas 的关键架构差异：**火宝自带服务端，Agent 通道内置于 apps/server**，不需要独立 agent 进程。

- **P4.1 op 协议**（核心，前后端共享定义）：
  - 画布状态主权在浏览器。op 集：`add_node / update_node / delete_node / connect_nodes / disconnect / set_viewport / select_nodes / run_generation`。
  - 浏览器 → 服务端：`PUT /api/agent/state`（结构化快照：节点/连线/选区/视口，节流推送）。
  - 服务端 → 浏览器：`GET /api/agent/events`（SSE 推 `ops` 批次）→ 浏览器 `useAgentBridge` 应用 op（复用现有 graph composables，应用前打撤销快照）→ `POST /api/agent/result` 回执。
  - 确认模式：默认自动执行；设置页可切"逐条审批"（Naive UI 确认条）。
- **P4.2 服务端 agent 路由**：`routes/agent.js`——状态缓存、待决请求 map（超时 30s）、工具调用入口 `POST /api/agent/tools`（工具名 + 参数 → 编译 op 批次 → SSE 下发 → 等待回执）。安全：仅 loopback 或带 token（复用 settings 里生成）；桌面版同源天然可信。
- **P4.3 MCP 包装**：新增 `apps/agent-mcp/` 小包（stdio MCP server，官方 SDK），把 ~10 个工具（get_state/create_node/update_node/delete_node/connect/select/set_viewport/run_generation/get_run_status/wait_run）转发到 server `/api/agent/tools`。让 Claude Code / Codex 等任何 MCP 客户端可直接操控画布。
- **P4.4 验收**：用 `claude` CLI 加 MCP → "在画布上创建一个文本节点并连到图像节点" 全流程走通；浏览器侧可见、可撤销、可审批。
- 明确不做（MVP 外）：内置对话侧栏、驱动 Codex app-server、Skills 管理。

## 三、分期汇总

| 阶段 | 内容 | 体量 | 状态 |
|---|---|---|---|
| Phase 0 | 实机对比 + 现状核查 | — | ✅ 完成 |
| Phase 1 | 拖拽 watcher 静默 / history 指纹 / MiniMap 开关 | 小 | ✅ 完成（拖拽 p95 15.2→9.0ms；撤销/重做回归通过） |
| Phase 2 | 上传落盘 + 粘贴拖放建图 | 小-中 | ✅ 完成（粘贴→落盘→刷新持久化 e2e 通过） |
| Phase 3 | ~~插件系统 MVP~~ | 中-大 | ❌ 已下线（评估为伪需求，代码已全部移除） |
| Phase 4 | Agent op 协议 + 服务端通道 + MCP | 大 | ✅ 完成（HTTP/MCP 全链路 e2e 通过；对话侧栏见"后续方向"） |

## 四、Phase 3/4 落地说明

### 插件系统（已下线）

曾实现完整 MVP（注册表/宿主运行时/URL 加载器/管理 UI/Markdown 示例插件），评估后认为对该产品现阶段是伪需求，已全部移除。如需重启该方向，可从 git 历史恢复。

### Agent 操控画布（已实现）

- 协议 `apps/web/src/views/canvas/agent/tools.js`：9 个工具 + op 编译器，前后端/MCP 三方共享
- 服务端 `apps/server/src/routes/agent.js`：快照缓存 / SSE 下发 / 待决回执（60s 超时）/ 无画布页 503
- 浏览器桥 `apps/web/src/views/canvas/composables/useAgentBridge.js`：SSE 收 op → 应用（整批一步撤销）→ 回执；图变更 800ms 节流推快照；`huobao.canvas.agentApprove='manual'` 切手动确认
- MCP 桥 `apps/agent-mcp/`：零依赖 stdio MCP server，Claude Code / Codex 一行接入（见该目录 README）
- 已验证：get_state / create / update / connect / disconnect / delete / 撤销恢复 / 刷新持久化 / MCP initialize→tools/list→tools/call 全链路

### 后续方向（未做）

- 画布内对话侧栏（驱动本机 Codex/Claude CLI，对标 canvas-agent 的对话体验）
- run_generation 结果等待与查询工具（当前 fire-and-forget，agent 可轮询 get_state 观察）
- Agent 通道鉴权（当前与全站一致无鉴权，自部署公网暴露时需注意）
