import { uploadMediaBase64, uploadMediaUrl } from '@/api/storage'
import { getStorageProvider, CLOUD_MEDIA_DOMAIN, MEDIA_EXPIRE_DAYS } from '@/config'

export { MEDIA_EXPIRE_DAYS }

/** 把 parsedResults 项规范化为可展示 URL：字符串直出、{b64_json} 转 data URL、对象取 url 类字段 */
export const toMediaDisplayUrl = (item) => {
  if (!item) return ''
  if (typeof item === 'string') return item
  if (typeof item === 'object') {
    if (item.b64_json) return `data:${item.mimeType || 'image/png'};base64,${item.b64_json}`
    return item.url || item.image_url || item.imageUrl || item.uri || ''
  }
  return ''
}

/** 判断是否为已转存到云端的素材 URL（用于界面保留期提醒）。
 *  匹配配置的 CDN 域名或 Type-A 签名参数(?sign=时间戳-rand-uid-md5)。 */
export const isCloudMediaUrl = (url) =>
  typeof url === 'string' && ((CLOUD_MEDIA_DOMAIN && url.includes(CLOUD_MEDIA_DOMAIN))
    || /[?&]sign=\d+-\d+-\d+-[0-9a-f]{32}/.test(url))

const MEDIA_TYPES = new Set(['image', 'video', 'audio'])

const defaultMime = (resultType) => {
  if (resultType === 'video') return 'video/mp4'
  if (resultType === 'audio') return 'audio/mpeg'
  return 'image/png'
}

/**
 * 媒体结果转存：parsedResults 统一转成云端 URL。
 * - provider = 'none'（默认）：直接返回原值，不做任何网络请求
 * - {b64_json} → 上传 base64
 * - 厂商 http(s) URL(字符串或对象 url 字段) → 服务端下载转存(厂商临时链接会过期/需鉴权)
 * - 已是云端 CDN 的结果跳过;失败保留原值,不阻断生成结果展示。
 * 返回 { results, persisted }：persisted 表示是否有项转存成功（供界面提示保留期）。
 */
export const persistMediaResults = async (parsedResults, resultType) => {
  if (getStorageProvider() === 'none') {
    return { results: parsedResults, persisted: false }
  }
  if (!MEDIA_TYPES.has(resultType) || !Array.isArray(parsedResults) || !parsedResults.length) {
    return { results: parsedResults, persisted: false }
  }
  let persisted = false

  const rehostUrl = async (url) => {
    try {
      const res = await uploadMediaUrl(url)
      if (res?.url) {
        persisted = true
        return res.url
      }
    } catch (error) {
      console.warn('厂商素材转存失败,保留原始链接(厂商侧可能过期):', error)
    }
    return url
  }

  const results = await Promise.all(parsedResults.map(async (item) => {
    // base64 结果
    if (item && typeof item === 'object' && typeof item.b64_json === 'string' && item.b64_json.trim()) {
      try {
        const res = await uploadMediaBase64(item.b64_json, item.mimeType || defaultMime(resultType))
        if (res?.url) {
          persisted = true
          return res.url
        }
      } catch (error) {
        console.warn('素材转存失败,保留 base64 结果(刷新后失效):', error)
      }
      return item
    }
    // 字符串形式的厂商 URL
    if (typeof item === 'string' && /^https?:\/\//.test(item) && !isCloudMediaUrl(item)) {
      return rehostUrl(item)
    }
    // 对象形式的厂商 URL(保留对象形状,只替换 url 字段值)
    if (item && typeof item === 'object') {
      const url = item.url || item.image_url || item.video_url || item.output_url
      if (typeof url === 'string' && /^https?:\/\//.test(url) && !isCloudMediaUrl(url)) {
        return rehostUrl(url)
      }
    }
    return item
  }))
  return { results, persisted }
}
