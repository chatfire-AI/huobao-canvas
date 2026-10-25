/**
 * Agent 路由：外部 AI（MCP/HTTP 客户端）操控画布的通道。
 *
 * 状态主权在浏览器：画布页推送快照（PUT state），工具调用编译为 op 批次
 * 经 SSE 下发给画布页执行，回执（POST result）完成一次调用。
 * 无画布页连接时工具调用立即返回 503，调用方据此提示用户打开画布。
 */
import { randomUUID } from 'node:crypto'
import { HttpError, readJson, sendJson } from '../http.js'
import {
  AGENT_PROTOCOL_VERSION,
  AGENT_TOOLS,
  compileToolToOps,
  getAgentTool,
} from '../../../web/src/views/canvas/agent/tools.js'

const TOOL_TIMEOUT_MS = 60_000

export function agentRoutes() {
  let latestState = null // 浏览器推送的画布快照（内存缓存，重启即空——浏览器会重推）
  let stateUpdatedAt = 0
  const sseClients = new Set() // res 对象
  const pending = new Map() // requestId → { resolve, timer }

  const broadcast = (payload) => {
    const frame = `data: ${JSON.stringify(payload)}\n\n`
    for (const res of sseClients) {
      try { res.write(frame) } catch { sseClients.delete(res) }
    }
  }

  const runTool = (tool, args) => new Promise((resolve, reject) => {
    const ops = compileToolToOps(tool, args)
    if (!sseClients.size) {
      throw new HttpError(503, '没有已连接的画布页面——请先在浏览器/桌面端打开画布')
    }
    const requestId = randomUUID()
    const timer = setTimeout(() => {
      pending.delete(requestId)
      reject(new HttpError(504, '画布页执行超时（60s）'))
    }, TOOL_TIMEOUT_MS)
    pending.set(requestId, { resolve, timer })
    broadcast({ type: 'ops', requestId, tool, ops })
  })

  return [
    {
      // 画布页推送快照（节流由前端控制）
      method: 'PUT',
      pattern: /^\/api\/agent\/state\/?$/,
      async handler(req, res) {
        const body = await readJson(req)
        latestState = {
          nodes: Array.isArray(body?.nodes) ? body.nodes : [],
          edges: Array.isArray(body?.edges) ? body.edges : [],
          viewport: body?.viewport || null,
          selectedNodeId: body?.selectedNodeId || '',
          projectId: body?.projectId || '',
        }
        stateUpdatedAt = Date.now()
        sendJson(res, 200, { ok: true })
      },
    },
    {
      method: 'GET',
      pattern: /^\/api\/agent\/state\/?$/,
      async handler(req, res) {
        if (!latestState) throw new HttpError(404, '画布尚未推送过快照——请先打开画布页')
        sendJson(res, 200, { ...latestState, stateUpdatedAt })
      },
    },
    {
      // 画布页 SSE 长连接（op 下发通道）
      method: 'GET',
      pattern: /^\/api\/agent\/events\/?$/,
      async handler(req, res) {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        })
        res.write(`data: ${JSON.stringify({ type: 'hello', protocolVersion: AGENT_PROTOCOL_VERSION })}\n\n`)
        sseClients.add(res)
        const heartbeat = setInterval(() => {
          try { res.write(': hb\n\n') } catch { /* 连接关闭时由 close 事件清理 */ }
        }, 25_000)
        req.on('close', () => {
          clearInterval(heartbeat)
          sseClients.delete(res)
        })
      },
    },
    {
      method: 'GET',
      pattern: /^\/api\/agent\/tools\/?$/,
      async handler(req, res) {
        sendJson(res, 200, {
          protocolVersion: AGENT_PROTOCOL_VERSION,
          connected: sseClients.size > 0,
          tools: AGENT_TOOLS,
        })
      },
    },
    {
      method: 'POST',
      pattern: /^\/api\/agent\/tools\/?$/,
      async handler(req, res) {
        const body = await readJson(req)
        const tool = String(body?.tool || '')
        if (tool === 'canvas_get_state') {
          if (!latestState) throw new HttpError(404, '画布尚未推送过快照——请先打开画布页')
          sendJson(res, 200, { ok: true, result: { ...latestState, stateUpdatedAt } })
          return
        }
        if (!getAgentTool(tool)) throw new HttpError(400, `未知工具：${tool}`)
        try {
          const result = await runTool(tool, body?.args || {})
          sendJson(res, 200, { ok: true, result })
        } catch (error) {
          if (error instanceof HttpError) throw error
          throw new HttpError(400, error?.message || '工具执行失败')
        }
      },
    },
    {
      // 画布页执行回执
      method: 'POST',
      pattern: /^\/api\/agent\/result\/?$/,
      async handler(req, res) {
        const body = await readJson(req)
        const entry = pending.get(body?.requestId)
        if (!entry) throw new HttpError(404, 'requestId 不存在或已超时')
        clearTimeout(entry.timer)
        pending.delete(body.requestId)
        entry.resolve({
          applied: body?.applied ?? null,
          error: body?.error || null,
        })
        sendJson(res, 200, { ok: true })
      },
    },
  ]
}
