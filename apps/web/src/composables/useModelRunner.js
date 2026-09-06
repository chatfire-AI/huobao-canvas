import { useRequestPipeline } from './useRequestPipeline.js'
import { i18n } from '@/locales'

// 调用点求值：切语言后新抛出的错误/提示跟随当前语言
const t = (key, params) => i18n.global.t(key, params)

const SAFE_AUTHORIZATION_HEADER = 'Bearer <API_KEY>'
const SENSITIVE_HEADER_KEYS = ['authorization', 'proxy-authorization', 'x-api-key', 'api-key', 'cookie', 'set-cookie']
const TASK_ID_HEADER = 'X-Chatfire-Task-Id'
const RESULT_URL_KEYS = new Set([
  'url',
  'image_url',
  'imageUrl',
  'video_url',
  'videoUrl',
  'audio_url',
  'audioUrl',
  'output_url',
  'outputUrl',
  // DashScope 多模态 content[] 部件：{image: url} / {video: url}
  'image',
  'video',
])
const MEDIA_RESULT_TYPES = new Set(['image', 'video', 'audio'])
const MAX_RESULT_DEPTH = 12
const MAX_RESULT_NODES = 1000

/**
 * BYOK 鉴权头：直接使用用户填入的 API Key。
 * （开源版无平台登录体系，主仓的 key-id:/JWT 双模式已移除）
 */
export const buildModelRunnerAuthHeaders = (credential) => {
  if (!credential) throw new Error(t('runtime.auth.apiKeyMissing'))
  return { Authorization: `Bearer ${credential}` }
}

export const sanitizeModelRunnerHeaders = (headers = {}) => {
  const result = {}
  for (const [key, value] of Object.entries(headers || {})) {
    const normalizedKey = String(key).toLowerCase()
    result[key] = SENSITIVE_HEADER_KEYS.includes(normalizedKey) ? SAFE_AUTHORIZATION_HEADER : value
  }
  return result
}

const normalizeTaskId = (value) => typeof value === 'string' ? value.trim() : ''

export const extractModelRunnerTaskId = (response, data) => {
  const headerValue = response?.headers?.get?.(TASK_ID_HEADER)
  if (headerValue !== null && headerValue !== undefined) return normalizeTaskId(headerValue)
  return normalizeTaskId(data?.task_id)
    || normalizeTaskId(data?.id)
    || normalizeTaskId(data?.data?.task_id)
}

const isPublicUrl = (value) => {
  if (typeof value !== 'string' || !value.trim()) return false
  try {
    return ['http:', 'https:', 'blob:'].includes(new URL(value.trim()).protocol)
  } catch {
    return false
  }
}

const extractLegacyResults = (result, resultType, outputSchema, getNestedValue) => {
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

export const extractModelRunnerResults = (result, resultType, outputSchema, getNestedValue) => {
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
      // Gemini 原生生图:candidates[].content.parts[].inlineData = { mimeType, data(base64) }
      if ((key === 'inlineData' || key === 'inline_data') && resultType === 'image'
          && child && typeof child === 'object'
          && typeof child.data === 'string' && child.data.trim()) {
        addResult(child.data, 'b64_json')
        continue
      }
      // 中转渠道兜底: text 中 markdown 内嵌 ![image](data:image/...;base64,xxx)
      if (resultType === 'image' && typeof child === 'string' && child.includes('data:image/')) {
        const match = child.match(/data:image\/[a-zA-Z0-9.+-]+;base64,([A-Za-z0-9+/=\r\n]+)/)
        if (match) {
          addResult(match[1].replace(/\s/g, ''), 'b64_json')
          continue
        }
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
      ? t('runtime.runner.protectedResult')
      : '',
  }
}

export const errorMessage = (data, fallback) => {
  if (typeof data?.error === 'string' && data.error.trim()) return data.error
  if (typeof data?.error?.message === 'string' && data.error.message.trim()) return data.error.message
  if (typeof data?.message === 'string' && data.message.trim()) return data.message
  return fallback
}

// 遗留入口：保持既有导出签名不变，内部统一委托请求管线，
// 不再强制 stream:false 或拒绝 STREAM 端点（这些特例已离开活跃链路）。
export function useModelRunner({ getNestedValue, wait }) {
  const { run: runPipeline, resumeTask } = useRequestPipeline({ getNestedValue, wait })

  const runModel = async (params) => {
    const {
      apiKey,
      apiBaseUrl,
      modelData,
      formData,
      selectedEndpoint,
      requestTypeSchema,
      routeQuery = {},
      applyInputTransform,
      inputTransformSchema,
      signal,
      onTaskSubmitted,
      asyncModeSchema,
      outputSchema,
    } = params

    if (!apiKey) throw new Error(t('runtime.auth.apiKeyRequired'))

    // 兼容旧行为：消息体字符串在交给适配器前先解析，保证聊天厂商请求体能被正确构建
    let prepped = formData
    if (prepped && typeof prepped.messages === 'string') {
      try {
        const parsed = JSON.parse(prepped.messages)
        if (Array.isArray(parsed)) prepped = { ...prepped, messages: parsed }
      } catch {}
    }

    // 保留旧 formdata 判定：routeQuery / requestTypeSchema / 端点 contentType 任一触发即强制 multipart
    const endpointContentType = String(selectedEndpoint?.contentType || '').toLowerCase()
    const formDataHint = routeQuery.request_type === 'formdata'
      || requestTypeSchema === 'formdata'
      || ['form', 'form_data', 'form-data'].includes(endpointContentType)

    return runPipeline({
      model: modelData,
      formData: prepped,
      endpoint: selectedEndpoint,
      apiKey,
      apiBaseUrl,
      signal,
      onTaskSubmitted,
      applyInputTransform,
      inputTransformSchema,
      formDataHint,
      outputSchema,
      asyncModeSchema,
    })
  }

  return {
    resumeModelTask: resumeTask,
    runModel,
  }
}
