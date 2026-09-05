/**
 * 运行队列路由：runs（全量服务端执行的模型调用）+ 厂商连通测试
 */
import { sendJson, readJson, HttpError } from '../http.js'

export function runsRoutes({ engine }) {
  return [
    {
      method: 'GET',
      pattern: /^\/api\/catalog$/,
      async handler(req, res) {
        sendJson(res, 200, engine.getCatalog())
      },
    },
    {
      method: 'POST',
      pattern: /^\/api\/runs$/,
      async handler(req, res) {
        const body = await readJson(req)
        if (!body.model || !body.endpointPath) throw new HttpError(400, '缺少 model / endpointPath')
        const runId = await engine.submitRun(body)
        sendJson(res, 202, { runId })
      },
    },
    {
      method: 'GET',
      pattern: /^\/api\/runs$/,
      async handler(req, res, { query }) {
        const rows = query.get('active') === '1' ? engine.listActiveRuns() : []
        sendJson(res, 200, rows)
      },
    },
    {
      method: 'GET',
      pattern: /^\/api\/runs\/([^/]+)$/,
      async handler(req, res, { params: [id] }) {
        const run = engine.getRun(id)
        if (!run) throw new HttpError(404, '运行不存在')
        sendJson(res, 200, engine.presentRun(run))
      },
    },
    {
      method: 'DELETE',
      pattern: /^\/api\/runs\/([^/]+)$/,
      async handler(req, res, { params: [id] }) {
        sendJson(res, 200, { ok: engine.cancelRun(id) })
      },
    },
    {
      method: 'POST',
      pattern: /^\/api\/providers\/([a-z0-9-]+)\/test$/,
      async handler(req, res, { params: [providerId] }) {
        sendJson(res, 200, await engine.testProvider(providerId))
      },
    },
  ]
}
