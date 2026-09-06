/**
 * 反代路由：镜像 apps/web/nginx.conf 的挂载语义。
 *
 * Docker/Web 部署里这些路径由 nginx / vite dev proxy 先行截走，请求不会到达本服务；
 * Electron 桌面端（内嵌本服务 + 同源 loadURL）没有外层反代，渲染端同源 fetch 的
 * 网关/厂商请求由此转发出去。
 *
 * 纯透传语义：鉴权头由调用方（渲染端）自带；未带鉴权时用服务端 settings 表里的
 * Key 兜底注入（engine.resolveProxyTarget 计算）。
 */
import { Readable } from 'node:stream'
import { HttpError } from '../http.js'

// 与 engine.js GATEWAY_MOUNT_RE / desktopBridge.js 保持一致
const GATEWAY_MOUNT_RE = /^\/(v1|v1beta|sys|qwen|volcengine|vidu|minimax|xai|zhipu)(\/|$)/
const OFFICIAL_RE = /^\/official\/[A-Za-z0-9_-]+(\/|$)/
const PROXY_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']

// 请求侧剥离：hop-by-hop + 长度/编码类（body 以流重发，长度由 undici 重算；
// 不带 accept-encoding 让上游尽量回 identity，省去二次解压问题）。
// origin 必须剥掉（对齐 nginx 反代 proxy_set_header Origin ""）：浏览器同源 POST 自带
// 部署域名 Origin，严格 CORS 校验的上游对非白名单 Origin 直接 403
const STRIP_REQUEST_HEADERS = new Set([
  'host', 'connection', 'content-length', 'accept-encoding', 'keep-alive',
  'transfer-encoding', 'upgrade', 'origin',
])
// 响应侧剥离：undici 已自动解压，原 content-encoding/length 不再成立
const STRIP_RESPONSE_HEADERS = new Set([
  'connection', 'content-encoding', 'content-length', 'transfer-encoding', 'keep-alive',
])

const hasAuthHeader = (headers) => Object.keys(headers).some((key) => (
  key === 'authorization' || key === 'x-api-key' || key === 'api-key'
))

export function proxyRoutes({ engine }) {
  const forward = async (req, res, { url, query }) => {
    const target = engine.resolveProxyTarget(url.pathname)
    if (!target?.url) throw new HttpError(404, '无法解析的转发目标')

    const headers = {}
    for (const [key, value] of Object.entries(req.headers)) {
      if (!STRIP_REQUEST_HEADERS.has(key)) headers[key] = value
    }
    // 渲染端未带鉴权时，用服务端 Key 兜底（浏览器同源场景两者一致；Electron 更稳）
    if (target.auth && !hasAuthHeader(headers)) Object.assign(headers, target.auth)

    const targetUrl = new URL(target.url)
    // 保留原始 query（new URL(req.url) 的 search 原样拼接）
    targetUrl.search = url.search

    const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
    let upstream
    try {
      upstream = await fetch(targetUrl, {
        method: req.method,
        headers,
        body: hasBody ? req : undefined,
        duplex: hasBody ? 'half' : undefined,
        redirect: 'follow',
      })
    } catch (error) {
      throw new HttpError(502, `上游请求失败：${error?.message || error}`)
    }

    const responseHeaders = {}
    upstream.headers.forEach((value, key) => {
      if (!STRIP_RESPONSE_HEADERS.has(key)) responseHeaders[key] = value
    })
    res.writeHead(upstream.status, responseHeaders)
    if (!upstream.body) return res.end()
    Readable.fromWeb(upstream.body).pipe(res)
  }

  return PROXY_METHODS.flatMap((method) => [
    { method, pattern: GATEWAY_MOUNT_RE, handler: forward },
    { method, pattern: OFFICIAL_RE, handler: forward },
  ])
}
