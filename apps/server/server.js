/**
 * 画布存储服务（零依赖 Node + 内置 node:sqlite，需 Node >= 22.13）
 *
 * 画布项目/图数据直接落服务端 SQLite：任何浏览器打开同一部署即同一份数据，
 * 不依赖单浏览器 IndexedDB。定位为自部署自用（与 web 同域反代），无鉴权。
 *
 * 接口（均为 /api 前缀，JSON 出入）：
 *   GET    /api/healthz                 存活探测（前端据此决定 服务端 / IndexedDB 兜底）
 *   GET    /api/projects                项目列表（含 nodeCount，按 updatedAt 倒序）
 *   POST   /api/projects                新建/覆盖项目 { id, name, createdAt, updatedAt }
 *   GET    /api/projects/:id            单个项目
 *   PUT    /api/projects/:id            局部更新 { name?, updatedAt? }
 *   DELETE /api/projects/:id            删除项目及其图
 *   GET    /api/graphs/:projectId       图快照（整个 JSON 记录）
 *   PUT    /api/graphs/:projectId       保存图快照（整体覆盖，客户端权威）
 */
import http from 'node:http'
import { mkdirSync, createReadStream, statSync } from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { createRunEngine } from './engine.js'

const PORT = Number(process.env.PORT || 16812)
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data')
const BODY_LIMIT = 25 * 1024 * 1024 // 图快照含 base64 结果，放宽到 25MB

mkdirSync(DATA_DIR, { recursive: true })
const db = new DatabaseSync(path.join(DATA_DIR, 'canvas.db'))
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    createdAt TEXT,
    updatedAt TEXT
  );
  CREATE TABLE IF NOT EXISTS graphs (
    projectId TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    updatedAt TEXT
  );
  CREATE TABLE IF NOT EXISTS settings (
    name TEXT PRIMARY KEY,
    value TEXT
  );
  CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    projectId TEXT,
    nodeId TEXT,
    model TEXT,
    endpointPath TEXT,
    formData TEXT,
    status TEXT,
    taskLink TEXT,
    result TEXT,
    parsedResults TEXT,
    error TEXT,
    createdAt TEXT,
    updatedAt TEXT,
    finishedAt TEXT
  );
