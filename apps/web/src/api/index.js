/**
 * 模型目录客户端（只读）
 *
 * 数据源策略：
 *  - 默认请求 `${API_BASE_URL}/sys/model/*`（ChatFire 网关的公开模型目录，
 *    返回完整 schema：端点、参数定义、输入输出契约）
 *  - 若目录接口不可用（非 ChatFire 端点），回退 OpenAI 标准 `/v1/models`，
 *    仅提供模型名列表，参数表单退化为端点默认 schema
 *
 * 响应包：{ code: 200, data: ... }，非 200 抛出 Error(message)。
 */
import { API_BASE_URL } from '@/config'
import { getCurrentApiKey } from '@/utils/apiKeySession'
import { appFetch } from '@/utils/desktopBridge'

const request = async (path, params = {}) => {
  const url = new URL(`${API_BASE_URL}${path}`, window.location.origin)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value)
    }
  }
  const headers = {}
  const apiKey = getCurrentApiKey()
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`

  const resp = await appFetch(url, { headers })
  const body = await resp.json().catch(() => null)
  if (!resp.ok || (body && body.code !== undefined && body.code !== 200)) {
    throw new Error(body?.message || `目录请求失败(${resp.status})`)
  }
  return body?.data !== undefined ? body.data : body
}

// 分页查询模型列表
export const getModelPage = (params) => request('/sys/model/page', params)

// 根据名称获取模型
export const getModelByName = (name) =>
  request(`/sys/model/name/${encodeURIComponent(name)}`)

// 根据全称获取模型
export const getModelByFullName = (fullName) =>
  request(`/sys/model/fullName`, { fullName })

// 获取所有模型类型
export const getModelTypes = () => request('/sys/model/types')

// 根据类型获取模型
export const getModelByType = (type) => request('/sys/model/byType', { type })

/**
 * OpenAI 标准 /v1/models 回退：映射为最小模型记录
 * （无 schema，参数表单使用端点默认值）
 */
export const getOpenAIModels = async () => {
  const headers = {}
  const apiKey = getCurrentApiKey()
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`
  const resp = await appFetch(`${API_BASE_URL}/v1/models`, { headers })
  if (!resp.ok) throw new Error(`/v1/models 请求失败(${resp.status})`)
  const body = await resp.json()
  return (body?.data || []).map((item) => ({
    name: item.id,
    fullName: item.id,
    factory: String(item.id || '').split('/')[0] || '其他',
    enable: true,
  }))
}
