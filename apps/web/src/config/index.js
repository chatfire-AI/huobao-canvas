/**
 * 运行时配置（单一来源）
 *
 * 优先级：window.__APP_CONFIG__（部署时注入的 config.js）> VITE_* 环境变量 > 默认值。
 * 注意：本文件可能被 Node 脚本直接 import，访问 import.meta.env 需加保护。
 */

const viteEnv = typeof import.meta !== 'undefined' ? import.meta.env : undefined
const appConfig = typeof window !== 'undefined' ? (window.__APP_CONFIG__ || {}) : {}

/** 推理/目录请求基地址：dev 默认空串走同源 vite proxy；prod 默认 Huobao 公共 API。
 *  注意用 ?? 而非 ||：Docker 部署会显式注入空串（同源走 nginx 反代），空串是有效值。 */
export const PUBLIC_API_BASE_URL = 'https://api.firemux.com'

export const API_BASE_URL =
  appConfig.apiBaseUrl ??
  viteEnv?.VITE_API_BASE_URL ??
  (viteEnv?.DEV ? '' : PUBLIC_API_BASE_URL)

/** 模型目录模式默认值：'official'（厂商官方直连，默认）| 'gateway'（Huobao 网关） */
export const DEFAULT_CATALOG_MODE =
  appConfig.catalogMode || viteEnv?.VITE_CATALOG_MODE || 'official'

const CATALOG_MODE_STORAGE = 'chatfire_canvas_catalog_mode'

/** 目录模式：用户设置（localStorage）优先于部署默认 */
export const getCatalogMode = () => {
  try {
    return window.localStorage.getItem(CATALOG_MODE_STORAGE) || DEFAULT_CATALOG_MODE
  } catch {
    return DEFAULT_CATALOG_MODE
  }
}

export const setCatalogMode = (mode) => {
  window.localStorage.setItem(CATALOG_MODE_STORAGE, mode === 'gateway' ? 'gateway' : 'official')
}

const GATEWAY_BASE_STORAGE = 'chatfire_canvas_gateway_base'

/** Huobao 网关 baseUrl：用户设置（localStorage）优先，默认部署配置 */
export const getGatewayBaseUrl = () => {
  try {
    return window.localStorage.getItem(GATEWAY_BASE_STORAGE) || API_BASE_URL
  } catch {
    return API_BASE_URL
  }
}

export const setGatewayBaseUrl = (url) => {
  const value = String(url || '').trim().replace(/\/$/, '')
  if (value) window.localStorage.setItem(GATEWAY_BASE_STORAGE, value)
  else window.localStorage.removeItem(GATEWAY_BASE_STORAGE)
  // 镜像到服务端 settings（服务端执行模式需要网关地址；不可用静默）
  import('../utils/apiKeySession.js').then(({ setGatewayBaseMirror }) => setGatewayBaseMirror(value)).catch(() => {})
}
