/**
 * HTTP 基础设施：统一 JSON 响应 / 请求体读取 / CORS。
 * 零 npm 依赖（node:http 原生），所有路由处理器共用。
 */

export const BODY_LIMIT = 25 * 1024 * 1024 // 图快照含 base64 结果，放宽到 25MB

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export const sendJson = (res, status, payload) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS })
  res.end(JSON.stringify(payload ?? {}))
}

export const sendOptions = (res) => {
  res.writeHead(204, CORS_HEADERS)
  res.end()
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export const readBody = (req, limit = BODY_LIMIT) => new Promise((resolve, reject) => {
  const chunks = []
  let size = 0
  req.on('data', (chunk) => {
    size += chunk.length
    if (size > limit) {
      reject(new HttpError(413, `请求体超过 ${Math.round(limit / 1024 / 1024)}MB 上限`))
      req.destroy()
      return
    }
    chunks.push(chunk)
  })
  req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
  req.on('error', reject)
})

export const readJson = async (req, limit) => {
  const raw = await readBody(req, limit)
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    throw new HttpError(400, '请求体不是合法 JSON')
  }
}

/**
 * 极简路由表：[{ method, pattern, handler }]，pattern 为正则（捕获组作参数）。
 * handler(req, res, { params: [...], url, query })；未命中 → 404。
 */
export const matchRoute = (routes, method, pathname) => {
  for (const route of routes) {
    if (route.method !== method) continue
    const match = pathname.match(route.pattern)
    if (match) return { route, params: match.slice(1).map(decodeURIComponent) }
  }
  return null
}
