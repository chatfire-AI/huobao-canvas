import { CANVAS_NODE_TYPES, NODE_STATUS } from '../constants/nodeTypes.js'

const SENSITIVE_KEYS = new Set([
  'apikey', 'xapikey', 'authorization', 'proxyauthorization',
  'providerapikey', 'accesstoken', 'refreshtoken', 'idtoken',
  'clientsecret', 'privatekey', 'credentials', 'password',
  'headers', 'requestheaders', 'responseheaders', 'requestbody', 'responsebody',
  'rawdata', 'rawbody', 'rawrequest', 'rawresponse', 'assetid', 'lastrunid',
])

const SAFE_TASK_KEYS = [
  'taskId',
  'runId',
  'providerId',
  'protocolKey',
  'query',
  'queryPath',
  'resultType',
  'modelName',
  'endpointPath',
]
const MEDIA_NODE_TYPES = new Set([
  CANVAS_NODE_TYPES.IMAGE,
  CANVAS_NODE_TYPES.VIDEO,
  CANVAS_NODE_TYPES.AUDIO,
  CANVAS_NODE_TYPES.MUSIC,
])
const RESULT_URL_KEYS = new Set([
  'url', 'image_url', 'imageUrl', 'video_url', 'videoUrl',
  'audio_url', 'audioUrl', 'output_url', 'outputUrl',
])
const TEMPORARY_RESULT_NOTICE = '临时结果未保存，刷新后请重新生成'
const UNRECOVERABLE_TASK_ERROR = '任务无法恢复，请重新生成'
const UNAVAILABLE_RESULT_NOTICE = '任务已完成，但结果不可预览，请重新生成'

const normalizeKey = (key) => String(key).toLowerCase().replace(/[-_]/g, '')
const SAFE_TOKEN_PARAMETER_KEYS = new Set([
  'maxtoken', 'maxtokens', 'maxoutputtoken', 'maxoutputtokens',
  'maxcompletiontoken', 'maxcompletiontokens',
  'mintoken', 'mintokens', 'inputtokens', 'outputtokens',
  'prompttokens', 'completiontokens', 'totaltokens', 'tokenusage',
])
const isSensitiveKey = (key) => {
  const normalized = normalizeKey(key)
  return SENSITIVE_KEYS.has(normalized) ||
    normalized.endsWith('apikey') || normalized.endsWith('apikeys') ||
    ((normalized.endsWith('token') || normalized.endsWith('tokens')) && !SAFE_TOKEN_PARAMETER_KEYS.has(normalized)) ||
    normalized.endsWith('secret') || normalized.endsWith('secrets') ||
    normalized.endsWith('secretkey') || normalized.endsWith('secretkeys') ||
    normalized.endsWith('password') || normalized.endsWith('passwords') ||
    normalized.endsWith('privatekey') || normalized.endsWith('privatekeys') ||
    normalized.endsWith('credentials') ||
    normalized.endsWith('header') || normalized.endsWith('headers') ||
    normalized.endsWith('cookie') || normalized.endsWith('cookies')
}

const isTransientString = (value) => (
  /^(blob|data):/i.test(value.trim())
)

const isRawMediaValue = (key, value, parentKey, parentValue) => {
  const normalizedKey = normalizeKey(key)
  if (
    typeof value === 'string' &&
    (normalizedKey === 'b64json' || normalizedKey === 'base64' || normalizedKey.endsWith('base64'))
  ) return true
  if (normalizedKey !== 'data') return false
  return normalizeKey(parentKey) === 'inlinedata' ||
    /^(image|video|audio|application)(\/|$)/.test(String(parentValue?.type || '').toLowerCase())
}

const sanitizeTaskLink = (value) => {
  if (!value || typeof value !== 'object') return undefined
  const task = {}
  for (const key of SAFE_TASK_KEYS) {
    const entry = value[key]
    // query 是厂商轮询配置对象（vendorQuery），taskId/runId 是字符串
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      task[key] = entry
    } else if (typeof entry === 'string' && entry.trim()) {
      task[key] = entry.trim()
    }
  }
  return (task.taskId || task.runId) ? task : undefined
}

