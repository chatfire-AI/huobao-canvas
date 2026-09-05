import { ep, model, schema, messagesField, temperatureField, maxTokensField } from './_shared.js'

const provider = {
  id: 'zhipu',
  label: '智谱 GLM',
  icon: '',
  docsUrl: 'https://docs.bigmodel.cn/cn/api',
  baseUrl: 'https://open.bigmodel.cn',
  proxyPrefix: '/official/zhipu',
  auth: { type: 'bearer' },
  testPath: '/api/paas/v4/models',
}

provider.models = [
  model(provider, {
    name: 'glm-5.3',
    fullName: 'GLM 5.3',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-08-14',
    endpoints: [ep(provider.proxyPrefix, '/api/paas/v4/chat/completions', { capability: 'CHAT', protocolKey: 'openai-chat' })],
    modelSchema: schema({
      protocolKey: 'openai-chat',
      input: [messagesField, temperatureField(1), maxTokensField('max_tokens', 65536, 131072)],
    }),
  }),
  model(provider, {
    name: 'glm-5.2',
    fullName: 'GLM 5.2',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-01-01',
    endpoints: [ep(provider.proxyPrefix, '/api/paas/v4/chat/completions', { capability: 'CHAT', protocolKey: 'openai-chat' })],
    modelSchema: schema({
      protocolKey: 'openai-chat',
      input: [messagesField, temperatureField(1), maxTokensField('max_tokens', 65536, 131072)],
    }),
  }),
  model(provider, {
    name: 'glm-5.1',
    fullName: 'GLM 5.1',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2025-12-01',
    endpoints: [ep(provider.proxyPrefix, '/api/paas/v4/chat/completions', { capability: 'CHAT', protocolKey: 'openai-chat' })],
    modelSchema: schema({
      protocolKey: 'openai-chat',
      input: [messagesField, temperatureField(1), maxTokensField('max_tokens', 65536, 131072)],
    }),
  }),
  model(provider, {
    name: 'glm-5',
    fullName: 'GLM 5',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2025-10-01',
    endpoints: [ep(provider.proxyPrefix, '/api/paas/v4/chat/completions', { capability: 'CHAT', protocolKey: 'openai-chat' })],
    modelSchema: schema({
      protocolKey: 'openai-chat',
      input: [messagesField, temperatureField(1), maxTokensField('max_tokens', 65536, 131072)],
    }),
  }),
  model(provider, {
    name: 'glm-5-turbo',
    fullName: 'GLM 5 Turbo',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2025-11-01',
    endpoints: [ep(provider.proxyPrefix, '/api/paas/v4/chat/completions', { capability: 'CHAT', protocolKey: 'openai-chat' })],
    modelSchema: schema({
      protocolKey: 'openai-chat',
      input: [messagesField, temperatureField(1), maxTokensField('max_tokens', 65536, 131072)],
    }),
  }),
  // 多模态视觉对话（图像/视频/文件输入），仍走同一 chat 端点
  model(provider, {
    name: 'glm-5v-turbo',
    fullName: 'GLM 5V Turbo',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-04-01',
    endpoints: [ep(provider.proxyPrefix, '/api/paas/v4/chat/completions', { capability: 'CHAT', protocolKey: 'openai-chat' })],
    modelSchema: schema({
      protocolKey: 'openai-chat',
      input: [messagesField, temperatureField(1), maxTokensField('max_tokens', 65536, 131072)],
      chatConfig: { supportImage: true },
    }),
  }),
  model(provider, {
    name: 'glm-4.7',
    fullName: 'GLM 4.7',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2025-09-01',
    endpoints: [ep(provider.proxyPrefix, '/api/paas/v4/chat/completions', { capability: 'CHAT', protocolKey: 'openai-chat' })],
    // 官方 temperature 范围 [0,1]，与 glm-5.x 一致显式声明 schema
    modelSchema: schema({
      protocolKey: 'openai-chat',
      input: [messagesField, temperatureField(1), maxTokensField('max_tokens', 65536, 131072)],
    }),
  }),
]

export default provider
