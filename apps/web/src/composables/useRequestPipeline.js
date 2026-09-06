import {
  MEDIA_RESULT_TYPES,
  TASK_ID_HEADER,
  extractMediaResult,
  normalizeTaskId,
  taskError,
} from '../views/playground/protocols/adapter.js'
import { getAdapter, inferProtocolKey } from '../views/playground/protocols/registry.js'
import { isCanvasSubmitEndpointMounted, resolveEndpointPath } from '../views/playground/utils/endpointPath.js'
import { parseSSELine } from '../views/playground/utils/chatProtocol.js'
import { buildModelRunnerAuthHeaders, errorMessage, sanitizeModelRunnerHeaders } from './useModelRunner.js'
import { getProviderForModel, getProvider, buildProviderAuthHeaders, applyProviderBaseUrl } from '../config/providers/index.js'
import { isServerRunMode, submitRunToServer, pollServerRun, cancelServerRun } from '../api/canvasServer.js'
import { getProviderApiKey } from '../utils/apiKeySession.js'
import { appFetch } from '../utils/desktopBridge.js'

// 请求 URL 拼接：绝对路径（厂商 baseUrl 覆盖为 http 地址时）直连，否则走 apiBaseUrl 前缀
const joinUrl = (apiBaseUrl, path) =>
  /^https?:\/\//.test(path) ? path : `${apiBaseUrl}${path}`

// 按模型归属厂商解析鉴权头：官方直连模式用厂商 Key + 厂商鉴权方式；
// 无厂商归属（网关模式/自定义模型）回退全局 Key 的 Bearer 头。
const resolveAuthHeaders = ({ model, apiKey }) => {
  const provider = getProviderForModel(model || {})
  if (provider) return buildProviderAuthHeaders(provider, getProviderApiKey(provider.id) || apiKey)
  return buildModelRunnerAuthHeaders(apiKey)
}

const RETRYABLE_HTTP_STATUSES = new Set([408, 425, 429])
const NONTERMINAL_TASK_STATUSES = new Set(['PENDING', 'QUEUED', 'PROCESSING', 'RUNNING'])

// 任务轮询默认预算：120 次 × 5s ≈ 10 分钟，调用方（如长视频）可按需覆盖
const DEFAULT_POLL_MAX_ATTEMPTS = 120
const DEFAULT_POLL_INTERVAL = 5000

const defaultWait = (duration, signal) => new Promise((resolve, reject) => {
  if (signal?.aborted) { reject(signal.reason || new DOMException('Aborted', 'AbortError')); return }
  const timer = setTimeout(done, duration)
  function done() { signal?.removeEventListener('abort', cancelled); resolve() }
  function cancelled() { clearTimeout(timer); reject(signal.reason || new DOMException('Aborted', 'AbortError')) }
  signal?.addEventListener('abort', cancelled, { once: true })
})

// Veo 结果 video.uri 是 generativelanguage 的鉴权下载链接（附 API Key 即可下载，BYOK 本地持有）。
// 重写为 /official/gemini 同源反代路径携 Key 拉取（与端点请求同一条链路，浏览器直连会跨域），
// 下载为 blob 转 ObjectURL 供预览；Key 走请求头不进 URL，失败返回 null 由调用方保留原提示。
const downloadGeminiVideo = async (uri, { apiBaseUrl, authHeaders, signal }) => {
  const provider = getProvider('gemini')
  const path = applyProviderBaseUrl(provider, String(uri).replace(/^https:\/\/generativelanguage\.googleapis\.com/, provider.proxyPrefix))
  try {
    const response = await appFetch(joinUrl(apiBaseUrl, path), { method: 'GET', headers: authHeaders, signal })
    if (!response.ok) return null
    return URL.createObjectURL(await response.blob())
  } catch {
    return null
  }
}

