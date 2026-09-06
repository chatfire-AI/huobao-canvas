/**
 * 请求统一入口（appFetch）
 *
 * 浏览器：原生 fetch，相对路径走同源反代（dev vite proxy / 生产 nginx）；
 *   指向网关的绝对地址统一回落为同源相对路径（网关不放开浏览器 CORS，
 *   一键接入写入的绝对 baseUrl 必须回落，否则一律 Failed to fetch）。
 * Electron 桌面端：窗口与内嵌 canvas-server 同源（127.0.0.1:<port>），与浏览器同链路；
 *   /api/* 直达服务端，网关/厂商相对路径由 server 的 routes/proxy.js 转发。
 */
import { getGatewayBaseUrl, PUBLIC_API_BASE_URL } from '../config/index.js'

// 网关挂载前缀（与 endpointPath.js 的 MOUNTED_SUBMIT_PREFIXES、vite/nginx/server proxy 反代项对齐）
const GATEWAY_MOUNT_RE = /^\/(v1|v1beta|sys|qwen|volcengine|vidu|minimax|xai|zhipu)\//

/** 网关绝对地址 → 同源相对路径（相对路径与非网关绝对地址原样返回） */
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
 * 统一请求入口：原生 fetch + 网关地址同源回落。
 * 返回标准 fetch Response（ok/status/headers/json/text/blob/body.getReader）。
 */
export const appFetch = (url, options = {}) => fetch(toSameOriginGatewayUrl(url), options)
