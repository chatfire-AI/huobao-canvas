# @huobao/canvas-agent-mcp

火宝画布 MCP 桥：零依赖 stdio MCP server，把画布工具暴露给 Claude Code / Codex 等任何 MCP 客户端。

```
MCP 客户端 ──stdio JSON-RPC──→ agent-mcp ──HTTP──→ canvas-server ──SSE──→ 浏览器画布页（执行者）
```

## 前置条件

火宝画布任一形态运行中（Web dev / Electron 桌面版 / Docker），且画布页已在浏览器/桌面端打开（写操作需要有画布页在线；`canvas_get_state` 可读最近一次快照）。

## 使用

无需安装依赖（Node ≥ 22.13）：

```bash
node apps/agent-mcp/index.mjs
```

环境变量：

| 变量 | 默认 | 说明 |
|---|---|---|
| `CANVAS_SERVER_URL` | `http://127.0.0.1:16812` | canvas-server 地址 |

### Claude Code 接入

```bash
claude mcp add huobao-canvas -- node /绝对路径/apps/agent-mcp/index.mjs
```

接入后可直接说：「在画布上创建一个文本节点，写上'一只火焰小猫'，连到右边的图像节点」。

### Codex 接入

```bash
codex mcp add huobao-canvas -- node /绝对路径/apps/agent-mcp/index.mjs
```

## 工具集

`canvas_get_state` / `canvas_create_node` / `canvas_update_node` / `canvas_delete_node` / `canvas_connect` / `canvas_disconnect` / `canvas_select` / `canvas_set_viewport` / `canvas_run_generation`

协议定义（单一事实源）：`apps/web/src/views/canvas/agent/tools.js`。

## 确认模式

默认自动执行。画布页 localStorage 设 `huobao.canvas.agentApprove = 'manual'` 后，每批 op 在浏览器弹窗逐条确认后才执行。
