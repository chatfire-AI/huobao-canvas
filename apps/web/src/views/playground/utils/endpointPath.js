const GEMINI_ACTIONS = new Set([
  'generateContent',
  'streamGenerateContent',
  'embedContent',
  'batchEmbedContents',
  'predict',
  'predictLongRunning',
])

// 网关实际挂载的提交路由前缀（见 backend EndpointTypeRegistry 的 publicPathPattern）。
// 凡是后端通过模型 endpoints 配置或 gw_provider_endpoint 下发的提交端点，
// 都落在这些前缀之下，可直接调用，无需前端再维护路径白名单。
// /official/ 为厂商官方直连反代前缀（vite proxy / nginx 映射到厂商官方域名）。
const MOUNTED_SUBMIT_PREFIXES = [
  '/v1/',
  '/v1beta/',
  '/qwen/',
  '/volcengine/',
  '/vidu/',
  '/minimax/',
  '/zhipu/',
  '/official/',
]

export function resolveEndpointPath(path, modelName, providerCode) {
  let rawPath = path || '/v1/chat/completions'
  const legacyGeminiMatch = rawPath.match(/^\/v1\/models\/\{model\}:([^/:?#]+)$/)
  if (String(providerCode || '').trim().toLowerCase() === 'gemini'
      && GEMINI_ACTIONS.has(legacyGeminiMatch?.[1])) {
    rawPath = `/v1beta${rawPath.slice(3)}`
  }
  const encodedModel = encodeURIComponent(modelName || '')
  return rawPath.replace(/\{model\}/g, encodedModel)
}

export function isCanvasSubmitEndpointMounted(path) {
  if (typeof path !== 'string' || /[?#\\]/.test(path)) return false
  return MOUNTED_SUBMIT_PREFIXES.some((prefix) => path.startsWith(prefix))
}

// 流式端点（如 Gemini streamGenerateContent）返回 SSE，
// 画布/Playground 的运行器按一次性 JSON 响应处理，不能直接提交。
export function isStreamEndpoint(endpoint = {}) {
  return String(endpoint.responseMode || '').toUpperCase() === 'STREAM'
}

const isSubmittableEndpoint = (endpoint) =>
  endpoint?.method !== 'GET'
  && endpoint?.capability !== 'QUERY'
  && !isStreamEndpoint(endpoint)

export function areCanvasModelEndpointsUnavailable(model = {}) {
  let endpoints = model.endpoints
  try {
    if (typeof endpoints === 'string') endpoints = JSON.parse(endpoints)
  } catch {
    return false
  }
  if ((!Array.isArray(endpoints) || endpoints.length === 0) && Array.isArray(model.providerEndpoints)) {
    endpoints = model.providerEndpoints
      .filter(isSubmittableEndpoint)
      .map((endpoint) => ({ path: endpoint.publicPath }))
  }
  if (!Array.isArray(endpoints) || endpoints.length === 0
      || endpoints.some((endpoint) => typeof endpoint?.path !== 'string' || !endpoint.path.trim())) {
    return false
  }
  const providerCode = model.providerCode || model.factory || ''
  return endpoints.every((endpoint) => !isCanvasSubmitEndpointMounted(
    resolveEndpointPath(endpoint.path, model.name, providerCode),
  ))
}
