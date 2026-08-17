import { ep, model, messagesField, temperatureField, maxTokensField, openaiChatSchema, schema } from './_shared.js'

const provider = {
  id: 'deepseek',
  label: 'DeepSeek',
  icon: 'deepseek-color.png',
  docsUrl: 'https://api-docs.deepseek.com',
  baseUrl: 'https://api.deepseek.com',
  proxyPrefix: '/official/deepseek',
  auth: { type: 'bearer' },
  testPath: '/v1/models',
}

// 官方另有 Anthropic 兼容端点 /anthropic/v1/messages（文档注明 x-api-key 鉴权；
// 本厂商 auth 为 bearer，画布以 Bearer 透传，能否被官方接受以实际联调为准）
provider.models = [
  model(provider, {
    name: 'deepseek-v4-pro',
    fullName: 'DeepSeek V4 Pro',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-01-01',
    endpoints: [
      ep(provider.proxyPrefix, '/v1/chat/completions', { capability: 'CHAT', protocolKey: 'openai-chat' }),
      ep(provider.proxyPrefix, '/anthropic/v1/messages', { capability: 'CHAT', protocolKey: 'claude', canvasModeLabel: 'Claude 协议' }),
    ],
    modelSchema: schema({
      protocolKey: 'openai-chat',
      input: [messagesField, temperatureField(), maxTokensField()],
    }),
  }),
  model(provider, {
    name: 'deepseek-v4-flash',
    fullName: 'DeepSeek V4 Flash',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-01-01',
    endpoints: [
      ep(provider.proxyPrefix, '/v1/chat/completions', { capability: 'CHAT', protocolKey: 'openai-chat' }),
      ep(provider.proxyPrefix, '/anthropic/v1/messages', { capability: 'CHAT', protocolKey: 'claude', canvasModeLabel: 'Claude 协议' }),
    ],
    modelSchema: openaiChatSchema(),
  }),
]

export default provider
