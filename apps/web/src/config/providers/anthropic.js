import { ep, model, messagesField, temperatureField, maxTokensField, schema, t } from './_shared.js'

const provider = {
  id: 'anthropic',
  label: 'Anthropic Claude',
  icon: 'claude-color.png',
  docsUrl: 'https://docs.anthropic.com/en/api/messages',
  baseUrl: 'https://api.anthropic.com',
  proxyPrefix: '/official/anthropic',
  auth: { type: 'x-api-key', extraHeaders: { 'anthropic-version': '2023-06-01' } },
  testPath: '/v1/models',
}

// Claude 必填 max_tokens；4.5/4.6 系支持采样参数（max_tokens 上限：4.5 系 64k，4.6 系 128k）
const baseInput = (maxTokens = 128000) => [
  messagesField,
  maxTokensField('max_tokens', 4096, maxTokens),
  temperatureField(1),
]

// 支持扩展思考（{"type":"enabled","budget_tokens":N}）的模型：4.5 全系、4.6 全系（4.6 上已弃用但仍可用）
const claudeThinkingSchema = (maxTokens = 128000) => schema({
  protocolKey: 'claude',
  input: [
    ...baseInput(maxTokens),
    { key: 'thinking', label: t('fields.thinking'), type: 'switch', defaultValue: false, description: t('anthropic.thinkingDesc') },
    { key: 'thinking_budget', label: t('fields.thinkingBudget'), type: 'number', min: 1024, defaultValue: 4096, description: t('anthropic.thinkingBudgetDesc') },
  ],
})

// 新代际模型（Fable 5 / Opus 4.7+ / Sonnet 5）：发送 temperature/top_p/top_k 会 400，思考仅 adaptive，无 budget_tokens
const claudeAdaptiveSchema = () => schema({
  protocolKey: 'claude',
  input: [
    messagesField,
    maxTokensField('max_tokens'),
  ],
})

// models 用 getter 定义：每次读取重建，schema 内文案（t()）跟随语言切换
Object.defineProperty(provider, 'models', {
  enumerable: true,
  get: () => [
  model(provider, {
    name: 'claude-fable-5',
    fullName: 'Claude Fable 5',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-06-09',
    description: t('anthropic.models.fable5'),
    endpoints: [ep(provider.proxyPrefix, '/v1/messages', { capability: 'CHAT', protocolKey: 'claude' })],
    modelSchema: claudeAdaptiveSchema(),
  }),
  model(provider, {
    name: 'claude-opus-5',
    fullName: 'Claude Opus 5',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-07-23',
    description: t('anthropic.models.opus5'),
    endpoints: [ep(provider.proxyPrefix, '/v1/messages', { capability: 'CHAT', protocolKey: 'claude' })],
    modelSchema: claudeAdaptiveSchema(),
  }),
  model(provider, {
    name: 'claude-opus-4-8',
    fullName: 'Claude Opus 4.8',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-06-01',
    description: t('anthropic.models.opus48'),
    endpoints: [ep(provider.proxyPrefix, '/v1/messages', { capability: 'CHAT', protocolKey: 'claude' })],
    modelSchema: claudeAdaptiveSchema(),
  }),
  model(provider, {
    name: 'claude-opus-4-7',
    fullName: 'Claude Opus 4.7',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-04-01',
    description: t('anthropic.models.opus47'),
    endpoints: [ep(provider.proxyPrefix, '/v1/messages', { capability: 'CHAT', protocolKey: 'claude' })],
    modelSchema: claudeAdaptiveSchema(),
  }),
  model(provider, {
    name: 'claude-opus-4-6',
    fullName: 'Claude Opus 4.6',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-02-07',
    description: t('anthropic.models.opus46'),
    endpoints: [ep(provider.proxyPrefix, '/v1/messages', { capability: 'CHAT', protocolKey: 'claude' })],
    modelSchema: claudeThinkingSchema(),
  }),
  model(provider, {
    name: 'claude-opus-4-5',
    fullName: 'Claude Opus 4.5',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2025-11-24',
    description: t('anthropic.models.opus45'),
    endpoints: [ep(provider.proxyPrefix, '/v1/messages', { capability: 'CHAT', protocolKey: 'claude' })],
    modelSchema: claudeThinkingSchema(64000),
  }),
  model(provider, {
    name: 'claude-sonnet-5',
    fullName: 'Claude Sonnet 5',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2025-11-01',
    description: t('anthropic.models.sonnet5'),
    endpoints: [ep(provider.proxyPrefix, '/v1/messages', { capability: 'CHAT', protocolKey: 'claude' })],
    modelSchema: claudeAdaptiveSchema(),
  }),
  model(provider, {
    name: 'claude-sonnet-4-6',
    fullName: 'Claude Sonnet 4.6',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-03-01',
    description: t('anthropic.models.sonnet46'),
    endpoints: [ep(provider.proxyPrefix, '/v1/messages', { capability: 'CHAT', protocolKey: 'claude' })],
    modelSchema: claudeThinkingSchema(),
  }),
  model(provider, {
    name: 'claude-sonnet-4-5',
    fullName: 'Claude Sonnet 4.5',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2025-09-29',
    description: t('anthropic.models.sonnet45'),
    endpoints: [ep(provider.proxyPrefix, '/v1/messages', { capability: 'CHAT', protocolKey: 'claude' })],
    modelSchema: claudeThinkingSchema(64000),
  }),
  model(provider, {
    name: 'claude-haiku-4-5',
    fullName: 'Claude Haiku 4.5',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2025-10-15',
    description: t('anthropic.models.haiku45'),
    endpoints: [ep(provider.proxyPrefix, '/v1/messages', { capability: 'CHAT', protocolKey: 'claude' })],
    modelSchema: claudeThinkingSchema(64000),
  }),
  ],
})

export default provider
