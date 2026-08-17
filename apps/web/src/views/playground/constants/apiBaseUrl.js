/**
 * API 基础地址（单一来源：@/config）
 *
 * 本文件保留独立实现（不 import '@/config'），以便 Node 校验脚本可直接 import
 * 而不依赖 vite alias。逻辑需与 @/config 保持一致：
 *   - dev：空串走同源，由 vite proxy 转发（VITE_UPSTREAM 控制目标）
 *   - prod：ChatFire 公共 API（可用 VITE_API_BASE_URL 或 window.__APP_CONFIG__ 覆盖）
 */
export const PUBLIC_API_BASE_URL = 'https://api.chatfire.site'

const viteEnv = typeof import.meta !== 'undefined' ? import.meta.env : undefined
const appConfig = typeof window !== 'undefined' ? (window.__APP_CONFIG__ || {}) : {}

export const DEFAULT_API_BASE_URL =
  appConfig.apiBaseUrl ??
  viteEnv?.VITE_API_BASE_URL ??
  (viteEnv?.DEV ? '' : PUBLIC_API_BASE_URL)
