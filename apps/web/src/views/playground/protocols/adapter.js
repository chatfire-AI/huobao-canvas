// 协议适配器基础设施：task 工具 + 媒体结果提取
// 纯函数模块——可被 verify 脚本直接 import，禁止引入 DOM 依赖。

export const MEDIA_RESULT_TYPES = new Set(['image', 'video', 'audio'])

export const RESULT_URL_KEYS = new Set([
  'url', 'image_url', 'imageUrl', 'video_url', 'videoUrl', 'audio_url', 'audioUrl',
  'output_url', 'outputUrl',
  // DashScope 多模态 content[] 部件：{image: url} / {video: url}
  'image', 'video',
])

export const taskError = (message, kind, cause) =>
  Object.assign(new Error(message, cause ? { cause } : undefined), { kind })

export const normalizeTaskId = (value) => (typeof value === 'string' ? value.trim() : '')

export const extractLegacyResults = (result, resultType, outputSchema, getNestedValue) => {
  if (!result) return []
  const defaultField = resultType === 'video' ? 'video_url' : (resultType === 'image' ? 'data' : null)
  const displayField = outputSchema?.displayField || defaultField

  if (!displayField) {
    if (result?.data) return Array.isArray(result.data) ? result.data : [result.data]
    return [result]
  }

  if (displayField.includes('[]')) {
    const [arrayPath, ...rest] = displayField.split('[]')
    const fieldPath = rest.join('[]').replace(/^\./, '')
    let data = arrayPath ? getNestedValue?.(result, arrayPath) : result
    if (!Array.isArray(data)) data = data ? [data] : []
    if (!fieldPath) return data
    return data.flatMap((item) => {
      const value = getNestedValue?.(item, fieldPath)
      return Array.isArray(value) ? value : [value]
    }).filter(Boolean)
  }

  const data = getNestedValue?.(result, displayField)
  return Array.isArray(data) ? data : (data ? [data] : [])
}

const isPublicUrl = (value) => {
  if (typeof value !== 'string' || !value.trim()) return false
  try {
    return ['http:', 'https:', 'blob:'].includes(new URL(value.trim()).protocol)
  } catch {
    return false
  }
}

const MAX_RESULT_DEPTH = 12
const MAX_RESULT_NODES = 1000

export const extractMediaResult = (result, resultType, outputSchema, getNestedValue) => {
  if (!MEDIA_RESULT_TYPES.has(resultType)) {
    return {
      parsedResults: extractLegacyResults(result, resultType, outputSchema, getNestedValue),
      unavailableReason: '',
    }
  }

  const parsedResults = []
  const resultKeys = new Set()
  const seen = new WeakSet()
  let visitedNodes = 0
  let protectedResult = false

  const addResult = (value, key) => {
    const normalized = value.trim()
    const dedupeKey = `${key}:${normalized}`
    if (resultKeys.has(normalized) || resultKeys.has(dedupeKey)) return
    resultKeys.add(normalized)
    resultKeys.add(dedupeKey)
    parsedResults.push(key === 'b64_json' ? { b64_json: normalized } : normalized)
  }

  const visit = (value, depth, parentKey = '') => {
    if (!value || typeof value !== 'object' || depth > MAX_RESULT_DEPTH) return
    if (seen.has(value) || visitedNodes >= MAX_RESULT_NODES) return
    seen.add(value)
    visitedNodes += 1
    for (const key in value) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) continue
      if (visitedNodes >= MAX_RESULT_NODES) break
      visitedNodes += 1
      const child = value[key]
      if (RESULT_URL_KEYS.has(key) && isPublicUrl(child)) {
        addResult(child, 'url')
        continue
      }
      if (key === 'b64_json' && resultType === 'image' && typeof child === 'string' && child.trim()) {
        addResult(child, key)
        continue
      }
      if ((key === 'file_id' && child) || (parentKey === 'video' && key === 'uri' && child)) {
        protectedResult = true
      }
      visit(child, depth + 1, key)
    }
  }

  visit(result, 0)
  return {
    parsedResults,
    unavailableReason: parsedResults.length === 0 && protectedResult
      ? '任务已完成，但结果需要供应商鉴权，当前无法直接预览'
      : '',
  }
}

export const TASK_ID_HEADER = 'X-Chatfire-Task-Id'

export const readTaskIdFromResponse = (response, data) => {
  const header = response?.headers?.get?.(TASK_ID_HEADER)
  if (header !== null && header !== undefined && normalizeTaskId(header) !== '') return normalizeTaskId(header)
  return normalizeTaskId(data?.task_id)
    || normalizeTaskId(data?.id)
    || normalizeTaskId(data?.data?.task_id)
    || normalizeTaskId(data?.output?.task_id)
    || normalizeTaskId(data?.data?.id)
    || normalizeTaskId(data?.request_id)
}

export const hasTaskHeader = (response) => {
  const header = response?.headers?.get?.(TASK_ID_HEADER)
  return header !== null && header !== undefined && header.trim() !== ''
}

export const extractInlineDataImages = (result) => {
  if (!result || typeof result !== 'object') return []
  const images = []
  const seen = new WeakSet()
  const visit = (value) => {
    if (!value || typeof value !== 'object' || seen.has(value)) return
    seen.add(value)
    for (const key in value) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) continue
      const child = value[key]
      if (key === 'inlineData' && child?.data) images.push({ b64_json: child.data })
      // Imagen（:predict）响应形态：predictions[].bytesBase64Encoded
      else if (key === 'bytesBase64Encoded' && typeof child === 'string' && child) images.push({ b64_json: child })
      else visit(child)
    }
  }
  visit(result)
  return images
}
