/**
 * 厂商预设共享构造器
 *
 * 端点 path 一律带厂商反代前缀（proxyPrefix，如 /official/openai），
 * dev 由 vite proxy、生产由 nginx 剥离前缀转发到厂商官方域名（规避浏览器 CORS）。
 * protocolKey 显式声明（对应 protocols/registry.js 的适配器键），路径推断仅作兜底。
 */

/** 端点记录：path 自动拼 proxyPrefix */
export const ep = (proxyPrefix, path, opts = {}) => ({
  path: `${proxyPrefix}${path}`,
  method: 'POST',
  contentType: 'JSON',
  responseMode: 'SYNC',
  source: 'official',
  ...opts,
})

/** 模型记录 */
export const model = (provider, m) => ({
  factory: provider.id,
  providerId: provider.id,
  providerCode: provider.id,
  enable: true,
  source: 'official',
  ...m,
})

// ── 常用字段（FieldRecord，见 playground/constants 的 DEFAULT_*_PARAMS 样例） ──

export const messagesField = {
  key: 'messages', label: 'Messages', type: 'textarea', required: true,
  defaultValue: JSON.stringify([{ role: 'user', content: 'Hello' }], null, 2),
  description: '对话消息数组：[{"role":"user","content":"..."}]',
}

export const temperatureField = (max = 2) => ({
  key: 'temperature', label: 'Temperature', type: 'slider',
  min: 0, max, step: 0.1, defaultValue: 0.7,
  description: '采样温度，值越高输出越随机',
})

export const maxTokensField = (key = 'max_tokens', def = 4096, max = 128000) => ({
  key, label: 'Max Tokens', type: 'number', min: 1, max, defaultValue: def,
  description: '最大输出 token 数',
})

export const promptField = (def = '') => ({
  key: 'prompt', label: 'Prompt', type: 'textarea', required: true,
  defaultValue: def, description: '提示词',
})

/** 参考图字段（画布上游图片注入入口，配合 inputBindings.sourceImage） */
export const sourceImageField = (label = '参考图') => ({
  key: 'image', label, type: 'image', description: '可上传或由上游节点传入',
})

/** OpenAI 兼容 chat 模型的标准 schema（temperature 可选） */
export const openaiChatSchema = ({ withSampling = true, maxTokensKey = 'max_tokens' } = {}) => ({
  protocolKey: 'openai-chat',
  input: [
    messagesField,
    ...(withSampling ? [temperatureField()] : []),
    maxTokensField(maxTokensKey),
  ],
})

/** 生成 JSON 字符串（modelSchema 在主仓契约里是 JSON 字符串，本地统一 stringify） */
export const schema = (obj) => JSON.stringify(obj)
