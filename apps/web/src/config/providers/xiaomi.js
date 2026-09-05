import { ep, model, messagesField, temperatureField, maxTokensField, schema } from './_shared.js'

const provider = {
  id: 'xiaomi',
  label: '小米 MiMo',
  icon: 'xiaomi-color.png',
  docsUrl: 'https://mimo.mi.com',
  baseUrl: 'https://api.xiaomimimo.com',
  proxyPrefix: '/official/xiaomi',
  auth: { type: 'bearer' },
  testPath: '/v1/models',
}

// MiMo 开放平台为 OpenAI 兼容协议（/v1/chat/completions，Bearer 鉴权）
const chatEp = ep(provider.proxyPrefix, '/v1/chat/completions', { capability: 'CHAT', protocolKey: 'openai-chat' })

// 思考模式下 temperature 强制 1.0（官方文档），仅关闭思考时可调
const mimoTemperatureField = { ...temperatureField(1.5), description: '采样温度，值越高输出越随机；思考模式下强制 1.0' }

provider.models = [
  // 全模态理解：图片/音频/视频输入、深度思考、1M 上下文 / 128K 输出
  model(provider, {
    name: 'mimo-v2.5',
    fullName: 'MiMo V2.5',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-04-23',
    endpoints: [chatEp],
    modelSchema: schema({
      protocolKey: 'openai-chat',
      input: [messagesField, mimoTemperatureField, maxTokensField('max_completion_tokens', 32768, 131072)],
      chatConfig: { supportImage: true },
    }),
  }),
  // 文本对话：深度思考、1M 上下文 / 128K 输出、函数调用与联网搜索
  model(provider, {
    name: 'mimo-v2.5-pro',
    fullName: 'MiMo V2.5 Pro',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-04-23',
    endpoints: [chatEp],
    modelSchema: schema({
      protocolKey: 'openai-chat',
      input: [messagesField, mimoTemperatureField, maxTokensField('max_completion_tokens', 32768, 131072)],
    }),
  }),
]

export default provider
