/**
 * 运行时配置（单一来源）
 *
 * 优先级：window.__APP_CONFIG__（部署时注入的 config.js）> VITE_* 环境变量 > 默认值。
 * 注意：本文件可能被 Node 脚本直接 import，访问 import.meta.env 需加保护。
 */

const viteEnv = typeof import.meta !== 'undefined' ? import.meta.env : undefined
const appConfig = typeof window !== 'undefined' ? (window.__APP_CONFIG__ || {}) : {}

/** 推理/目录请求基地址：dev 默认空串走同源 vite proxy；prod 默认 ChatFire 公共 API。
 *  注意用 ?? 而非 ||：Docker 部署会显式注入空串（同源走 nginx 反代），空串是有效值。 */
export const PUBLIC_API_BASE_URL = 'https://api.chatfire.site'

export const API_BASE_URL =
  appConfig.apiBaseUrl ??
  viteEnv?.VITE_API_BASE_URL ??
  (viteEnv?.DEV ? '' : PUBLIC_API_BASE_URL)

/** 媒体转存 Provider：'none'（默认，保留厂商原始结果）| 'http'（POST 到自建存储服务） */
export const STORAGE_PROVIDER =
  appConfig.storageProvider || viteEnv?.VITE_STORAGE_PROVIDER || 'none'

const STORAGE_PROVIDER_STORAGE = 'chatfire_canvas_storage_provider'

/** 存储 Provider：用户设置（localStorage）优先于部署默认 */
export const getStorageProvider = () => {
  try {
    return window.localStorage.getItem(STORAGE_PROVIDER_STORAGE) || STORAGE_PROVIDER
  } catch {
    return STORAGE_PROVIDER
  }
}

export const setStorageProvider = (provider) => {
  const value = ['http', 's3'].includes(provider) ? provider : 'none'
  window.localStorage.setItem(STORAGE_PROVIDER_STORAGE, value)
}

// ── 对象存储桶直传配置（BYOS：TOS / COS / S3 兼容，凭证仅存 localStorage）──
const BUCKET_CONFIG_STORAGE = 'chatfire_canvas_bucket_config'

/**
 * 桶配置：{ vendor: 's3'|'cos', endpoint, region, bucket, accessKey, secretKey,
 *           publicBase（自定义访问域名，可空）, pathStyle（MinIO 等路径风格，可空） }
 */
export const getBucketConfig = () => {
  try {
    const raw = window.localStorage.getItem(BUCKET_CONFIG_STORAGE)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const setBucketConfig = (config) => {
  if (!config) {
    window.localStorage.removeItem(BUCKET_CONFIG_STORAGE)
    return
  }
  window.localStorage.setItem(BUCKET_CONFIG_STORAGE, JSON.stringify(config))
}

/** 桶配置是否完整可用（endpoint/bucket/AK/SK 必填；SigV4 的 region 参与签名 scope，COS 的 region 已含在 endpoint 中） */
export const isBucketConfigured = () => {
  const cfg = getBucketConfig()
  if (!cfg) return false
  const base = Boolean(cfg.endpoint?.trim() && cfg.bucket?.trim()
    && cfg.accessKey?.trim() && cfg.secretKey?.trim())
  if (!base) return false
  return cfg.vendor === 'cos' ? true : Boolean(cfg.region?.trim())
}

/** provider = 'http' 时的上传接口地址 */
export const STORAGE_UPLOAD_URL =
  appConfig.storageUploadUrl || viteEnv?.VITE_STORAGE_UPLOAD_URL || '/storage/upload'

/** 云端媒体 URL 判定特征（用于保留期提醒）：域名片段或 Type-A 签名参数 */
export const CLOUD_MEDIA_DOMAIN =
  appConfig.cloudMediaDomain || viteEnv?.VITE_CLOUD_MEDIA_DOMAIN || ''

/** 素材云端保留天数提示 */
export const MEDIA_EXPIRE_DAYS = 7

/** 模型目录模式默认值：'official'（厂商官方直连，默认）| 'gateway'（ChatFire 网关） */
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

/** ChatFire 网关 baseUrl：用户设置（localStorage）优先，默认部署配置 */
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
}
