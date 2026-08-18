/**
 * 媒体转存客户端（可插拔 StorageProvider）
 *
 * - provider = 'none'（默认）：不转存，抛 StorageDisabledError，
 *   上层 persistMediaResults 捕获后保留厂商原始结果（注意临时链接会过期）
 * - provider = 'http'：POST 到 STORAGE_UPLOAD_URL（自建存储服务，
 *   见 apps/storage；请求体/响应与主仓 /sys/storage/upload 契约一致）
 * - provider = 's3'：用户自有对象存储桶直传（TOS / COS / S3 兼容），
 *   预签名 PUT，凭证仅存 localStorage；URL 转存在浏览器受厂商 CORS 限制，
 *   桌面端（plugin-http）无此限制
 */
import { getStorageProvider, STORAGE_UPLOAD_URL, getBucketConfig, isBucketConfigured } from '@/config'
import { appFetch } from '@/utils/desktopBridge.js'
import { presignPutUrl, bucketPublicUrl, buildObjectKey, base64ToBytes } from '@/utils/bucketUpload.js'

export class StorageDisabledError extends Error {
  constructor() {
    super('媒体转存未启用（STORAGE_PROVIDER=none）')
    this.name = 'StorageDisabledError'
  }
}

const provider = () => getStorageProvider()
const enabled = () => ['http', 's3'].includes(provider())

// ── provider = http：自建存储服务 ──
const uploadViaService = async (payload) => {
  const resp = await appFetch(STORAGE_UPLOAD_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const body = await resp.json().catch(() => null)
  if (!resp.ok || (body && body.code !== undefined && body.code !== 200)) {
    throw new Error(body?.message || `媒体转存失败(${resp.status})`)
  }
  return body?.data !== undefined ? body.data : body
}

// ── provider = s3：桶直传（预签名 PUT）──
const putToBucket = async (bytes, mimeType) => {
  const config = getBucketConfig()
  if (!isBucketConfigured()) {
    throw new Error('对象存储桶未配置完整，请到设置页补充 Endpoint / Bucket / AK / SK')
  }
  const key = await buildObjectKey(bytes, mimeType)
  const url = await presignPutUrl(config, key)
  const resp = await appFetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': mimeType },
    body: bytes,
  })
  if (!resp.ok) {
    const detail = (await resp.text().catch(() => '')).slice(0, 200)
    throw new Error(`桶上传失败(${resp.status})${detail ? `：${detail}` : ''}`)
  }
  return { url: bucketPublicUrl(config, key), expireDays: null }
}

const uploadToStorage = async ({ data, mimeType, url }) => {
  if (!enabled()) throw new StorageDisabledError()
  if (provider() === 'http') {
    return data !== undefined ? uploadViaService({ data, mimeType }) : uploadViaService({ url })
  }
  // provider = s3
  if (data !== undefined) return putToBucket(base64ToBytes(data), mimeType || 'image/png')
  // URL 转存：浏览器直连受厂商 CORS 限制（桌面端 plugin-http 无此限制），失败由上层降级保留原链接
  const resp = await appFetch(url)
  if (!resp.ok) throw new Error(`厂商素材下载失败(${resp.status})`)
  const contentType = (resp.headers.get('content-type') || '').split(';')[0].trim() || 'image/png'
  const bytes = new Uint8Array(await resp.arrayBuffer())
  return putToBucket(bytes, contentType)
}

/** base64 直传（http provider ≤30MB；s3 provider 无硬限制） */
export const uploadMediaBase64 = (data, mimeType) => uploadToStorage({ data, mimeType })

/** 厂商临时 URL 转存（http provider 服务端下载 ≤100MB；s3 provider 浏览器/桌面端下载） */
export const uploadMediaUrl = (url) => uploadToStorage({ url })
