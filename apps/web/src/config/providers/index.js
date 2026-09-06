/**
 * 厂商官方预设注册表（单一入口）
 *
 * - listProviders()：全部厂商预设
 * - getProvider(id)
 * - collectModels(overrides)：合成模型目录（预设 + 用户自定义/停用覆盖）
 * - buildProviderAuthHeaders(provider, key)：按厂商鉴权方式构造请求头
 * - providerTestUrl(provider, baseUrlOverride)：连通测试 URL（经反代前缀，同源）
 */
import openai from './openai.js'
import anthropic from './anthropic.js'
import gemini from './gemini.js'
import qwen from './qwen.js'
import volcengine from './volcengine.js'
import deepseek from './deepseek.js'
import minimax from './minimax.js'
import moonshot from './moonshot.js'
import zhipu from './zhipu.js'
import xai from './xai.js'
import vidu from './vidu.js'
import xiaomi from './xiaomi.js'
// 相对路径导入：本文件会被 Node 校验脚本直接 import（无 vite alias）
import { getProviderConfig } from '../../utils/apiKeySession.js'
import { t } from './_shared.js'

export const providerPresets = [
  openai, anthropic, gemini, qwen, volcengine, deepseek,
  minimax, moonshot, zhipu, xai, vidu, xiaomi,
]

const byId = new Map(providerPresets.map((p) => [p.id, p]))

export const listProviders = () => providerPresets

export const getProvider = (id) => byId.get(id) || null

/** 模型所属厂商：优先 providerId/factory 命中预设 */
export const getProviderForModel = (m = {}) =>
  byId.get(m.providerId) || byId.get(String(m.factory || '').toLowerCase()) || null

/**
 * 按厂商鉴权方式构造请求头。
 * bearer: Authorization: Bearer <key>（可带 extraHeaders）
 * x-api-key: x-api-key + extraHeaders（Claude: anthropic-version）
 * x-goog-api-key: Gemini 官方
 * token: Authorization: Token <key>（Vidu）
 */
export const buildProviderAuthHeaders = (provider, key) => {
  if (!key) throw new Error(t('errors.apiKeyRequired', { name: provider?.label || t('errors.thatProvider') }))
  const auth = provider?.auth || { type: 'bearer' }
  const extra = auth.extraHeaders || {}
  switch (auth.type) {
    case 'x-api-key':
      return { 'x-api-key': key, ...extra }
    case 'x-goog-api-key':
      return { 'x-goog-api-key': key, ...extra }
    case 'token':
      return { Authorization: `Token ${key}`, ...extra }
    default:
      return { Authorization: `Bearer ${key}`, ...extra }
  }
}

/** 连通测试 URL：走同源反代前缀（支持用户覆盖 baseUrl 时改为绝对地址，CORS 自负） */
export const providerTestUrl = (provider, baseUrlOverride = '') => {
  if (!provider?.testPath) return ''
  const base = baseUrlOverride || provider.proxyPrefix
  return `${base.replace(/\/$/, '')}${provider.testPath}`
}

/**
 * 厂商 baseUrl 覆盖：用户设置页配置后，端点路径中的 proxyPrefix 段替换为覆盖值。
 * - 覆盖为相对路径（/ 开头）：仍走同源反代
 * - 覆盖为绝对地址（http(s)://）：浏览器直连该地址（CORS 由部署方负责）
 * 无覆盖时原样返回（默认 /official/{id} 反代到官方域名）。
 */
export const applyProviderBaseUrl = (provider, path) => {
  if (!provider || typeof path !== 'string') return path
  const override = String(getProviderConfig(provider.id).baseUrl || '').trim().replace(/\/$/, '')
  if (!override || !path.startsWith(provider.proxyPrefix)) return path
  return `${override}${path.slice(provider.proxyPrefix.length)}`
}

/** 厂商当前生效的 baseUrl（展示用）：覆盖值或官方默认 */
export const effectiveProviderBaseUrl = (provider) =>
  String(getProviderConfig(provider?.id)?.baseUrl || '').trim() || provider?.baseUrl || ''

/**
 * 合成模型目录。
 * overrides = { disabledModels: string[], customModels: ModelRecord[], hiddenProviders: string[] }
 * 自定义模型与预设同名时覆盖预设（设置页"编辑预设模型"即落为同名自定义记录）。
 */
export const collectModels = (overrides = {}) => {
  const disabled = new Set(overrides.disabledModels || [])
  const hiddenProviders = new Set(overrides.hiddenProviders || [])
  const customs = new Map((overrides.customModels || []).map((m) => [m.name, m]))
  const models = []
  for (const provider of providerPresets) {
    if (hiddenProviders.has(provider.id)) continue
    for (const m of provider.models) {
      if (disabled.has(m.name)) continue
      models.push(customs.get(m.name) || m)
      customs.delete(m.name)
    }
  }
  for (const m of customs.values()) {
    if (!disabled.has(m.name)) models.push(m)
  }
  return models
}
