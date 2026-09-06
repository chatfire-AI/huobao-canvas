/**
 * API Key 存储（默认 localStorage；服务端可用时镜像到服务端 SQLite）
 *
 * 数据结构：keyList = [{ key: string, name: string, createdAt: string }]
 * 兼容旧版 apiKeySession 的 getSessionApiKeys() 返回形状（{ apiKey, ... }）。
 *
 * 双轨语义：
 *  - 浏览器：localStorage 仍是唯一同步读取源（9 个消费方全同步，零改动）
 *  - 镜像：所有 setter 触发防抖 mirrorToServer()，把 Key/baseUrl/网关地址整体
 *    PUT 到 apps/server 的 settings 表；服务端不可用静默忽略
 *  - 启动拉取：canvas app 初始化时 syncSettingsFromServer()——服务端非空则以
 *    服务端为准覆盖 localStorage（换浏览器即拿到全部 Key）
 *  - Node（apps/server engine）：setKeyStoreBackend() 注入 SQLite 后端后，
 *    providers/index.js 的 getProviderConfig 等在此读到服务端数据
 */

const KEY_LIST_STORAGE = 'chatfire_canvas_api_keys'
const CURRENT_KEY_STORAGE = 'chatfire_canvas_current_key'
const PROVIDER_KEYS_STORAGE = 'chatfire_canvas_provider_keys'
const GATEWAY_BASE_STORAGE = 'chatfire_canvas_gateway_base'

// 网关域名迁移：api.chatfire.site → api.firemux.com（本地/服务端旧配置自动改写）
const HOST_MIGRATIONS = [
  ['api.chatfire.site', 'api.firemux.com'],
  ['chatfire.site', 'firemux.com'],
]

export const normalizeGatewayHost = (value) => {
  if (typeof value !== 'string' || !value) return value
  let next = value
  for (const [from, to] of HOST_MIGRATIONS) next = next.replaceAll(from, to)
  return next
}

/** 把已存储的网关地址/厂商 baseUrl 覆盖里的旧域名改写为新域名（幂等） */
export const migrateStoredGatewayHosts = () => {
  const gateway = backend.readRaw(GATEWAY_BASE_STORAGE)
  if (gateway) {
    const next = normalizeGatewayHost(gateway)
    if (next !== gateway) backend.writeRaw(GATEWAY_BASE_STORAGE, next)
  }
  const providers = read(PROVIDER_KEYS_STORAGE, {})
  let touched = false
  for (const cfg of Object.values(providers)) {
    if (cfg?.baseUrl) {
      const next = normalizeGatewayHost(cfg.baseUrl)
      if (next !== cfg.baseUrl) {
        cfg.baseUrl = next
        touched = true
      }
    }
  }
  if (touched) write(PROVIDER_KEYS_STORAGE, providers)
}

// ── 存储后端（默认 localStorage；Node/服务端可注入替换）──
const backend = {
  readRaw: (storageKey) => {
    try {
      return globalThis.window?.localStorage?.getItem(storageKey) ?? null
    } catch {
      return null
    }
  },
  writeRaw: (storageKey, raw) => {
    try {
      globalThis.window?.localStorage?.setItem(storageKey, raw)
    } catch {}
  },
  removeRaw: (storageKey) => {
    try {
      globalThis.window?.localStorage?.removeItem(storageKey)
    } catch {}
  },
}

/** 注入存储后端（apps/server engine 启动时调用；浏览器端不使用） */
export const setKeyStoreBackend = (impl) => {
  Object.assign(backend, impl)
  migrateStoredGatewayHosts()
}

