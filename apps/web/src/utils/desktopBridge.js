/**
 * 桌面端（Tauri）请求桥接
 *
 * 浏览器：原生 fetch，相对路径走同源反代（dev vite proxy / 生产 nginx）；
 *   指向网关的绝对地址统一回落为同源相对路径（网关不放开浏览器 CORS）。
 * 桌面端：没有同源反代层，相对路径在此解析为绝对地址后经 plugin-http 直连：
 *   /official/{providerId}/... → 厂商官方 baseUrl（读 config/providers 预设）
 *   /v1/*、/v1beta/*、/sys/* 等  → 网关地址（用户覆盖 > 内置公共网关）
 * Origin 头统一覆写为目标自身 origin：等价于服务端直连语义（同 curl），
 * 规避严格 CORS 网关对非白名单 Origin 的 403（tauri-plugin-http 需开 unsafe-headers）。
 */
import { getGatewayBaseUrl, PUBLIC_API_BASE_URL } from '../config/index.js'
import { getProvider } from '../config/providers/index.js'

export const isDesktop = () =>
  typeof window !== 'undefined' && !!window.__TAURI__?.http?.fetch

// 网关挂载前缀（与 endpointPath.js 的 MOUNTED_SUBMIT_PREFIXES、vite/nginx 反代项对齐）
const GATEWAY_MOUNT_RE = /^\/(v1|v1beta|sys|qwen|volcengine|vidu|minimax|xai|zhipu)\//

/** 相对路径 → 绝对地址（仅桌面端需要；已是绝对地址则原样返回） */
export const resolveDesktopUrl = (url) => {
  if (typeof url !== 'string' || /^https?:\/\//.test(url)) return url
  const official = url.match(/^\/official\/([a-z0-9-]+)(\/.*)?$/i)
  if (official) {
    const provider = getProvider(official[1])
    return provider ? `${provider.baseUrl}${official[2] || ''}` : url
  }
  if (GATEWAY_MOUNT_RE.test(url)) {
    const gateway = getGatewayBaseUrl() || PUBLIC_API_BASE_URL
    return `${String(gateway).replace(/\/$/, '')}${url}`
  }
  return url
}

/**
 * 浏览器环境：网关绝对地址 → 同源相对路径（走 vite proxy / nginx 反代）。
 * 公共网关不放开浏览器跨域（无 Access-Control-Allow-Origin），
 * 一键接入写入的绝对 baseUrl 必须回落到同源反代，否则一律 Failed to fetch。
 */
const toSameOriginGatewayUrl = (url) => {
  if (typeof url !== 'string' || !/^https?:\/\//.test(url)) return url
  for (const base of [getGatewayBaseUrl(), PUBLIC_API_BASE_URL]) {
    const b = String(base || '').replace(/\/$/, '')
    if (!b || !url.startsWith(`${b}/`)) continue
    const path = url.slice(b.length)
    if (GATEWAY_MOUNT_RE.test(path)) return path
  }
  return url
}

/**
 * 统一请求入口：浏览器原生 fetch / 桌面端 plugin-http。
 * 返回的 Response 接口两端对齐（ok/status/headers/json/text/blob/body.getReader）。
 */
export const appFetch = (url, options = {}) => {
  if (!isDesktop()) return fetch(toSameOriginGatewayUrl(url), options)
  const http = window.__TAURI__.http
  const abs = resolveDesktopUrl(url)
  const headers = { ...(options.headers || {}) }
  if (/^https?:\/\//.test(abs)) {
    // Origin 覆写为目标自身：对严格 CORS 网关（api.chatfire.site）视为白名单内调用
    headers.Origin = new URL(abs).origin
  }
  let body = options.body
  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    body = http.Body.form(body)
  }
  return http.fetch(abs, {
    method: options.method || 'GET',
    headers,
    body,
    signal: options.signal,
  })
}
