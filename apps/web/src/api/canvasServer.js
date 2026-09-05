/**
 * 画布服务端存储客户端（apps/server，SQLite 落地）
 *
 * pingCanvasServer() 探测一次并缓存结果：可用则画布数据直存服务端 SQLite
 *（任何浏览器打开同一部署即同一份数据）；不可用（本地 dev 未起服务 / 桌面端）
 * 由 useCanvasStorage 回退 IndexedDB。
 *
 * 方法签名与 Dexie 存储适配器一一对应（useCanvasStorage.createDexieStore）。
 */
import { appFetch } from '@/utils/desktopBridge.js'

const PING_TIMEOUT = 1500

let availabilityPromise = null

export const pingCanvasServer = () => {
  availabilityPromise ||= (async () => {
    try {
      const resp = await appFetch('/api/healthz', { signal: AbortSignal.timeout(PING_TIMEOUT) })
      return resp.ok
    } catch {
      return false
    }
  })()
  return availabilityPromise
}

const request = async (path, { method = 'GET', body } = {}) => {
  const resp = await appFetch(path, {
    method,
    ...(body !== undefined ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  })
  if (resp.status === 404) return null
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}))
    throw new Error(data?.message || `画布服务请求失败(${resp.status})`)
  }
  return resp.json()
}

export const createServerStore = () => ({
  getProject: (id) => request(`/api/projects/${encodeURIComponent(id)}`),
  putProject: (project) => request('/api/projects', { method: 'POST', body: project }),
  updateProject: (id, patch) => request(`/api/projects/${encodeURIComponent(id)}`, { method: 'PUT', body: patch }),
  getGraph: (projectId) => request(`/api/graphs/${encodeURIComponent(projectId)}`),
  putGraph: (graph) => request(`/api/graphs/${encodeURIComponent(graph.projectId)}`, { method: 'PUT', body: graph }),
  deleteProjectAndGraph: (id) => request(`/api/projects/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  listProjectsWithCounts: () => request('/api/projects'),
})

// ── 设置（API Key / baseUrl / 网关地址）镜像 ──

export const saveSettingsToServer = (snapshot) =>
  request('/api/settings', { method: 'PUT', body: snapshot })

export const fetchSettingsFromServer = () => request('/api/settings')

/**
 * 启动时设置对账：服务端非空 → 以服务端为准覆盖本地（换浏览器拿到全部 Key）；
 * 服务端空且本地有数据 → 上传一次（首连搬迁）。
 */
export const syncSettingsMirror = async () => {
  if (!(await pingCanvasServer())) return false
  const remote = await fetchSettingsFromServer()
  const hasRemoteData = remote && Object.values(remote).some((v) =>
    v && (typeof v !== 'object' || Object.keys(v).length > 0))
  const { exportMirrorSnapshot, importMirrorSnapshot } = await import('@/utils/apiKeySession.js')
  if (hasRemoteData) {
    importMirrorSnapshot(remote, { override: true })
    return true
  }
  const local = exportMirrorSnapshot()
  const hasLocalData = Object.values(local).some((v) =>
    v && (typeof v !== 'object' || Object.keys(v).length > 0))
  if (hasLocalData) await saveSettingsToServer(local)
  return false
}

// ── 运行队列（全量服务端执行；浏览器提交后轮询，刷新凭 runId 恢复）──

let serverRunAvailable = null

/** 服务端执行模式是否可用（探测一次缓存；探测完成前视为 false 走浏览器链路） */
export const isServerRunMode = () => {
  if (serverRunAvailable !== null) return Promise.resolve(serverRunAvailable)
  return pingCanvasServer().then((ok) => {
    serverRunAvailable = ok
    return ok
  })
}

export const submitRunToServer = (payload) =>
  request('/api/runs', { method: 'POST', body: payload })

export const getServerRun = (runId) => request(`/api/runs/${encodeURIComponent(runId)}`)

export const cancelServerRun = (runId) =>
  request(`/api/runs/${encodeURIComponent(runId)}`, { method: 'DELETE' })

/** 轮询直到终态（completed/failed/cancelled）；signal 中止即抛 AbortError */
export const pollServerRun = async (runId, { signal, interval = 1000 } = {}) => {
  const wait = (ms) => new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(signal.reason || new DOMException('Aborted', 'AbortError')); return }
    const timer = setTimeout(done, ms)
    function done() { signal?.removeEventListener('abort', cancelled); resolve() }
    function cancelled() { clearTimeout(timer); reject(signal.reason || new DOMException('Aborted', 'AbortError')) }
    signal?.addEventListener('abort', cancelled, { once: true })
  })
  for (;;) {
    const run = await getServerRun(runId)
    if (['completed', 'failed', 'cancelled'].includes(run?.status)) return run
    await wait(interval)
  }
}

export const testProviderOnServer = (providerId) =>
  request(`/api/providers/${encodeURIComponent(providerId)}/test`, { method: 'POST' })