function sanitizeValue(value, key = '', parentKey = '', parentValue = null) {
  if (isSensitiveKey(key)) return undefined
  if (normalizeKey(key) === 'task' && normalizeKey(parentKey) === 'payload') return sanitizeTaskLink(value)
  if (isRawMediaValue(key, value, parentKey, parentValue)) return undefined
  if (typeof File !== 'undefined' && value instanceof File) return undefined
  if (typeof Blob !== 'undefined' && value instanceof Blob) return undefined
  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return undefined
  if (typeof value === 'string' && isTransientString(value)) return undefined
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item)).filter((item) => item !== undefined)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value)
    .map(([childKey, childValue]) => [childKey, sanitizeValue(childValue, childKey, key, value)])
    .filter(([, childValue]) => childValue !== undefined))
}

const isPublicUrl = (value) => {
  if (typeof value !== 'string' || !value.trim()) return false
  try {
    return ['http:', 'https:'].includes(new URL(value.trim()).protocol)
  } catch {
    return false
  }
}

const hasPersistentMediaResult = (payload = {}) => {
  if (isPublicUrl(payload.url)) return true
  const seen = new WeakSet()
  const visit = (value) => {
    if (isPublicUrl(value)) return false
    if (!value || typeof value !== 'object' || seen.has(value)) return false
    seen.add(value)
    return Object.entries(value).some(([key, child]) => (
      (RESULT_URL_KEYS.has(key) && isPublicUrl(child)) || visit(child)
    ))
  }
  const parsedResults = Array.isArray(payload.parsedResults)
    ? payload.parsedResults
    : [payload.parsedResults]
  return parsedResults.some((result) => isPublicUrl(result) || visit(result)) || visit(payload.result)
}

const expireTransientMediaResult = (node) => {
  if (!MEDIA_NODE_TYPES.has(node?.type) || node?.data?.status !== NODE_STATUS.SUCCESS) return node
  const payload = node.data?.payload || {}
  if (hasPersistentMediaResult(payload)) return node
  const nextPayload = {
    ...payload,
    url: '',
    result: null,
    parsedResults: [],
    notice: TEMPORARY_RESULT_NOTICE,
  }
  delete nextPayload.requestMeta
  return {
    ...node,
    data: {
      ...node.data,
      status: NODE_STATUS.EXPIRED,
      payload: nextPayload,
    },
  }
}

export function sanitizeCanvasGraph(graph = {}) {
  return {
    nodes: (graph.nodes || []).map((node) => {
      const clean = sanitizeValue(node)
      delete clean.selected
      delete clean.dragging
      return expireTransientMediaResult(clean)
    }),
    edges: (graph.edges || []).map((edge) => {
      const clean = sanitizeValue(edge)
      delete clean.selected
      return clean
    }),
    viewport: sanitizeValue(graph.viewport || { x: 0, y: 0, zoom: 1 }),
  }
}

export function repairCanvasGraphForLoad(graph = {}) {
  const clean = sanitizeCanvasGraph(graph)
  const parentIds = new Set(clean.nodes
    .filter((node) => node.type === CANVAS_NODE_TYPES.GROUP)
    .map((node) => node.id))
  return {
    ...clean,
    nodes: clean.nodes.map((node) => {
      // 孤儿节点：parentNode 指向已删除的分组——剥离父子关系，
      // 否则 Vue Flow 反复报 missing parent 并陷入变更循环
      if (node.parentNode && !parentIds.has(node.parentNode)) {
        node = { ...node, parentNode: undefined, extent: undefined }
      }
      if (parentIds.has(node.parentNode) && (node.position?.x < 0 || node.position?.y < 0)) {
        const recovered = node.computedPosition
        if (recovered?.x >= 0 && recovered?.y >= 0) {
          node = { ...node, position: { x: recovered.x, y: recovered.y } }
        }
      }
      const status = node?.data?.status
      if (status === NODE_STATUS.UNAVAILABLE) {
        const payload = {
          ...(node.data?.payload || {}),
          url: '',
          result: null,
          parsedResults: [],
          notice: UNAVAILABLE_RESULT_NOTICE,
        }
        delete payload.requestMeta
        delete payload.task
        return {
          ...node,
          data: { ...node.data, payload },
        }
      }
      if (![NODE_STATUS.RUNNING, NODE_STATUS.WAITING].includes(status)) return node
      const task = node.data?.payload?.task
      if (task?.taskId || task?.runId) {
        return {
          ...node,
          data: { ...node.data, status: NODE_STATUS.WAITING },
        }
      }
      return {
        ...node,
        data: {
          ...node.data,
          status: NODE_STATUS.ERROR,
          payload: {
            ...(node.data?.payload || {}),
            error: UNRECOVERABLE_TASK_ERROR,
          },
        },
      }
    }),
  }
}