`)

const q = {
  listProjects: db.prepare('SELECT id, name, createdAt, updatedAt FROM projects ORDER BY updatedAt DESC'),
  getProject: db.prepare('SELECT id, name, createdAt, updatedAt FROM projects WHERE id = ?'),
  putProject: db.prepare(`INSERT INTO projects (id, name, createdAt, updatedAt) VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name = excluded.name, createdAt = excluded.createdAt, updatedAt = excluded.updatedAt`),
  patchProject: db.prepare('UPDATE projects SET name = COALESCE(?, name), updatedAt = COALESCE(?, updatedAt) WHERE id = ?'),
  deleteProject: db.prepare('DELETE FROM projects WHERE id = ?'),
  getGraph: db.prepare('SELECT data FROM graphs WHERE projectId = ?'),
  putGraph: db.prepare(`INSERT INTO graphs (projectId, data, updatedAt) VALUES (?, ?, ?)
    ON CONFLICT(projectId) DO UPDATE SET data = excluded.data, updatedAt = excluded.updatedAt`),
  deleteGraph: db.prepare('DELETE FROM graphs WHERE projectId = ?'),
  graphNodeCounts: db.prepare('SELECT projectId, data FROM graphs'),
  listSettings: db.prepare('SELECT name, value FROM settings'),
  getSetting: db.prepare('SELECT value FROM settings WHERE name = ?'),
  putSetting: db.prepare(`INSERT INTO settings (name, value) VALUES (?, ?)
    ON CONFLICT(name) DO UPDATE SET value = excluded.value`),
}

// 运行引擎（依赖上面的表已建好；Key 后端注入 settings 表）
const engine = createRunEngine({ db, dataDir: DATA_DIR })

const sendJson = (res, status, payload) => {
  const body = JSON.stringify(payload ?? {})
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  })
  res.end(body)
}

const readBody = (req) => new Promise((resolve, reject) => {
  const chunks = []
  let size = 0
  req.on('data', (chunk) => {
    size += chunk.length
    if (size > BODY_LIMIT) {
      reject(new Error('请求体超过 25MB 上限'))
      req.destroy()
      return
    }
    chunks.push(chunk)
  })
  req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
  req.on('error', reject)
})

const readJson = async (req) => {
  const raw = await readBody(req)
  if (!raw) return {}
  return JSON.parse(raw)
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const { pathname } = url
  try {
    if (req.method === 'OPTIONS') return sendJson(res, 204, null)
    if (req.method === 'GET' && pathname === '/api/healthz') return sendJson(res, 200, { ok: true })

    // ── 设置（API Key / baseUrl / 网关地址）：整块 JSON 存取 ──
    if (req.method === 'GET' && pathname === '/api/settings') {
      const settings = Object.fromEntries(q.listSettings.all().map((row) => {
        try { return [row.name, JSON.parse(row.value)] } catch { return [row.name, row.value] }
      }))
      return sendJson(res, 200, settings)
    }
    if (req.method === 'PUT' && pathname === '/api/settings') {
      const body = await readJson(req)
      if (typeof body !== 'object' || body === null || Array.isArray(body)) {
        return sendJson(res, 400, { message: 'settings 必须是 { name: value } 对象' })
      }
      const tr = db.prepare('BEGIN')
      try {
        tr.run()
        for (const [name, value] of Object.entries(body)) {
          if (!name) continue
          q.putSetting.run(String(name), JSON.stringify(value ?? ''))
        }
        db.prepare('COMMIT').run()
      } catch (e) {
        db.prepare('ROLLBACK').run()
        throw e
      }
      return sendJson(res, 200, { ok: true })
    }

    if (req.method === 'GET' && pathname === '/api/projects') {
      const counts = new Map()
      for (const row of q.graphNodeCounts.all()) {
        try {
          counts.set(row.projectId, JSON.parse(row.data)?.nodes?.length || 0)
        } catch { counts.set(row.projectId, 0) }
      }
      const projects = q.listProjects.all().map((p) => ({ ...p, nodeCount: counts.get(p.id) || 0 }))
      return sendJson(res, 200, projects)
    }

    if (req.method === 'POST' && pathname === '/api/projects') {
      const body = await readJson(req)
      if (!body.id || !body.name) return sendJson(res, 400, { message: '缺少 id / name' })
      const ts = new Date().toISOString()
      q.putProject.run(String(body.id), String(body.name), String(body.createdAt || ts), String(body.updatedAt || ts))
      return sendJson(res, 200, q.getProject.get(String(body.id)))
    }

    const projectMatch = pathname.match(/^\/api\/projects\/([^/]+)$/)
    if (projectMatch) {
      const id = decodeURIComponent(projectMatch[1])
      if (req.method === 'GET') {
        const project = q.getProject.get(id)
        return project ? sendJson(res, 200, project) : sendJson(res, 404, { message: '画布不存在' })
      }
      if (req.method === 'PUT') {
        const body = await readJson(req)
        q.patchProject.run(body.name != null ? String(body.name) : null,
          body.updatedAt != null ? String(body.updatedAt) : null, id)
        const project = q.getProject.get(id)
        return project ? sendJson(res, 200, project) : sendJson(res, 404, { message: '画布不存在' })
      }
      if (req.method === 'DELETE') {
        q.deleteProject.run(id)
        q.deleteGraph.run(id)
        return sendJson(res, 200, { ok: true })
      }
    }

    // ── 运行队列（全量服务端执行；浏览器提交后轮询，刷新不丢）──
    if (req.method === 'POST' && pathname === '/api/runs') {
      const body = await readJson(req)
      if (!body.model || !body.endpointPath) return sendJson(res, 400, { message: '缺少 model / endpointPath' })
      const runId = await engine.submitRun(body)
      return sendJson(res, 202, { runId })
    }
    if (req.method === 'GET' && pathname === '/api/runs') {
      const active = url.searchParams.get('active') === '1'
      const rows = active ? engine.listActiveRuns() : []
      return sendJson(res, 200, rows)
    }
    const runMatch = pathname.match(/^\/api\/runs\/([^/]+)$/)
    if (runMatch) {
      const id = decodeURIComponent(runMatch[1])
      if (req.method === 'GET') {
        const run = engine.getRun(id)
        if (!run) return sendJson(res, 404, { message: '运行不存在' })
        let parsedResults = null
        let unavailableReason = ''
        try {
          const parsed = JSON.parse(run.parsedResults || 'null')
          parsedResults = parsed?.parsedResults ?? null
          unavailableReason = parsed?.unavailableReason || ''
        } catch {}
        let result = null
        try { result = JSON.parse(run.result || 'null') } catch {}
        return sendJson(res, 200, {
          id: run.id, projectId: run.projectId, nodeId: run.nodeId,
          status: run.status, result, parsedResults, unavailableReason,
          error: run.error || '', createdAt: run.createdAt, updatedAt: run.updatedAt,
        })
      }
      if (req.method === 'DELETE') {
        return sendJson(res, 200, { ok: engine.cancelRun(id) })
      }
    }

    // ── 结果文件（Veo 鉴权视频 / b64 落盘；同源经 nginx/vite 反代）──
    const fileMatch = pathname.match(/^\/api\/files\/([A-Za-z0-9._-]+)$/)
    if (fileMatch && req.method === 'GET') {
      const name = fileMatch[1]
      const filePath = path.join(engine.filesDir, name)
      if (!filePath.startsWith(engine.filesDir) || !statSync(filePath, { throwIfNoEntry: false })?.isFile()) {
        return sendJson(res, 404, { message: '文件不存在' })
      }
      const ext = path.extname(name).slice(1).toLowerCase()
      const mime = ({ png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', mp4: 'video/mp4', bin: 'application/octet-stream' })[ext] || 'application/octet-stream'
      res.writeHead(200, {
        'Content-Type': mime,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=604800',
      })
      createReadStream(filePath).pipe(res)
      return
    }

    // ── 厂商连通测试（服务端代发，Key 用 settings 里的）──
    const testMatch = pathname.match(/^\/api\/providers\/([a-z0-9-]+)\/test$/)
    if (testMatch && req.method === 'POST') {
      return sendJson(res, 200, await engine.testProvider(decodeURIComponent(testMatch[1])))
    }

    const graphMatch = pathname.match(/^\/api\/graphs\/([^/]+)$/)
    if (graphMatch) {
      const projectId = decodeURIComponent(graphMatch[1])
      if (req.method === 'GET') {
        const row = q.getGraph.get(projectId)
        if (!row) return sendJson(res, 404, { message: '图不存在' })
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
        })
        return res.end(row.data)
      }
      if (req.method === 'PUT') {
        const graph = await readJson(req)
        if (typeof graph !== 'object' || graph === null || Array.isArray(graph)) {
          return sendJson(res, 400, { message: '图快照必须是 JSON 对象' })
        }
        q.putGraph.run(projectId, JSON.stringify({ ...graph, projectId }), String(graph.updatedAt || new Date().toISOString()))
        return sendJson(res, 200, { ok: true })
      }
    }

    return sendJson(res, 404, { message: 'Not Found' })
  } catch (error) {
    console.error('[canvas-server]', req.method, pathname, error)
    return sendJson(res, 500, { message: error?.message || '服务器内部错误' })
  }
})

server.listen(PORT, () => {
  console.log(`[canvas-server] listening on :${PORT}, data: ${path.join(DATA_DIR, 'canvas.db')}`)
})
