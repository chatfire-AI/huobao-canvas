import { getEndpointBehavior } from '../constants/index.js'

const parseEndpointList = (value) => {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'string') return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const normalizeProviderEndpoint = (endpoint) => ({
  path: endpoint.publicPath || endpoint.path || '',
  title: endpoint.label || endpoint.endpointType || endpoint.publicPath || '',
  method: endpoint.method || 'POST',
  contentType: endpoint.contentType || 'JSON',
  responseMode: endpoint.responseMode || 'SYNC',
  capability: endpoint.capability || '',
  endpointType: endpoint.endpointType || '',
  source: 'provider',
})

const PROVIDER_ENDPOINT_ORDER = {
  deepseek: ['OPENAI_CHAT', 'CLAUDE_MESSAGES'],
}
const MODEL_TYPE_CAPABILITIES = {
  1: new Set(['CHAT']),
  2: new Set(['IMAGE']),
  3: new Set(['VIDEO']),
}

const endpointMatchesModelType = (model, endpoint) => {
  const types = String(model.type || '').split(',').map((value) => value.trim()).filter(Boolean)
  if (types.length === 0) return true
  const allowed = new Set(types.flatMap((type) => [...(MODEL_TYPE_CAPABILITIES[type] || [])]))
  if (allowed.size === 0) return true
  return allowed.has(String(endpoint.capability || '').toUpperCase())
}

const sortProviderEndpoints = (model, endpoints) => {
  const order = PROVIDER_ENDPOINT_ORDER[String(model.factory || '').toLowerCase()]
  if (!order) return endpoints
  return [...endpoints].sort((left, right) => {
    const leftIndex = order.indexOf(left.endpointType)
    const rightIndex = order.indexOf(right.endpointType)
    return (leftIndex < 0 ? order.length : leftIndex) - (rightIndex < 0 ? order.length : rightIndex)
  })
}

export function resolveModelEndpoints(model = {}) {
  const configured = parseEndpointList(model.endpoints)
    .filter((endpoint) => endpoint?.path)
    .map((endpoint) => ({ ...endpoint, source: 'model' }))
  if (configured.length > 0) return configured

  return sortProviderEndpoints(model, Array.isArray(model.providerEndpoints) ? model.providerEndpoints : [])
    .filter((endpoint) => endpointMatchesModelType(model, endpoint))
    .map(normalizeProviderEndpoint)
    .filter((endpoint) => endpoint.path && endpoint.method !== 'GET' && endpoint.capability !== 'QUERY'
      && String(endpoint.responseMode || '').toUpperCase() !== 'STREAM')
}

export function endpointCapability(endpoint = {}) {
  return String(endpoint.capability || '').trim().toLowerCase()
}

/**
 * 端点任务类型：异步任务（提交后需轮询）还是同步调用。
 * 供应商端点以 responseMode 为准；遗留手动端点缺 responseMode，
 * 回退到路径/能力的行为推断（与 useModelRunner 的判定保持一致）。
 */
export function endpointTaskMode(endpoint = {}) {
  const mode = String(endpoint.responseMode || '').trim().toUpperCase()
  if (mode === 'ASYNC') return 'async'
  if (mode) return 'sync'
  return getEndpointBehavior(endpoint.path || '', endpoint.capability || '').behavior === 'async'
    ? 'async'
    : 'sync'
}

/** 模型任务类型：任一端点为异步则视为异步（用于列表摘要展示） */
export function modelTaskMode(model = {}) {
  return resolveModelEndpoints(model).some((endpoint) => endpointTaskMode(endpoint) === 'async')
    ? 'async'
    : 'sync'
}