export function useRequestPipeline({ getNestedValue, wait = defaultWait }) {
  const resolveResultType = ({ model = {}, selectedEndpoint = null, outputSchema = null }) => {
    if (outputSchema?.displayType && outputSchema.displayType !== 'auto') return outputSchema.displayType
    const endpointType = selectedEndpoint
      ? (['chat', 'image', 'video'].includes(String(selectedEndpoint.capability || '').toLowerCase())
        ? String(selectedEndpoint.capability).toLowerCase()
        : '')
      : ''
    if (endpointType && endpointType !== 'text') return endpointType
    const typeName = model.typeName || ''
    if (typeName.includes('视频')) return 'video'
    if (typeName.includes('图片')) return 'image'
    if (typeName.includes('音频')) return 'audio'
    if (typeName.includes('对话') || typeName.includes('文本')) return 'chat'
    return endpointType || 'text'
  }

  const buildBody = (requestBody) => {
    if (requestBody.messages && typeof requestBody.messages === 'string') {
      try { requestBody.messages = JSON.parse(requestBody.messages) } catch {}
    }
    return requestBody
  }

  // 扁平 JSON 提交（无 inputTransform 的模型）剔除顶层空值：空串（被清空的 select）
  // 与空数组（未选参考图的 images 字段）会被厂商严格校验 400；false/0 是合法值必须保留
  const stripEmptyFields = (body) => {
    if (!body || typeof body !== 'object' || Array.isArray(body)) return body
    return Object.fromEntries(Object.entries(body).filter(([, value]) =>
      value !== '' && value !== undefined && value !== null && (!Array.isArray(value) || value.length > 0)))
  }

  const isFormContentType = (contentType) =>
    contentType === 'formdata' || contentType === 'form' || contentType === 'form_data'

  // 画布上传的图片以 data-URI 字符串存表单；OpenAI 图片编辑等 multipart 端点
  // 要求 image/image[] 为文件二进制，data-URI 文本会被拒，需在拼 FormData 时转回 Blob
  const DATA_URI_RE = /^data:([^;,]+);base64,(.+)$/s
  const dataUriToBlob = (value) => {
    if (typeof value !== 'string') return null
    const match = DATA_URI_RE.exec(value)
    if (!match) return null
    try {
      const binary = atob(match[2])
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
      const ext = (match[1].split('/')[1] || 'png').replace('jpeg', 'jpg')
      return { blob: new Blob([bytes], { type: match[1] }), name: `upload.${ext}` }
    } catch {
      return null
    }
  }

  // 流式与非流式分支共用的 requestMeta 构造：JSON 请求才回显 Content-Type（multipart 由浏览器自定 boundary）
  const buildRequestMeta = ({ startTime, authHeaders, responseHeaders, contentType, tokenUsage = null }) => ({
    duration: Math.round(performance.now() - startTime),
    requestHeaders: sanitizeModelRunnerHeaders({
      ...(isFormContentType(contentType) ? {} : { 'Content-Type': 'application/json' }),
      ...(authHeaders || {}),
    }),
    responseHeaders: sanitizeModelRunnerHeaders(responseHeaders),
    tokenUsage,
    estimatedCost: null,
  })

  const send = async ({ apiBaseUrl, endpointPath, authHeaders, extraHeaders, body, contentType, signal, forceFormData }) => {
    const requestHeaders = { ...(authHeaders || {}), ...(extraHeaders || {}) }
    const useFormData = forceFormData || isFormContentType(contentType)
    let response
    if (useFormData) {
      const fd = new FormData()
      const flat = body || {}
      // multipart 端点（OpenAI 图像编辑）要求文件二进制：上游注入的云端 http(s) URL
      // 按文本提交必 400，先拉取转 Blob；跨域拉取失败时给出明确指引而非静默发坏请求
      const urlToBlob = async (value) => {
        if (typeof value !== 'string' || !/^https?:\/\//.test(value)) return null
        try {
          const res = await appFetch(value, { signal })
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const blob = await res.blob()
          const ext = (blob.type?.split('/')[1] || 'png').replace('jpeg', 'jpg')
          return { blob, name: `upload.${ext}` }
        } catch (error) {
          if (error?.name === 'AbortError') throw error
          throw taskError(`参考图 URL 无法转为文件上传（跨域或已过期）：${value.slice(0, 80)}…请改用本地上传`, 'terminal', error)
        }
      }
      // 与旧 runModel 一致：multipart 请求显式携带 model 字段
      if (flat.model !== undefined && flat.model !== null && flat.model !== '') fd.append('model', flat.model)
      for (const [key, value] of Object.entries(flat)) {
        if (Array.isArray(value)) {
          for (let index = 0; index < value.length; index += 1) {
            const item = value[index]
            const fileItem = item instanceof Blob
              ? { blob: item, name: item instanceof File ? item.name : '' }
              : dataUriToBlob(item) || (key === 'image' ? await urlToBlob(item) : null)
            const fieldName = fileItem && key === 'image' ? 'image[]' : `${key}[${index}]`
            if (fileItem) {
              if (fileItem.name) fd.append(fieldName, fileItem.blob, fileItem.name)
              else fd.append(fieldName, fileItem.blob)
            } else if (typeof item === 'object' && item !== null) fd.append(fieldName, JSON.stringify(item))
            else fd.append(fieldName, item)
          }
          continue
        }
        const fileValue = value instanceof Blob
          ? { blob: value, name: value instanceof File ? value.name : '' }
          : dataUriToBlob(value) || (key === 'image' ? await urlToBlob(value) : null)
        if (fileValue) {
          if (fileValue.name) fd.append(key, fileValue.blob, fileValue.name)
          else fd.append(key, fileValue.blob)
        } else if (typeof value === 'object' && value !== null) fd.append(key, JSON.stringify(value))
        else if (value !== undefined && value !== null && value !== '' && key !== 'model') fd.append(key, value)
      }
      response = await appFetch(joinUrl(apiBaseUrl, endpointPath), { method: 'POST', headers: requestHeaders, body: fd, signal })
    } else {
      requestHeaders['Content-Type'] = 'application/json'
      response = await appFetch(joinUrl(apiBaseUrl, endpointPath), {
        method: 'POST', headers: requestHeaders, body: JSON.stringify(stripEmptyFields(body)), signal,
      })
    }
    const responseHeaders = {}
    response.headers.forEach((value, key) => { responseHeaders[key] = value })
    return { response, responseHeaders }
  }

  const consumeResponse = async (response) => {
    const responseContentType = response.headers.get('Content-Type') || ''
    if (!response.ok) {
      // 非 2xx 错误体（HTML 502、纯文本等）不能按 JSON 解析，否则会掩盖真实服务端消息
      let errorData = {}
      const rawText = await response.text()
      if (rawText.trim()) {
        try {
          errorData = JSON.parse(rawText)
        } catch {
          errorData = { message: rawText.slice(0, 1000) }
        }
      }
      throw taskError(errorMessage(errorData, 'Request failed'), 'terminal')
    }
    const isBinary = !responseContentType.includes('json')
    let data
    try {
      if (isBinary) {
        const blob = await response.blob()
        data = { audio_url: URL.createObjectURL(blob), content_type: responseContentType || blob.type || 'application/octet-stream' }
      } else {
        data = await response.json()
      }
    } catch (error) {
      if (error?.name === 'AbortError') throw error
      throw taskError('响应格式异常', 'terminal', error)
    }
    return data
  }

  // 取消由 fetch 的 signal 负责：abort 后 reader.read() 自动 reject（AbortError），无需在此重复接线
  const consumeStream = async ({ response, adapter, onStreamChunk }) => {
    if (!response.ok) {
      let errorData = {}
      const rawText = await response.text()
      if (rawText.trim()) {
        try {
          errorData = JSON.parse(rawText)
        } catch {
          errorData = { message: rawText.slice(0, 1000) }
        }
      }
      throw taskError(errorMessage(errorData, 'Request failed'), 'terminal')
    }
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let full = ''
    let done = false
    while (true) {
      const { value, done: readerDone } = await reader.read()
      if (readerDone) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        const event = parseSSELine(trimmed)
        if (!event) continue
        const parsed = adapter.parseStreamEvent(event)
        if (parsed.done) { done = true; break }
        if (parsed.text) {
          full += parsed.text
          onStreamChunk?.({ text: parsed.text, imageParts: parsed.imageParts || [], done: false })
        }
      }
      if (done) break
    }
    onStreamChunk?.({ text: '', imageParts: [], done: true })
    return full
  }

  const resumeTask = async ({ taskLink, apiKey, apiBaseUrl, signal, maxAttempts = DEFAULT_POLL_MAX_ATTEMPTS, pollInterval = DEFAULT_POLL_INTERVAL }) => {
    const taskId = normalizeTaskId(taskLink?.taskId)
    if (!taskId) throw taskError('任务标识无效', 'terminal')

    // 厂商官方直连的异步任务：按端点 query 配置轮询（官方任务查询端点 + 厂商状态映射）；
    // 无 query 配置保持 Huobao 网关的归一化任务查询。
    const vendorQuery = taskLink?.query || null
    const authHeaders = taskLink?.providerId
      ? buildProviderAuthHeaders(getProvider(taskLink.providerId), getProviderApiKey(taskLink.providerId) || apiKey)
      : buildModelRunnerAuthHeaders(apiKey)
    if (!taskLink?.providerId && !apiKey) throw taskError('请先创建或选择 API Key', 'auth-waiting')

    const MAX_ATTEMPTS = maxAttempts
    const POLL_INTERVAL = pollInterval
    const taskProvider = taskLink?.providerId ? getProvider(taskLink.providerId) : null
    const pollUrl = vendorQuery
      ? joinUrl(apiBaseUrl, applyProviderBaseUrl(taskProvider, String(vendorQuery.path).replace('{taskId}', taskId)))
      : `${apiBaseUrl}/v1/tasks/${encodeURIComponent(taskId)}?view=normalized`
    let lastRetryableMessage = '任务仍在处理中，请稍后重试'

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      let response
      let data
      try {
        response = await appFetch(pollUrl, { method: vendorQuery?.method || 'GET', headers: authHeaders, signal })
      } catch (error) {
        if (error?.name === 'AbortError') throw error
        if (signal?.aborted) throw taskError('已取消', 'terminal')
        lastRetryableMessage = error?.message || '任务查询暂时失败'
        if (attempt === MAX_ATTEMPTS - 1) throw taskError(lastRetryableMessage, 'retryable-waiting', error)
        await wait(POLL_INTERVAL, signal)
        continue
      }
      try {
        data = await response.json()
      } catch (error) {
        if (error?.name === 'AbortError') throw error
        if (signal?.aborted) throw taskError('已取消', 'terminal')
        if (!response.ok) data = {}
        else {
          lastRetryableMessage = error?.message || '任务响应格式暂时异常'
          if (attempt === MAX_ATTEMPTS - 1) throw taskError(lastRetryableMessage, 'retryable-waiting', error)
          await wait(POLL_INTERVAL, signal)
          continue
        }
      }
      if (!response.ok) {
        const message = errorMessage(data, 'Task query failed')
        if ([401, 403].includes(response.status)) throw taskError(message, 'auth-waiting')
        if ([400, 404].includes(response.status)) throw taskError(message, 'terminal')
        if (RETRYABLE_HTTP_STATUSES.has(response.status) || response.status >= 500) {
          if (attempt === MAX_ATTEMPTS - 1) throw taskError(message, 'retryable-waiting')
          await wait(POLL_INTERVAL, signal)
          continue
        }
        throw taskError(message, 'terminal')
      }

      // ── 厂商官方任务状态判定（query.statusPath / completedValues / failedValues / failedPath）──
      if (vendorQuery) {
        // statusPath 未命中时回退顶层 status（兼容状态平铺的厂商形态）；
        // 比较大小写不敏感（MiniMax 为 Success/Fail 形态，其余厂商为小写/大写枚举）
        const rawStatus = getNestedValue?.(data, vendorQuery.statusPath)
        const statusValue = String(rawStatus ?? getNestedValue?.(data, 'status') ?? '').toLowerCase()
        const failedDetail = vendorQuery.failedPath ? getNestedValue?.(data, vendorQuery.failedPath) : null
        const isCompleted = (vendorQuery.completedValues || []).map((v) => String(v).toLowerCase()).includes(statusValue)
        const isFailed = !!failedDetail || (vendorQuery.failedValues || []).map((v) => String(v).toLowerCase()).includes(statusValue)
        if (isCompleted) {
          const adapter = getAdapter(taskLink?.protocolKey)
          const rawExtraction = adapter?.extractMedia?.(data, null, getNestedValue)
          let extraction = Array.isArray(rawExtraction?.parsedResults)
            ? rawExtraction
            : extractMediaResult(data, taskLink?.resultType || 'text', null, getNestedValue)
          // Veo：video.uri 需携 Key 下载，转 blob 后才能预览（仅 gemini 官方直连任务）
          if (taskLink?.providerId === 'gemini' && extraction.parsedResults.length === 0 && extraction.protectedUris?.length) {
            const blobs = (await Promise.all(
              extraction.protectedUris.map((uri) => downloadGeminiVideo(uri, { apiBaseUrl, authHeaders, signal })),
            )).filter(Boolean)
            if (blobs.length) extraction = { ...extraction, parsedResults: blobs, unavailableReason: '' }
          }
          if (MEDIA_RESULT_TYPES.has(taskLink?.resultType) && extraction.parsedResults.length === 0 && !extraction.unavailableReason) {
            throw taskError('任务已完成，但未返回可用媒体结果', 'terminal')
          }
          return {
            result: data, resultType: taskLink?.resultType || 'text',
            parsedResults: extraction.parsedResults, unavailableReason: extraction.unavailableReason,
          }
        }
        if (isFailed) throw taskError(errorMessage(data, '任务处理失败'), 'terminal')
        // 厂商任务：未识别的状态一律视为处理中继续轮询
        if (attempt === MAX_ATTEMPTS - 1) throw taskError(lastRetryableMessage, 'retryable-waiting')
        await wait(POLL_INTERVAL, signal)
        continue
      }

      // ── Huobao 网关归一化任务判定 ──
      const status = String(data?.status || '').toUpperCase()
      if (status === 'COMPLETED' || status === 'SUCCEEDED') {
        const extraction = extractMediaResult(data?.result, taskLink?.resultType || 'text', null, getNestedValue)
        if (MEDIA_RESULT_TYPES.has(taskLink?.resultType) && extraction.parsedResults.length === 0 && !extraction.unavailableReason) {
          throw taskError('任务已完成，但未返回可用媒体结果', 'terminal')
        }
        return {
          result: data?.result, resultType: taskLink?.resultType || 'text',
          parsedResults: extraction.parsedResults, unavailableReason: extraction.unavailableReason,
        }
      }
      if (status === 'FAILED' || status === 'ERROR') throw taskError(errorMessage(data, '任务处理失败'), 'terminal')
      if (!NONTERMINAL_TASK_STATUSES.has(status)) throw taskError('任务查询协议异常', 'terminal')
      if (attempt === MAX_ATTEMPTS - 1) throw taskError(lastRetryableMessage, 'retryable-waiting')
      await wait(POLL_INTERVAL, signal)
    }
    throw taskError(lastRetryableMessage, 'retryable-waiting')
  }

  const run = async ({
    model, formData, endpoint, protocolKey, apiKey, apiBaseUrl,
    stream = false, signal, onStreamChunk, onTaskSubmitted,
    applyInputTransform, inputTransformSchema, formDataHint,
    outputSchema, asyncModeSchema,
  }) => {
    // ── 服务端执行分支：runs 队列（提交即持久化，浏览器刷新凭 runId 恢复）──
    // Key/transform/协议适配全部在 apps/server 侧完成；此处只提交 + 轮询。
    // 服务端不可用（探测失败）自动落回下方浏览器链路，行为与纯本地模式一致。
    if (await isServerRunMode()) {
      const startTime = performance.now()
      const { runId } = await submitRunToServer({
        model: model?.name || '',
        endpointPath: endpoint?.path || '',
        formData,
      })
      // 提交即持久化：画布把 { runId } 写进节点 payload（WAITING），刷新后可恢复
      await onTaskSubmitted?.({ runId, taskId: '' })
      const onAbort = () => { cancelServerRun(runId).catch(() => {}) }
      signal?.addEventListener('abort', onAbort, { once: true })
      try {
        const runResult = await pollServerRun(runId, { signal })
        if (runResult.status === 'failed') throw taskError(runResult.error || '服务端运行失败', 'terminal')
        if (runResult.status === 'cancelled') throw new DOMException('Aborted', 'AbortError')
        const resultType = resolveResultType({ model, selectedEndpoint: endpoint, outputSchema })
        return {
          result: runResult.result,
          resultType,
          parsedResults: runResult.parsedResults || [],
          unavailableReason: runResult.unavailableReason || '',
          requestMeta: {
            duration: Math.round(performance.now() - startTime),
            requestHeaders: {},
            responseHeaders: {},
            tokenUsage: runResult.result?.usage || null,
            estimatedCost: null,
          },
        }
      } finally {
        signal?.removeEventListener('abort', onAbort)
      }
    }

    const startTime = performance.now()
    const modelName = model?.name || ''
    const provider = getProviderForModel(model || {})
    const authHeaders = resolveAuthHeaders({ model, apiKey })
    const providerCode = model?.providerCode || model?.factory || ''
    let endpointPath = resolveEndpointPath(endpoint?.path || '/v1/chat/completions', modelName, providerCode)
    if (!isCanvasSubmitEndpointMounted(endpointPath)) throw new Error(`当前未开放该提交入口：${endpointPath}`)
    // 厂商 baseUrl 覆盖（设置页可配）：默认 /official/{id} 反代，覆盖后直连自定义地址
    endpointPath = applyProviderBaseUrl(provider, endpointPath)

    // 适配器选择：端点显式 protocolKey > 调用方传入 > 路径推断
    const adapter = getAdapter(endpoint?.protocolKey || protocolKey || inferProtocolKey(endpointPath, endpoint?.capability))
    // 先由调用方传入的 inputTransform 把扁平表单重组为厂商请求体，再交给适配器做协议化
    const transformedData = inputTransformSchema && applyInputTransform
      ? applyInputTransform(inputTransformSchema, formData)
      : formData
    // messages 的字符串→数组解析必须发生在 buildRequest 之前：
    // claude/gemini/openai-responses 适配器只在数组形态下做协议转换，
    // 表单默认值是 JSON 字符串，若后置解析会跳过转换（gemini 缺 contents 必 400）
    if (transformedData && typeof transformedData.messages === 'string') {
      try { transformedData.messages = JSON.parse(transformedData.messages) } catch {}
    }
    const { body: rawBody, contentType } = adapter.buildRequest({ modelName, formData: transformedData, inputTransform: null, endpoint })
    const body = buildBody(rawBody)
    // 一次性（非流式）请求必须显式关闭 stream：聊天表单默认 stream:true，
    // 若保留原值网关会返回 SSE，pipeline 会当作二进制 blob 消费（回归旧的强制语义）。
    if (!stream && body?.stream === true) body.stream = false

    const { response, responseHeaders } = await send({
      apiBaseUrl, endpointPath, authHeaders, extraHeaders: endpoint?.extraHeaders,
      body, contentType, signal, forceFormData: formDataHint,
    })

    let data
    if (stream && !isFormContentType(contentType)) {
      const streamText = await consumeStream({ response, adapter, onStreamChunk })
      return {
        result: streamText, resultType: 'chat', parsedResults: [streamText],
        unavailableReason: '', requestBody: body,
        requestMeta: buildRequestMeta({ startTime, authHeaders, responseHeaders, contentType }),
      }
    }
    data = await consumeResponse(response)

    const resultType = resolveResultType({ model, selectedEndpoint: endpoint, outputSchema })
    // chat/文本结果优先走适配器 extractText（choices[0].message.content 等协议字段）：
    // 否则 extractLegacyResults 无 displayField 时会把整个响应对象当结果，节点渲染不出文本
    let extraction
    const chatText = !MEDIA_RESULT_TYPES.has(resultType) && typeof adapter.extractText === 'function'
      ? adapter.extractText(data)
      : ''
    if (typeof chatText === 'string' && chatText.trim()) {
      extraction = { parsedResults: [chatText], unavailableReason: '' }
    } else {
      // 适配器提取结果：media 簇返回新形状 { parsedResults, unavailableReason }；chat 簇返回旧媒体形状
      // （{ urls, b64s, protectedReason }），后者回落统一出参提取，行为与 useModelRunner 保持一致。
      const rawExtraction = adapter.extractMedia
        ? adapter.extractMedia(data, outputSchema, getNestedValue)
        : { parsedResults: [], unavailableReason: '' }
      extraction = Array.isArray(rawExtraction?.parsedResults)
        ? rawExtraction
        : extractMediaResult(data, resultType, outputSchema, getNestedValue)
    }
    // 任务 ID：端点 query.taskIdPath（厂商官方）> 响应头 > 适配器解析
    const vendorQuery = endpoint?.query || null
    const taskId = (vendorQuery?.taskIdPath && normalizeTaskId(getNestedValue?.(data, vendorQuery.taskIdPath)))
      || normalizeTaskId(response?.headers?.get?.(TASK_ID_HEADER))
      || adapter.parseTaskLink?.(data, endpoint)?.taskId
    const isAsync = adapter.isAsyncResponse?.(response, endpoint)
      || String(asyncModeSchema || '').toLowerCase() === 'async'

    if (isAsync && taskId) {
      const taskLink = {
        taskId,
        queryPath: vendorQuery?.path || '/v1/tasks/{taskId}?view=normalized',
        query: vendorQuery,
        protocolKey: adapter.protocolKey,
        providerId: provider?.id || '',
        resultType, modelName, endpointPath,
      }
      if (typeof onTaskSubmitted !== 'function') throw taskError('异步任务缺少持久化回调', 'terminal')
      await onTaskSubmitted(taskLink)
      return { pending: true, taskLink }
    }
    if (isAsync && extraction.parsedResults.length === 0) {
      throw taskError('异步任务响应缺少任务标识或可用结果', 'terminal')
    }

    const requestMeta = buildRequestMeta({ startTime, authHeaders, responseHeaders, contentType, tokenUsage: data?.usage || null })
    return { result: data, resultType, parsedResults: extraction.parsedResults, unavailableReason: extraction.unavailableReason, requestBody: body, requestMeta }
  }

  return { run, resumeTask }
}
