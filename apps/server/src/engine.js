/**
 * 服务端运行引擎：全量模型调用的服务端执行（runs 队列）
 *
 * 直接复用 apps/web 的纯函数模块（Node 可 import，见 scripts/verify-providers.mjs 先例）：
 *   config/providers/index.js   模型目录 / 厂商鉴权头 / baseUrl 覆盖
 *   protocols/registry+adapters 协议适配（buildRequest / extractText / extractMedia / 任务解析）
 *   utils/chatProtocol.js      chat 协议请求体组装
 *   utils/inputTransform.js    表单 → 厂商请求体的模板引擎
 *
 * Key/baseUrl 来自 settings 表（经 setKeyStoreBackend 注入 SQLite 后端，
 * providers/index.js 的 getProviderConfig 零改动读到 DB 数据）。
 *
 * 执行流与浏览器版 useRequestPipeline 对齐：transform → adapter.buildRequest →
 * 发送（JSON/multipart）→（异步任务 taskId → waiting → ticker 轮询）→ 结果提取落库。
 * 每次运行都是 runs 表记录：浏览器刷新后凭 runId 轮询即可恢复（任务不丢）。
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { getProvider, getProviderForModel, buildProviderAuthHeaders, applyProviderBaseUrl, providerTestUrl, collectModels } from '../../web/src/config/providers/index.js'
import { setKeyStoreBackend, getCurrentApiKey, getProviderApiKey, getProviderConfig } from '../../web/src/utils/apiKeySession.js'
import { getAdapter } from '../../web/src/views/playground/protocols/registry.js'
import { TASK_ID_HEADER, extractMediaResult, normalizeTaskId, MEDIA_RESULT_TYPES } from '../../web/src/views/playground/protocols/adapter.js'
import { resolveEndpointPath, isCanvasSubmitEndpointMounted } from '../../web/src/views/playground/utils/endpointPath.js'
import { createInputTransformEngine, getNestedValue } from '../../web/src/utils/inputTransform.js'
import { mergeEndpointSchema } from '../../web/src/views/playground/utils/mergeEndpointSchema.js'

const applyInputTransform = createInputTransformEngine()

const RETRYABLE_HTTP_STATUSES = new Set([408, 425, 429])
const NONTERMINAL_TASK_STATUSES = new Set(['PENDING', 'QUEUED', 'PROCESSING', 'RUNNING'])
const GATEWAY_MOUNT_RE = /^\/(v1|v1beta|sys|qwen|volcengine|vidu|minimax|xai|zhipu)\//
const PUBLIC_GATEWAY = 'https://api.chatfire.site'
// 异步任务轮询预算：720 次 × 10s = 2h（长视频友好；浏览器版是 120×5s）
const POLL_MAX_ATTEMPTS = 720
const POLL_INTERVAL = 10000

const nowIso = () => new Date().toISOString()

/**
 * 引擎装配：注入 db 句柄与 settings 读写
 * @param {{ prepare:(sql:string)=>{run:Function,get:Function,all:Function}, exec? }} db node:sqlite DatabaseSync
 */
