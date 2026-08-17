/**
 * 本地 API Key 存储（BYOK：Key 只存浏览器 localStorage，不上传任何服务端）
 *
 * 数据结构：keyList = [{ key: string, name: string, createdAt: string }]
 * 兼容旧版 apiKeySession 的 getSessionApiKeys() 返回形状（{ apiKey, ... }）。
 */

const KEY_LIST_STORAGE = 'chatfire_canvas_api_keys'
const CURRENT_KEY_STORAGE = 'chatfire_canvas_current_key'

const read = (storageKey, fallback) => {
  try {
    const raw = window.localStorage.getItem(storageKey)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

const write = (storageKey, value) => {
  window.localStorage.setItem(storageKey, JSON.stringify(value))
}

/** 列出本地保存的 Key（按创建时间倒序） */
export const listApiKeys = () => read(KEY_LIST_STORAGE, [])

/** 保存一个新 Key（重复 key 覆盖名称） */
export const addApiKey = (key, name = '') => {
  const value = String(key || '').trim()
  if (!value) return listApiKeys()
  const list = listApiKeys().filter((item) => item.key !== value)
  list.unshift({ key: value, name: name || 'API Key', createdAt: new Date().toISOString() })
  write(KEY_LIST_STORAGE, list)
  return list
}

export const removeApiKey = (key) => {
  const list = listApiKeys().filter((item) => item.key !== key)
  write(KEY_LIST_STORAGE, list)
  if (getCurrentApiKey() === key) {
    setCurrentApiKey(list[0]?.key || '')
  }
  return list
}

export const getCurrentApiKey = () => window.localStorage.getItem(CURRENT_KEY_STORAGE) || ''

export const setCurrentApiKey = (key) => {
  if (key) window.localStorage.setItem(CURRENT_KEY_STORAGE, key)
  else window.localStorage.removeItem(CURRENT_KEY_STORAGE)
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

const PROVIDER_KEYS_STORAGE = 'chatfire_canvas_provider_keys'

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
  return all
}
