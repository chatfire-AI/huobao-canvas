/**
 * 火宝画布服务端入口：http 服务 + 路由表装配 + 全局错误处理。
 *
 * 模块结构（零 npm 依赖，Node ≥22.13）：
 *   src/http.js      HTTP 基础设施（JSON 响应 / 请求体 / CORS / 路由匹配）
 *   src/db.js        SQLite 连接 + 建表 + 预编译语句
 *   src/engine.js    运行引擎（模型调用执行 + 异步任务轮询 + 结果文件落盘）
 *   src/routes/*     路由：canvas（画布）/ settings（Key 镜像）/ runs（运行队列）/ files（结果文件）
 *
 * 接口文档见 ../README.md。
 */
import http from 'node:http'
import { openDatabase } from './db.js'
import { createRunEngine } from './engine.js'
import { sendJson, sendOptions, matchRoute, HttpError } from './http.js'
import { canvasRoutes } from './routes/canvas.js'
import { settingsRoutes } from './routes/settings.js'
import { runsRoutes } from './routes/runs.js'
import { filesRoutes } from './routes/files.js'

const PORT = Number(process.env.PORT || 16812)
const DATA_DIR = process.env.DATA_DIR || new URL('../data', import.meta.url).pathname

const { db, statements, transaction } = openDatabase({ dataDir: DATA_DIR })
const engine = createRunEngine({ db, statements, transaction, dataDir: DATA_DIR })

const routes = [
  ...canvasRoutes({ statements, transaction }),
  ...settingsRoutes({ statements, transaction }),
  ...runsRoutes({ engine }),
  ...filesRoutes({ engine }),
]

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  try {
    if (req.method === 'OPTIONS') return sendOptions(res)
    if (req.method === 'GET' && url.pathname === '/api/healthz') return sendJson(res, 200, { ok: true })

    const matched = matchRoute(routes, req.method, url.pathname)
    if (!matched) return sendJson(res, 404, { message: 'Not Found' })
    await matched.route.handler(req, res, { params: matched.params, url, query: url.searchParams })
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500
    if (status >= 500) console.error('[canvas-server]', req.method, url.pathname, error)
    sendJson(res, status, { message: error?.message || '服务器内部错误' })
  }
})

server.listen(PORT, () => {
  console.log(`[canvas-server] listening on :${PORT}, data: ${DATA_DIR}`)
})