export function createRunEngine({ db, statements, dataDir }) {
  const filesDir = path.join(dataDir, 'files')
  mkdirSync(filesDir, { recursive: true })

  // ── Key 存储后端注入：apiKeySession → settings 表（localStorage 语义）──
  const qSetting = statements.getSetting
  setKeyStoreBackend({
    readRaw: (name) => {
      const row = qSetting.get(String(name))
      if (!row) return null
      try {
        const value = JSON.parse(row.value)
        // localStorage 存的是字符串原文：字符串直接返回，对象还原为 JSON 文本
        return typeof value === 'string' ? value : JSON.stringify(value)
      } catch {
        return row.value
      }
    },
    writeRaw: () => {}, // 服务端只读（写入走 /api/settings 镜像）
    removeRaw: () => {},
  })

  const q = {
    putRun: db.prepare(`INSERT INTO runs (id, projectId, nodeId, model, endpointPath, formData, status, taskLink, result, parsedResults, error, createdAt, updatedAt, finishedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, ?, ?, NULL)`),
    getRun: db.prepare('SELECT * FROM runs WHERE id = ?'),
    listActiveRuns: db.prepare("SELECT * FROM runs WHERE status IN ('queued','running','waiting') ORDER BY createdAt"),
    updateRunStatus: db.prepare('UPDATE runs SET status = ?, updatedAt = ? WHERE id = ?'),
    failRun: db.prepare('UPDATE runs SET status = \'failed\', error = ?, updatedAt = ?, finishedAt = ? WHERE id = ?'),
    completeRun: db.prepare('UPDATE runs SET status = \'completed\', result = ?, parsedResults = ?, updatedAt = ?, finishedAt = ? WHERE id = ?'),
    setTaskLink: db.prepare('UPDATE runs SET status = \'waiting\', taskLink = ?, updatedAt = ? WHERE id = ?'),
    purgeOldRuns: db.prepare("DELETE FROM runs WHERE finishedAt IS NOT NULL AND finishedAt < ?"),
    listRunsWithTask: db.prepare("SELECT id, taskLink FROM runs WHERE status = 'waiting'"),
  }

  const controllers = new Map() // runId → AbortController（同步执行阶段）

  const gatewayBase = () => {
    const raw = qSetting.get('chatfire_canvas_gateway_base')?.value
    try {
      const parsed = JSON.parse(raw || '""')
      return String(parsed || '').replace(/\/$/, '') || PUBLIC_GATEWAY
    } catch {
      return PUBLIC_GATEWAY
    }
  }

  const globalKey = () => {
    try { return JSON.parse(qSetting.get('chatfire_canvas_current_key')?.value || '""') || '' } catch { return '' }
  }

  /** 相对端点路径 → 绝对 URL + 鉴权头（厂商官方优先，网关前缀回退） */
  const resolveTarget = (provider, endpointPath) => {
    let target = endpointPath
    if (provider) target = applyProviderBaseUrl(provider, endpointPath)
    if (/^https?:\/\//.test(target)) {
      const auth = provider
        ? buildProviderAuthHeaders(provider, getProviderApiKey(provider.id) || globalKey())
        : { Authorization: `Bearer ${globalKey()}` }
      return { url: target, auth }
    }
    if (provider && target.startsWith(provider.proxyPrefix)) {
      return {
        url: provider.baseUrl + target.slice(provider.proxyPrefix.length),
        auth: buildProviderAuthHeaders(provider, getProviderApiKey(provider.id) || globalKey()),
      }
    }
    if (GATEWAY_MOUNT_RE.test(target)) {
      return { url: gatewayBase() + target, auth: { Authorization: `Bearer ${globalKey()}` } }
    }
    throw new Error(`无法解析端点地址：${endpointPath}`)
  }

  const resolveResultType = ({ model, endpoint, outputSchema }) => {
    if (outputSchema?.displayType && outputSchema.displayType !== 'auto') return outputSchema.displayType
    const capability = String(endpoint?.capability || '').toLowerCase()
    if (['chat', 'image', 'video'].includes(capability)) return capability === 'chat' ? 'chat' : capability
    const typeName = model?.typeName || ''
    if (typeName.includes('视频')) return 'video'
    if (typeName.includes('图片')) return 'image'
    if (typeName.includes('音频')) return 'audio'
    return 'chat'
  }

  // ── multipart 组装（与浏览器 send() 同约定：data-URI / 云端 URL → Blob，数组 image→image[]）──
  const DATA_URI_RE = /^data:([^;,]+);base64,(.+)$/s
  const dataUriToBlob = (value) => {
    if (typeof value !== 'string') return null
    const match = DATA_URI_RE.exec(value)
    if (!match) return null
    try {
      const binary = Buffer.from(match[2], 'base64')
      const ext = (match[1].split('/')[1] || 'png').replace('jpeg', 'jpg')
      return { blob: new Blob([binary], { type: match[1] }), name: `upload.${ext}` }
    } catch {
      return null
    }
  }

  const urlToBlob = async (value, signal) => {
    if (typeof value !== 'string' || !/^https?:\/\//.test(value)) return null
    const resp = await fetch(value, { signal })
    if (!resp.ok) throw new Error(`参考图 URL 拉取失败 HTTP ${resp.status}`)
    const blob = await resp.blob()
    const ext = (blob.type?.split('/')[1] || 'png').replace('jpeg', 'jpg')
    return { blob, name: `upload.${ext}` }
  }

  const buildMultipart = async (body, signal) => {
    const fd = new FormData()
    for (const [key, value] of Object.entries(body || {})) {
      if (Array.isArray(value)) {
        for (let index = 0; index < value.length; index += 1) {
          const item = value[index]
          const fileItem = item instanceof Blob
            ? { blob: item, name: '' }
            : dataUriToBlob(item) || (key === 'image' ? await urlToBlob(item, signal) : null)
          const fieldName = fileItem && key === 'image' ? 'image[]' : `${key}[${index}]`
          if (fileItem) fd.append(fieldName, fileItem.blob, fileItem.name || undefined)
          else if (typeof item === 'object' && item !== null) fd.append(fieldName, JSON.stringify(item))
          else if (item !== undefined && item !== null) fd.append(fieldName, String(item))
        }
        continue
      }
      const fileValue = value instanceof Blob
        ? { blob: value, name: '' }
        : dataUriToBlob(value) || (key === 'image' ? await urlToBlob(value, signal) : null)
      if (fileValue) fd.append(key, fileValue.blob, fileValue.name || undefined)
      else if (typeof value === 'object' && value !== null) fd.append(key, JSON.stringify(value))
      else if (value !== undefined && value !== null && value !== '' && key !== 'model') fd.append(key, String(value))
    }
    return fd
  }

  const stripEmptyFields = (body) => {
    if (!body || typeof body !== 'object' || Array.isArray(body)) return body
    return Object.fromEntries(Object.entries(body).filter(([, value]) =>
      value !== '' && value !== undefined && value !== null && (!Array.isArray(value) || value.length > 0)))
  }

  const send = async ({ provider, endpointPath, body, contentType, extraHeaders, signal }) => {
    const { url, auth } = resolveTarget(provider, endpointPath)
    const headers = { ...auth, ...(extraHeaders || {}) }
    let payload
    if (contentType === 'formdata') {
      payload = await buildMultipart(body, signal)
    } else {
      headers['Content-Type'] = 'application/json'
      payload = JSON.stringify(stripEmptyFields(body))
    }
    const resp = await fetch(url, { method: 'POST', headers, body: payload, signal })
    const responseHeaders = {}
    resp.headers.forEach((value, key) => { responseHeaders[key] = value })
    const text = await resp.text()
    let data = null
    try { data = text ? JSON.parse(text) : null } catch { data = { message: text.slice(0, 1000) } }
    return { resp, responseHeaders, data }
  }

  // ── 结果提取 + 文件化（b64/dataUri/Veo 鉴权视频 → /api/files/ 持久 URL）──
  const extOf = (mime, fallback) => String(mime || '').split('/')[1]?.replace('jpeg', 'jpg') || fallback

  const writeMediaFile = (buffer, mime, fallbackExt) => {
    const name = `${Date.now()}_${randomUUID().slice(0, 8)}.${extOf(mime, fallbackExt)}`
    writeFileSync(path.join(filesDir, name), buffer)
    return `/api/files/${name}`
  }

  const dataUrlToBuffer = (value) => {
    const match = /^data:([^;,]+);base64,(.+)$/s.exec(String(value))
    if (!match) return null
    return { buffer: Buffer.from(match[2], 'base64'), mime: match[1] }
  }

  const materializeResultFiles = async ({ providerId, extraction, authHeaders, signal }) => {
    const results = []
    for (const item of extraction.parsedResults || []) {
      if (typeof item === 'string' && item.startsWith('data:')) {
        const parsed = dataUrlToBuffer(item)
        if (parsed) { results.push(writeMediaFile(parsed.buffer, parsed.mime, 'bin')); continue }
      }
      if (item && typeof item === 'object' && typeof item.b64_json === 'string' && item.b64_json) {
        results.push(writeMediaFile(Buffer.from(item.b64_json, 'base64'), item.mimeType, 'bin'))
        continue
      }
      results.push(item)
    }
    // Gemini Veo：video.uri 是鉴权下载链接，服务端携 Key 下载落盘（浏览器无 CORS 顾虑）
    if (providerId === 'gemini' && results.length === 0 && extraction.protectedUris?.length) {
      for (const uri of extraction.protectedUris) {
        try {
          const resp = await fetch(uri, { headers: authHeaders || {}, signal })
          if (!resp.ok) continue
          const buffer = Buffer.from(await resp.arrayBuffer())
          results.push(writeMediaFile(buffer, resp.headers.get('content-type') || 'video/mp4', 'mp4'))
        } catch { /* 下载失败保留 unavailableReason 语义 */ }
      }
    }
    return results
  }

  const extractRunResults = async ({ adapter, data, resultType, outputSchema, providerId, authHeaders, signal }) => {
    const chatText = !MEDIA_RESULT_TYPES.has(resultType) && typeof adapter.extractText === 'function'
      ? adapter.extractText(data)
      : ''
    if (typeof chatText === 'string' && chatText.trim()) {
      return { resultType, parsedResults: [chatText], unavailableReason: '' }
    }
    const rawExtraction = adapter.extractMedia
      ? adapter.extractMedia(data, outputSchema, getNestedValue)
      : { parsedResults: [], unavailableReason: '' }
    const extraction = Array.isArray(rawExtraction?.parsedResults)
      ? rawExtraction
      : extractMediaResult(data, resultType, outputSchema, getNestedValue)
    const parsedResults = await materializeResultFiles({ providerId, extraction, authHeaders, signal })
    return { resultType, parsedResults, unavailableReason: extraction.unavailableReason || '' }
  }

  // ── 同步执行（POST 提交 → 提取；异步则登记 taskLink 转 waiting）──
  const executeRun = async (run) => {
    const { id } = run
    const controller = new AbortController()
    controllers.set(id, controller)
    const { signal } = controller
    try {
      const formData = JSON.parse(run.formData || '{}')
      const model = collectModels({}).find((m) => m.name === run.model)
      if (!model) throw new Error(`模型不存在：${run.model}`)
      const provider = getProviderForModel(model)

      const parsedSchema = JSON.parse(model.modelSchema || '{}')
      const { endpointSchemas, ...globalSchema } = parsedSchema
      const endpoint = (model.endpoints || []).find((e) => e.path === run.endpointPath) || model.endpoints?.[0]
      const epSchema = endpointSchemas?.[run.endpointPath] || null
      const merged = mergeEndpointSchema({ epSchema, globalSchema, templateSchema: null, templateRequestType: null, defaultChatConfig: {} })

      const endpointPath = resolveEndpointPath(endpoint?.path || run.endpointPath, model.name, model.providerCode || '')
      if (!isCanvasSubmitEndpointMounted(endpointPath)) throw new Error(`当前未开放该提交入口：${endpointPath}`)

      const adapter = getAdapter(endpoint?.protocolKey || parsedSchema.protocolKey)
      const transformed = merged.inputTransform
        ? applyInputTransform(merged.inputTransform, formData)
        : formData
      if (transformed && typeof transformed.messages === 'string') {
        try { transformed.messages = JSON.parse(transformed.messages) } catch {}
      }
      const { body: rawBody, contentType } = adapter.buildRequest({ modelName: model.name, formData: transformed, inputTransform: null, endpoint })
      const body = { ...rawBody }
      if (body?.stream === true) body.stream = false

      q.updateRunStatus.run('running', nowIso(), id)
      const { resp, responseHeaders, data } = await send({
        provider, endpointPath, body, contentType, extraHeaders: endpoint?.extraHeaders, signal,
      })
      if (!resp.ok) {
        const message = data?.error?.message || data?.message || `Request failed (${resp.status})`
        const terminal = !RETRYABLE_HTTP_STATUSES.has(resp.status) && resp.status < 500
        if (terminal) throw new Error(String(message))
        throw Object.assign(new Error(String(message)), { retryable: true })
      }

      const resultType = resolveResultType({ model, endpoint, outputSchema: merged.output })
      const vendorQuery = endpoint?.query || null
      const taskId = (vendorQuery?.taskIdPath && normalizeTaskId(getNestedValue(data, vendorQuery.taskIdPath)))
        || normalizeTaskId(responseHeaders[TASK_ID_HEADER.toLowerCase()])
        || adapter.parseTaskLink?.(data, endpoint)?.taskId
      const isAsync = endpoint?.responseMode === 'ASYNC'
        || adapter.isAsyncResponse?.({ headers: { get: (h) => responseHeaders[String(h).toLowerCase()] } }, endpoint)

      if (isAsync && taskId) {
        q.setTaskLink.run(JSON.stringify({
          taskId,
          query: vendorQuery || null,
          protocolKey: adapter.protocolKey,
          providerId: provider?.id || '',
          resultType,
          modelName: model.name,
          endpointPath,
        }), nowIso(), id)

        return { status: 'waiting' }
      }

      const { parsedResults, unavailableReason } = await extractRunResults({
        adapter, data, resultType, outputSchema: merged.output,
        providerId: provider?.id, authHeaders: null, signal,
      })
      if (isAsync && parsedResults.length === 0) throw new Error('异步任务响应缺少任务标识或可用结果')
      q.completeRun.run(JSON.stringify(data || {}), JSON.stringify({ parsedResults, unavailableReason }), nowIso(), nowIso(), id)
      return { status: 'completed' }
    } catch (error) {
      if (error?.name === 'AbortError') {
        q.updateRunStatus.run('cancelled', nowIso(), id)
        return { status: 'cancelled' }
      }
      q.failRun.run(error?.message || '运行失败', nowIso(), nowIso())
      return { status: 'failed', error: error?.message }
    } finally {
      controllers.delete(id)
    }
  }

  // ── 异步轮询（waiting → completed/failed；预算 2h）──
  const pollWaitingRun = async (run, attempts = 0) => {
    const taskLink = JSON.parse(run.taskLink || '{}')
    const taskId = normalizeTaskId(taskLink.taskId)
    if (!taskId) {
      q.failRun.run('任务标识无效', nowIso(), nowIso())
      return
    }
    const provider = taskLink.providerId ? getProvider(taskLink.providerId) : null
    const vendorQuery = taskLink.query || null
    const authHeaders = provider
      ? buildProviderAuthHeaders(provider, getProviderApiKey(provider.id) || globalKey())
      : { Authorization: `Bearer ${globalKey()}` }

    let pollUrl
    if (vendorQuery) {
      const queryPath = applyProviderBaseUrl(provider, String(vendorQuery.path).replace('{taskId}', taskId))
      const resolved = resolveTarget(provider, queryPath)
      pollUrl = resolved.url
      Object.assign(authHeaders, resolved.auth)
    } else {
      pollUrl = `${gatewayBase()}/v1/tasks/${encodeURIComponent(taskId)}?view=normalized`
    }

    try {
      const resp = await fetch(pollUrl, { method: vendorQuery?.method || 'GET', headers: authHeaders })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        const message = data?.error?.message || data?.message || `Task query failed (${resp.status})`
        if ([401, 403].includes(resp.status)) {
          // 鉴权问题不烧预算，等下一轮（用户可能正在修 Key）
          return
        }
        if ([400, 404].includes(resp.status)) {
          q.failRun.run(String(message), nowIso(), nowIso())
          return
        }
        if (!RETRYABLE_HTTP_STATUSES.has(resp.status) && resp.status < 500) {
          q.failRun.run(String(message), nowIso(), nowIso())
          return
        }
      } else if (vendorQuery) {
        const rawStatus = getNestedValue(data, vendorQuery.statusPath)
        const statusValue = String(rawStatus ?? getNestedValue(data, 'status') ?? '').toLowerCase()
        const failedDetail = vendorQuery.failedPath ? getNestedValue(data, vendorQuery.failedPath) : null
        const isCompleted = (vendorQuery.completedValues || []).map((v) => String(v).toLowerCase()).includes(statusValue)
        const isFailed = !!failedDetail || (vendorQuery.failedValues || []).map((v) => String(v).toLowerCase()).includes(statusValue)
        if (isCompleted) {
          await finishTaskRun(run, taskLink, data, provider, authHeaders)
          return
        }
        if (isFailed) {
          q.failRun.run(data?.error?.message || data?.message || '任务处理失败', nowIso(), nowIso())
          return
        }
        // 未识别状态视为处理中，继续轮询
      } else {
        const status = String(data?.status || '').toUpperCase()
        if (status === 'COMPLETED' || status === 'SUCCEEDED') {
          await finishTaskRun(run, taskLink, data?.result ?? data, null, authHeaders)
          return
        }
        if (status === 'FAILED' || status === 'ERROR') {
          q.failRun.run(data?.error?.message || data?.message || '任务处理失败', nowIso(), nowIso())
          return
        }
      }
    } catch (error) {
      if (error?.name === 'AbortError') return
      // 网络抖动等下一轮
    }
    if (attempts + 1 >= POLL_MAX_ATTEMPTS) {
      q.failRun.run('任务超时（约 2 小时）仍未完成', nowIso(), nowIso())
    }
  }

  const finishTaskRun = async (run, taskLink, data, provider, authHeaders) => {
    const adapter = getAdapter(taskLink.protocolKey)
    const { parsedResults, unavailableReason } = await extractRunResults({
      adapter, data, resultType: taskLink.resultType || 'text', outputSchema: null,
      providerId: taskLink.providerId, authHeaders, signal: undefined,
    })
    if (MEDIA_RESULT_TYPES.has(taskLink.resultType) && parsedResults.length === 0 && !unavailableReason) {
      q.failRun.run('任务已完成，但未返回可用媒体结果', nowIso(), nowIso())
      return
    }
    q.completeRun.run(JSON.stringify(data || {}), JSON.stringify({ parsedResults, unavailableReason }), nowIso(), nowIso(), run.id)
  }

  // ── ticker：轮询 waiting 任务 + 清理 7 天前已完成记录 ──
  const attemptsByRun = new Map()
  let tickCount = 0
  const tick = async () => {
    try {
      for (const row of q.listRunsWithTask.all()) {
        attemptsByRun.set(row.id, (attemptsByRun.get(row.id) || 0) + 1)
        await pollWaitingRun(row, attemptsByRun.get(row.id))
      }
      for (const id of [...attemptsByRun.keys()]) {
        const row = q.getRun.get(id)
        if (!row || row.status !== 'waiting') attemptsByRun.delete(id)
      }
      tickCount += 1
      if (tickCount % 144 === 0) { // ~1 天清一次（10s 间隔 × 144 ≈ 24 分钟一轮错开，取整为周期性）
        const cutoff = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
        q.purgeOldRuns.run(cutoff)
      }
    } catch (error) {
      console.error('[engine] ticker error:', error?.message)
    }
  }
  const ticker = setInterval(tick, POLL_INTERVAL)
  ticker.unref?.()

  // 启动时恢复：上次进程中断遗留的 queued/running 转失败（等待中的任务继续轮询）
  for (const row of q.listActiveRuns.all()) {
    if (row.status === 'queued' || row.status === 'running') {
      q.failRun.run('服务重启导致运行中断，请重新发起', nowIso(), nowIso())
    }
  }

  // ── 对外 API ──
  return {
    /** 提交运行：落库 queued → 后台执行；立即返回 runId */
    submitRun: async ({ projectId = '', nodeId = '', model, endpointPath, formData }) => {
      const id = `run_${Date.now()}_${randomUUID().slice(0, 8)}`
      q.putRun.run(id, projectId, nodeId, String(model || ''), String(endpointPath || ''), JSON.stringify(formData || {}), 'queued', nowIso(), nowIso())
      // 异步执行，不 await——POST /api/runs 立即返回
      executeRun(q.getRun.get(id)).catch((error) => console.error('[engine] executeRun:', error))
      return id
    },
    getRun: (id) => q.getRun.get(id),
    /** run 行 → API 出参（result/parsedResults 反序列化） */
    presentRun: (run) => {
      let parsedResults = null
      let unavailableReason = ''
      try {
        const parsed = JSON.parse(run.parsedResults || 'null')
        parsedResults = parsed?.parsedResults ?? null
        unavailableReason = parsed?.unavailableReason || ''
      } catch {}
      let result = null
      try { result = JSON.parse(run.result || 'null') } catch {}
      return {
        id: run.id, projectId: run.projectId, nodeId: run.nodeId,
        status: run.status, result, parsedResults, unavailableReason,
        error: run.error || '', createdAt: run.createdAt, updatedAt: run.updatedAt,
      }
    },
    listActiveRuns: () => q.listActiveRuns.all(),
    cancelRun: (id) => {
      controllers.get(id)?.abort()
      const row = q.getRun.get(id)
      if (row && (row.status === 'queued' || row.status === 'running' || row.status === 'waiting')) {
        q.updateRunStatus.run('cancelled', nowIso(), id)
        return true
      }
      return false
    },
    /** 设置页连通测试：服务端代发（Key 用服务端存的） */
    testProvider: async (providerId) => {
      const provider = getProvider(providerId)
      if (!provider) return { ok: false, message: '厂商不存在' }
      const { url, auth } = resolveTarget(provider, providerTestUrl(provider))
      try {
        const resp = await fetch(url, { headers: auth })
        return { ok: resp.ok, status: resp.status, message: resp.ok ? '连通正常' : `HTTP ${resp.status}` }
      } catch (error) {
        return { ok: false, message: error?.message || String(error) }
      }
    },
    filesDir,
  }
}
