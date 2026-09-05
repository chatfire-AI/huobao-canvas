import { ref } from 'vue'
import Dexie from 'dexie'

const DB_NAME = 'huobao-canvas-gallery'
// v2.0 独立前与 chatfire-gateway 平台共用的旧库名，仅用于一次性数据迁移（勿删除旧库）
const LEGACY_DB_NAME = 'playground_gallery'
const MAX_ITEMS = 200
// 参数快照中过长的字符串（输入 base64 图片等）不入库，避免膨胀
const MAX_PARAM_STRING = 300

const db = new Dexie(DB_NAME)
db.version(1).stores({
  media_items: 'id, type, modelName, createdAt',
})

// 一次性迁移：旧库（与 gateway 平台共用名）中的画廊记录拷贝到新库，仅当新库为空时执行
let legacyMigrationPromise = null
const migrateLegacyDatabase = () => {
  legacyMigrationPromise ||= (async () => {
    try {
      if (!(await Dexie.exists(LEGACY_DB_NAME))) return
      if ((await db.media_items.count()) > 0) return
      const legacy = new Dexie(LEGACY_DB_NAME)
      legacy.version(1).stores({ media_items: 'id, type, modelName, createdAt' })
      const items = await legacy.media_items.toArray()
      legacy.close()
      if (items.length) await db.media_items.bulkPut(items)
    } catch (error) {
      console.warn('[gallery] 旧库数据迁移跳过：', error)
    }
  })()
  return legacyMigrationPromise
}

const nowIso = () => new Date().toISOString()

function createId() {
  return `media_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function base64ToBlob(base64, mimeType = 'image/png') {
  const byteString = atob(base64)
  const bytes = new Uint8Array(byteString.length)
  for (let i = 0; i < byteString.length; i += 1) {
    bytes[i] = byteString.charCodeAt(i)
  }
  return new Blob([bytes], { type: mimeType })
}

function parseDataUrl(dataUrl) {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl)
  if (!match) return null
  return { mimeType: match[1] || 'image/png', isBase64: !!match[2], data: match[3] }
}

// 提取媒体来源，形态对齐 ResultPanel.vue 的 itemUrl 规则
function extractMediaSource(item) {
  if (!item) return null
  if (typeof item === 'string') {
    if (item.startsWith('data:')) {
      const parsed = parseDataUrl(item)
      return parsed?.isBase64 ? { kind: 'base64', data: parsed.data, mimeType: parsed.mimeType } : null
    }
    return { kind: 'url', url: item }
  }
  if (item.type === 'image' && item.data) return { kind: 'base64', data: item.data, mimeType: item.mime_type || 'image/png' }
  if (item.type === 'video' && item.uri) return { kind: 'url', url: item.uri }
  if (item.type === 'audio' && item.uri) return { kind: 'url', url: item.uri }
  if (item.b64_json) return { kind: 'base64', data: item.b64_json, mimeType: 'image/png' }
  if (item.b64Json) return { kind: 'base64', data: item.b64Json, mimeType: 'image/png' }
  if (item.inline_data?.data) return { kind: 'base64', data: item.inline_data.data, mimeType: item.inline_data.mime_type || 'image/png' }
  if (item.inlineData?.data) return { kind: 'base64', data: item.inlineData.data, mimeType: item.inlineData.mimeType || 'image/png' }
  const url = item.url || item.image || item.uri || item.video_url || item.audio_url || item.output_url
  if (url) {
    if (typeof url === 'string' && url.startsWith('data:')) {
      const parsed = parseDataUrl(url)
      return parsed?.isBase64 ? { kind: 'base64', data: parsed.data, mimeType: parsed.mimeType } : null
    }
    return { kind: 'url', url }
  }
  return null
}

// 上游 URL 会过期且可能跨域，抓取失败时仅保留链接并标记
async function fetchUrlBlob(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.blob()
}

function sanitizeParams(params, depth = 0) {
  if (params == null || depth > 4) return null
  if (params instanceof File || params instanceof Blob) return '[file omitted]'
  if (typeof params === 'string') {
    if (params.length > MAX_PARAM_STRING) {
      return params.startsWith('data:') ? '[base64 omitted]' : `${params.slice(0, MAX_PARAM_STRING)}...`
    }
    return params
  }
  if (Array.isArray(params)) return params.slice(0, 10).map((item) => sanitizeParams(item, depth + 1))
  if (typeof params === 'object') {
    const result = {}
    for (const [key, value] of Object.entries(params)) {
      result[key] = sanitizeParams(value, depth + 1)
    }
    return result
  }
  return params
}

function extractPrompt(params = {}) {
  const candidates = [params.prompt, params.text, params.message, params.input?.prompt, params.input?.text]
  const found = candidates.find((value) => typeof value === 'string' && value.trim())
  return found ? found.trim().slice(0, 500) : ''
}

async function evictOverflow() {
  const count = await db.media_items.count()
  if (count <= MAX_ITEMS) return
  const overflow = await db.media_items.orderBy('createdAt').limit(count - MAX_ITEMS).primaryKeys()
  await db.media_items.bulkDelete(overflow)
}

export function useMediaGallery() {
  const galleryCount = ref(0)

  async function refreshCount() {
    try {
      galleryCount.value = await db.media_items.count()
    } catch {
      galleryCount.value = 0
    }
  }

  // 运行成功后自动入库；返回 { saved, failed } 数量
  async function saveResults({ items, resultType, modelName, endpoint, params, duration, taskId }) {
    const records = []
    let failed = 0
    for (const item of items || []) {
      const source = extractMediaSource(item)
      if (!source) continue
      let blob = null
      let mimeType = ''
      let sourceUrl = ''
      let fetchFailed = false
      try {
        if (source.kind === 'base64') {
          mimeType = source.mimeType || 'image/png'
          blob = base64ToBlob(source.data, mimeType)
        } else {
          sourceUrl = source.url
          blob = await fetchUrlBlob(source.url)
          mimeType = blob.type || (resultType === 'video' ? 'video/mp4' : resultType === 'audio' ? 'audio/mpeg' : 'image/png')
        }
      } catch {
        // URL 抓取失败（跨域/已过期）：仅保留链接
        if (source.kind === 'url' && sourceUrl) {
          fetchFailed = true
        } else {
          failed += 1
          continue
        }
      }
      records.push({
        id: createId(),
        type: resultType,
        blob,
        mimeType,
        sourceUrl,
        fetchFailed,
        modelName: modelName || '',
        endpoint: endpoint || '',
        params: sanitizeParams(params),
        prompt: extractPrompt(params),
        duration: duration || 0,
        taskId: taskId || '',
        size: blob?.size || 0,
        createdAt: nowIso(),
      })
    }
    if (records.length) {
      await db.media_items.bulkPut(records)
      await evictOverflow()
    }
    await refreshCount()
    return { saved: records.length, failed }
  }

  async function listItems(type = '') {
    await migrateLegacyDatabase()
    const collection = type
      ? await db.media_items.where('type').equals(type).toArray()
      : await db.media_items.toArray()
    return collection.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  }

  async function removeItem(id) {
    await db.media_items.delete(id)
    await refreshCount()
  }

  async function clearItems() {
    await db.media_items.clear()
    await refreshCount()
  }

  refreshCount()

  return {
    galleryCount,
    refreshCount,
    saveResults,
    listItems,
    removeItem,
    clearItems,
  }
}
