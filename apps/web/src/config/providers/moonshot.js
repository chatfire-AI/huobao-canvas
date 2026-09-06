import { ep, model, schema, messagesField, maxTokensField, t } from './_shared.js'

const provider = {
  id: 'moonshot',
  label: 'Moonshot Kimi',
  icon: 'kimi-color.png',
  docsUrl: 'https://platform.kimi.com/docs',
  baseUrl: 'https://api.moonshot.cn',
  proxyPrefix: '/official/moonshot',
  auth: { type: 'bearer' },
  testPath: '/v1/models',
}

// Kimi K2.6/K2.7/K3 全系 temperature 不可修改（K3 传非默认值会报错），schema 均不含采样参数；
// 三者均支持图像/视频多模态输入
// models 用 getter 定义：每次读取重建，schema 内文案（t()）跟随语言切换
Object.defineProperty(provider, 'models', {
  enumerable: true,
  get: () => [
  model(provider, {
    name: 'kimi-k3',
    fullName: 'Kimi K3',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-01-08',
    endpoints: [ep(provider.proxyPrefix, '/v1/chat/completions', { capability: 'CHAT', protocolKey: 'openai-chat' })],
    modelSchema: schema({
      protocolKey: 'openai-chat',
      input: [messagesField, maxTokensField('max_completion_tokens', 131072, 1048576)],
      chatConfig: { supportImage: true },
    }),
  }),
  model(provider, {
    name: 'kimi-k2.7-code',
    fullName: 'Kimi K2.7 Code',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-02-01',
    endpoints: [ep(provider.proxyPrefix, '/v1/chat/completions', { capability: 'CHAT', protocolKey: 'openai-chat' })],
    modelSchema: schema({
      protocolKey: 'openai-chat',
      input: [messagesField, maxTokensField('max_completion_tokens')],
      chatConfig: { supportImage: true },
    }),
  }),
  model(provider, {
    name: 'kimi-k2.6',
    fullName: 'Kimi K2.6',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2025-11-01',
    endpoints: [ep(provider.proxyPrefix, '/v1/chat/completions', { capability: 'CHAT', protocolKey: 'openai-chat' })],
    modelSchema: schema({
      protocolKey: 'openai-chat',
      input: [messagesField, maxTokensField('max_completion_tokens')],
      chatConfig: { supportImage: true },
    }),
  }),
  ],
})

export default provider