const read = (storageKey, fallback) => {
  const raw = backend.readRaw(storageKey)
  if (raw == null) return fallback
  try {
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

const write = (storageKey, value) => {
  backend.writeRaw(storageKey, JSON.stringify(value))
}

// 启动即迁移本地已存旧域名（Node 端默认后端读不到值，安全空转）
migrateStoredGatewayHosts()

// ── 服务端镜像（fire-and-forget，防抖合并）──
let mirrorTimer = null

/** 当前可镜像的设置快照（Key/模型目录覆盖明文；仅发给自部署的 apps/server） */
export const exportMirrorSnapshot = () => ({
  [KEY_LIST_STORAGE]: read(KEY_LIST_STORAGE, []),
  [CURRENT_KEY_STORAGE]: backend.readRaw(CURRENT_KEY_STORAGE) || '',
  [PROVIDER_KEYS_STORAGE]: read(PROVIDER_KEYS_STORAGE, {}),
  [GATEWAY_BASE_STORAGE]: backend.readRaw(GATEWAY_BASE_STORAGE) || '',
  'chatfire_canvas_catalog': read('chatfire_canvas_catalog', {}),
})

/** 把快照写回本地（服务端权威时使用；跳过空值避免抹掉本地） */
export const importMirrorSnapshot = (snapshot, { override = false } = {}) => {
  if (!snapshot || typeof snapshot !== 'object') return false
  let touched = false
  for (const [name, value] of Object.entries(snapshot)) {
    if (value == null) continue
    const local = backend.readRaw(name)
    // 旧网关域名的字符串值（网关地址、厂商 baseUrl 覆盖）导入时一并改写
    const normalized = typeof value === 'string' ? normalizeGatewayHost(value) : value
    if (name === PROVIDER_KEYS_STORAGE && normalized && typeof normalized === 'object') {
      for (const cfg of Object.values(normalized)) {
        if (cfg?.baseUrl) cfg.baseUrl = normalizeGatewayHost(cfg.baseUrl)
      }
    }
    const incoming = typeof normalized === 'string' ? normalized : JSON.stringify(normalized)
    if (!override && local === incoming) continue
    backend.writeRaw(name, incoming)
    touched = true
  }
  return touched
}

const mirrorToServer = () => {
  if (!globalThis.window) return // Node 端（后端注入）不回环镜像
  if (mirrorTimer) clearTimeout(mirrorTimer)
  mirrorTimer = setTimeout(async () => {
    mirrorTimer = null
    try {
      const { saveSettingsToServer } = await import('@/api/canvasServer.js')
      await saveSettingsToServer(exportMirrorSnapshot())
    } catch {
      /* 服务端不可用：本地仍已写入，静默 */
    }
  }, 300)
}

/** 供非 apiKeySession 模块触发镜像（如模型目录覆盖 localCatalog） */
export const mirrorSettingsToServer = () => mirrorToServer()

/** 列出本地保存的 Key（按创建时间倒序） */
export const listApiKeys = () => read(KEY_LIST_STORAGE, [])

/** 保存一个新 Key（重复 key 覆盖名称） */
export const addApiKey = (key, name = '') => {
  const value = String(key || '').trim()
  if (!value) return listApiKeys()
  const list = listApiKeys().filter((item) => item.key !== value)
  list.unshift({ key: value, name: name || 'API Key', createdAt: new Date().toISOString() })
  write(KEY_LIST_STORAGE, list)
  mirrorToServer()
  return list
}

export const removeApiKey = (key) => {
  const list = listApiKeys().filter((item) => item.key !== key)
  write(KEY_LIST_STORAGE, list)
  if (getCurrentApiKey() === key) {
    setCurrentApiKey(list[0]?.key || '')
  }
  mirrorToServer()
  return list
}

export const getCurrentApiKey = () => backend.readRaw(CURRENT_KEY_STORAGE) || ''

export const setCurrentApiKey = (key) => {
  if (key) backend.writeRaw(CURRENT_KEY_STORAGE, key)
  else backend.removeRaw(CURRENT_KEY_STORAGE)
  mirrorToServer()
}

/** 用 /v1/models 探测 Key 有效性（不消耗额度） */
export const validateApiKey = async (key, apiBaseUrl = '') => {
  try {
    const resp = await fetch(`${apiBaseUrl}/v1/models`, {
      headers: { Authorization: `Bearer ${key}` },
    })
    return resp.ok
  } catch {
    return false
  }
}

/** 兼容旧接口：返回 [{ apiKey, name }] 形状 */
export const getSessionApiKeys = () =>
  listApiKeys().map((item) => ({ apiKey: item.key, name: item.name }))

// ── 厂商级 Key（官方直连模式）：{ providerId: { key, baseUrl? } } ──

export const getProviderKeys = () => read(PROVIDER_KEYS_STORAGE, {})

/** 厂商完整配置（Key + baseUrl 覆盖） */
export const getProviderConfig = (providerId) => getProviderKeys()[providerId] || {}

export const getProviderApiKey = (providerId) =>
  String(getProviderConfig(providerId).key || '').trim()

export const setProviderApiKey = (providerId, key, baseUrl) => {
  const all = getProviderKeys()
  if (key) {
    all[providerId] = { ...all[providerId], key: String(key).trim(), ...(baseUrl ? { baseUrl } : {}) }
  } else {
    delete all[providerId]
  }
  write(PROVIDER_KEYS_STORAGE, all)
  mirrorToServer()
  return all
}

/** 仅更新厂商 baseUrl 覆盖（不动 Key；空串 = 清除覆盖回默认） */
export const setProviderBaseUrl = (providerId, baseUrl) => {
  const all = getProviderKeys()
  const value = String(baseUrl || '').trim()
  if (!all[providerId]) all[providerId] = {}
  if (value) all[providerId].baseUrl = value
  else delete all[providerId].baseUrl
  if (!all[providerId].key && !all[providerId].baseUrl) delete all[providerId]
  write(PROVIDER_KEYS_STORAGE, all)
  mirrorToServer()
  return all
}

/** 网关地址（与 config/index.js 的 setGatewayBaseUrl 联动镜像） */
export const setGatewayBaseMirror = (url) => {
  const value = String(url || '').trim().replace(/\/$/, '')
  if (value) backend.writeRaw(GATEWAY_BASE_STORAGE, value)
  else backend.removeRaw(GATEWAY_BASE_STORAGE)
  mirrorToServer()
}
