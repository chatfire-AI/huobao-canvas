#!/usr/bin/env node
/**
 * 火宝画布 MCP 桥（零依赖 stdio MCP server）
 *
 * 协议：换行分隔的 JSON-RPC 2.0（MCP stdio 传输）。
 * 工具列表/执行均转发到 canvas-server 的 /api/agent/*——单一事实源在服务端，
 * 浏览器画布页是实际执行者（状态主权在浏览器）。
 *
 * 环境变量：
 *   CANVAS_SERVER_URL  canvas-server 地址，默认 http://127.0.0.1:16812
 *
 * Claude Code 接入示例：
 *   claude mcp add huobao-canvas -- node /path/to/apps/agent-mcp/index.mjs
 */
import readline from 'node:readline'

const SERVER_URL = (process.env.CANVAS_SERVER_URL || 'http://127.0.0.1:16812').replace(/\/$/, '')
const PROTOCOL_VERSION = '2025-06-18'
const SERVER_INFO = { name: 'huobao-canvas', version: '0.1.0' }

// 服务端不可达时的兜底工具表（与 apps/web/src/views/canvas/agent/tools.js 一致）
import { AGENT_TOOLS } from '../web/src/views/canvas/agent/tools.js'

const send = (message) => process.stdout.write(`${JSON.stringify(message)}\n`)

const result = (id, value) => send({ jsonrpc: '2.0', id, result: value })
const error = (id, code, message) => send({ jsonrpc: '2.0', id, error: { code, message } })

const fetchServer = async (path, options) => {
  const resp = await fetch(`${SERVER_URL}${path}`, options)
  const data = await resp.json().catch(() => ({}))
  return { ok: resp.ok, status: resp.status, data }
}

const listTools = async () => {
  try {
    const { ok, data } = await fetchServer('/api/agent/tools')
    if (ok && Array.isArray(data?.tools)) return data.tools
  } catch { /* 服务端未启动时回退内置定义 */ }
  return AGENT_TOOLS
}

const callTool = async (name, args) => {
  try {
    const { ok, status, data } = await fetchServer('/api/agent/tools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: name, args: args || {} }),
    })
    if (!ok) {
      return {
        isError: true,
        content: [{ type: 'text', text: data?.message || `调用失败（HTTP ${status}）` }],
      }
    }
    return { content: [{ type: 'text', text: JSON.stringify(data?.result ?? data, null, 2) }] }
  } catch (e) {
    return {
      isError: true,
      content: [{
        type: 'text',
        text: `无法连接 canvas-server（${SERVER_URL}）：${e?.message}。请先启动火宝画布（Web/Desktop/Docker 任一形态）。`,
      }],
    }
  }
}

const handleRequest = async (message) => {
  const { id, method, params } = message
  switch (method) {
    case 'initialize':
      return result(id, {
        protocolVersion: params?.protocolVersion || PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
      })
    case 'ping':
      return result(id, {})
    case 'tools/list':
      return result(id, { tools: await listTools() })
    case 'tools/call':
      return result(id, await callTool(params?.name, params?.arguments))
    default:
      return error(id, -32601, `Method not found: ${method}`)
  }
}

const rl = readline.createInterface({ input: process.stdin, terminal: false })
rl.on('line', async (line) => {
  const trimmed = line.trim()
  if (!trimmed) return
  let message
  try { message = JSON.parse(trimmed) } catch { return }
  if (!message || typeof message.method !== 'string') return
  if (message.id === undefined || message.id === null) return // 通知（initialized 等）无响应
  try {
    await handleRequest(message)
  } catch (e) {
    error(message.id, -32603, e?.message || 'Internal error')
  }
})

process.stderr.write(`[huobao-canvas-mcp] stdio ready, server: ${SERVER_URL}\n`)
