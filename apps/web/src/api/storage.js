/**
 * 媒体转存客户端（可插拔 StorageProvider）
 *
 * - provider = 'none'（默认）：不转存，抛 StorageDisabledError，
 *   上层 persistMediaResults 捕获后保留厂商原始结果（注意临时链接会过期）
 * - provider = 'http'：POST 到 STORAGE_UPLOAD_URL（自建存储服务，
 *   见 apps/storage；请求体/响应与主仓 /sys/storage/upload 契约一致）
 */
import { getStorageProvider, STORAGE_UPLOAD_URL } from '@/config'

export class StorageDisabledError extends Error {
  constructor() {
    super('媒体转存未启用（STORAGE_PROVIDER=none）')
    this.name = 'StorageDisabledError'
  }
}

const enabled = () => getStorageProvider() === 'http'

const upload = async (payload) => {
  if (!enabled()) throw new StorageDisabledError()
  const resp = await fetch(STORAGE_UPLOAD_URL, {
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

/** base64 直传（≤30MB） */
export const uploadMediaBase64 = (data, mimeType) => upload({ data, mimeType })

/** 厂商临时 URL 转存（服务端下载再存，≤100MB） */
export const uploadMediaUrl = (url) => upload({ url })
