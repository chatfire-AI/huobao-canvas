import { ep, model, messagesField, temperatureField, maxTokensField, schema, t } from './_shared.js'

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

// 思考模式请求体为 thinking:{type:'enabled'|'disabled'}：模板语言无布尔→字符串转换，
// thinking 用 select 直存 enabled/disabled，由 inputTransform 包成官方对象；
// 两端点共用此 schema，thinking 对象在 claude 协议层被忽略（官方默认即开启）
const chatSchema = () => schema({
  protocolKey: 'openai-chat',
  input: [
    messagesField,
    { ...temperatureField(), description: t('deepseek.temperatureDesc') },
    maxTokensField(),
    { key: 'thinking', label: t('fields.thinking'), type: 'select', defaultValue: 'enabled', options: ['enabled', 'disabled'],
      description: t('deepseek.thinkingDesc') },
    { key: 'reasoning_effort', label: t('fields.reasoningEffort'), type: 'select', defaultValue: 'high', options: ['low', 'high', 'max'] },
  ],
  inputTransform: {
    messages: '$${messages}',
    temperature: '$${temperature}',
    max_tokens: '$${max_tokens}',
    thinking: { type: '$${thinking}' },
    reasoning_effort: '$${reasoning_effort}',
  },
})

// models 用 getter 定义：每次读取重建，schema 内文案（t()）跟随语言切换
Object.defineProperty(provider, 'models', {
  enumerable: true,
  get: () => [
  model(provider, {
    name: 'deepseek-v4-pro',
    fullName: 'DeepSeek V4 Pro',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-01-01',
    endpoints: [
      ep(provider.proxyPrefix, '/v1/chat/completions', { capability: 'CHAT', protocolKey: 'openai-chat' }),
      ep(provider.proxyPrefix, '/anthropic/v1/messages', { capability: 'CHAT', protocolKey: 'claude', canvasModeLabel: t('canvasMode.claudeProtocol') }),
    ],
    modelSchema: chatSchema(),
  }),
  model(provider, {
    name: 'deepseek-v4-flash',
    fullName: 'DeepSeek V4 Flash',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-01-01',
    endpoints: [
      ep(provider.proxyPrefix, '/v1/chat/completions', { capability: 'CHAT', protocolKey: 'openai-chat' }),
      ep(provider.proxyPrefix, '/anthropic/v1/messages', { capability: 'CHAT', protocolKey: 'claude', canvasModeLabel: t('canvasMode.claudeProtocol') }),
    ],
    modelSchema: chatSchema(),
  }),
  ],
})

export default provider
