/**
 * 厂商预设校验（Node 直跑）：node scripts/verify-providers.mjs
 *
 * 校验项：
 *  - 厂商记录完整性（id/label/baseUrl/proxyPrefix/auth.type 合法）
 *  - 模型记录最小字段（name/type/factory/enable）
 *  - 端点 path 必须以厂商 proxyPrefix 开头且命中挂载白名单
 *  - protocolKey 必须存在于协议注册表
 *  - ASYNC 端点必须带完整 query 轮询配置
 *  - modelSchema / endpointSchemas JSON 可解析，input 为空数组视为错误（会吞掉回退字段）
 */
import { providerPresets } from '../src/config/providers/index.js'

const MOUNTED_PREFIXES = ['/v1/', '/v1beta/', '/qwen/', '/volcengine/', '/vidu/', '/minimax/', '/official/']
const PROTOCOL_KEYS = new Set([
  'openai-chat', 'openai-responses', 'claude', 'openai-image',
  'gemini', 'dashscope', 'ark', 'async-video',
])
const AUTH_TYPES = new Set(['bearer', 'x-api-key', 'x-goog-api-key', 'token'])
const CAPABILITIES = new Set(['CHAT', 'IMAGE', 'VIDEO'])

let errors = 0
let modelCount = 0
let endpointCount = 0

const fail = (msg) => { errors += 1; console.error(`  ✗ ${msg}`) }

const parseSchema = (raw, where) => {
  if (raw === undefined || raw === null) return null
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (parsed && Array.isArray(parsed.input) && parsed.input.length === 0) {
      fail(`${where}: schema.input 为空数组（等于未声明，会吞掉回退字段）`)
    }
    return parsed
  } catch (error) {
    fail(`${where}: schema JSON 解析失败 ${error.message}`)
    return null
  }
}

for (const provider of providerPresets) {
  console.log(`\n■ ${provider.label} (${provider.id})`)
  if (!provider.id || !provider.label) fail('厂商缺少 id/label')
  if (!provider.baseUrl?.startsWith('https://')) fail(`${provider.id}: baseUrl 非法`)
  if (!provider.proxyPrefix?.startsWith('/official/')) fail(`${provider.id}: proxyPrefix 非法`)
  if (!AUTH_TYPES.has(provider.auth?.type)) fail(`${provider.id}: auth.type 非法: ${provider.auth?.type}`)
  if (!Array.isArray(provider.models) || provider.models.length === 0) fail(`${provider.id}: 无模型`)

  for (const m of provider.models || []) {
    modelCount += 1
    if (!m.name || !m.type || !m.factory) fail(`${provider.id}: 模型缺少 name/type/factory: ${JSON.stringify(m.name)}`)
    if (m.providerId !== provider.id) fail(`${m.name}: providerId 与厂商不一致`)
    if (!Array.isArray(m.endpoints) || m.endpoints.length === 0) {
      fail(`${m.name}: 无端点`)
      continue
    }
    parseSchema(m.modelSchema, `${m.name}.modelSchema`)

    for (const endpoint of m.endpoints) {
      endpointCount += 1
      const tag = `${m.name} ${endpoint.path}`
      if (!endpoint.path?.startsWith(provider.proxyPrefix + '/')) fail(`${tag}: 未以厂商前缀开头`)
      if (!MOUNTED_PREFIXES.some((p) => endpoint.path?.startsWith(p))) fail(`${tag}: 未命中挂载白名单`)
      if (!PROTOCOL_KEYS.has(endpoint.protocolKey)) fail(`${tag}: protocolKey 未注册: ${endpoint.protocolKey}`)
      if (!CAPABILITIES.has(endpoint.capability)) fail(`${tag}: capability 非法: ${endpoint.capability}`)
      if (endpoint.responseMode === 'ASYNC') {
        const q = endpoint.query
        if (!q?.path || !q.path.includes('{taskId}')) fail(`${tag}: 异步端点缺 query.path`)
        if (!q?.statusPath) fail(`${tag}: 异步端点缺 query.statusPath`)
        if (!Array.isArray(q?.completedValues) || !q.completedValues.length) fail(`${tag}: 缺 completedValues`)
        if (!q?.taskIdPath) fail(`${tag}: 缺 taskIdPath`)
      }
    }

    const schema = parseSchema(m.modelSchema, `${m.name}`)
    if (schema?.endpointSchemas) {
      const paths = new Set(m.endpoints.map((e) => e.path))
      for (const [path, sub] of Object.entries(schema.endpointSchemas)) {
        if (!paths.has(path)) fail(`${m.name}: endpointSchemas 键无对应端点: ${path}`)
        parseSchema(sub, `${m.name}.endpointSchemas[${path}]`)
      }
    }
  }
}

console.log(`\n共 ${providerPresets.length} 家厂商 / ${modelCount} 个模型 / ${endpointCount} 个端点`)
if (errors > 0) {
  console.error(`\n✗ 校验失败：${errors} 个问题`)
  process.exit(1)
}
console.log('✓ 厂商预设校验全部通过')
