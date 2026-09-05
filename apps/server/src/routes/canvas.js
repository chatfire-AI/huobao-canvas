/**
 * 画布路由：projects / graphs（整图快照，客户端权威）
 */
import { sendJson, readJson, HttpError } from '../http.js'

export function canvasRoutes({ statements: q, transaction }) {
  return [
    {
      method: 'GET',
      pattern: /^\/api\/projects$/,
      async handler(req, res) {
        const counts = new Map()
        for (const row of q.graphNodeCounts.all()) {
          try { counts.set(row.projectId, JSON.parse(row.data)?.nodes?.length || 0) } catch { counts.set(row.projectId, 0) }
        }
        sendJson(res, 200, q.listProjects.all().map((p) => ({ ...p, nodeCount: counts.get(p.id) || 0 })))
      },
    },
    {
      method: 'POST',
      pattern: /^\/api\/projects$/,
      async handler(req, res) {
        const body = await readJson(req)
        if (!body.id || !body.name) throw new HttpError(400, '缺少 id / name')
        const ts = new Date().toISOString()
        q.putProject.run(String(body.id), String(body.name), String(body.createdAt || ts), String(body.updatedAt || ts))
        sendJson(res, 200, q.getProject.get(String(body.id)))
      },
    },
    {
      method: 'GET',
      pattern: /^\/api\/projects\/([^/]+)$/,
      async handler(req, res, { params: [id] }) {
        const project = q.getProject.get(id)
        if (!project) throw new HttpError(404, '画布不存在')
        sendJson(res, 200, project)
      },
    },
    {
      method: 'PUT',
      pattern: /^\/api\/projects\/([^/]+)$/,
      async handler(req, res, { params: [id] }) {
        const body = await readJson(req)
        q.patchProject.run(
          body.name != null ? String(body.name) : null,
          body.updatedAt != null ? String(body.updatedAt) : null,
          id,
        )
        const project = q.getProject.get(id)
        if (!project) throw new HttpError(404, '画布不存在')
        sendJson(res, 200, project)
      },
    },
    {
      method: 'DELETE',
      pattern: /^\/api\/projects\/([^/]+)$/,
      async handler(req, res, { params: [id] }) {
        transaction(() => {
          q.deleteProject.run(id)
          q.deleteGraph.run(id)
        })
        sendJson(res, 200, { ok: true })
      },
    },
    {
      method: 'GET',
      pattern: /^\/api\/graphs\/([^/]+)$/,
      async handler(req, res, { params: [projectId] }) {
        const row = q.getGraph.get(projectId)
        if (!row) throw new HttpError(404, '图不存在')
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
        })
        res.end(row.data)
      },
    },
    {
      method: 'PUT',
      pattern: /^\/api\/graphs\/([^/]+)$/,
      async handler(req, res, { params: [projectId] }) {
        const graph = await readJson(req)
        if (typeof graph !== 'object' || graph === null || Array.isArray(graph)) {
          throw new HttpError(400, '图快照必须是 JSON 对象')
        }
        q.putGraph.run(projectId, JSON.stringify({ ...graph, projectId }), String(graph.updatedAt || new Date().toISOString()))
        sendJson(res, 200, { ok: true })
      },
    },
  ]
}
