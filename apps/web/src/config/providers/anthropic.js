import { ep, model, messagesField, temperatureField, maxTokensField, schema } from './_shared.js'

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
    { key: 'thinking', label: '深度思考', type: 'switch', defaultValue: false, description: '开启扩展思考（thinking.enabled）' },
    { key: 'thinking_budget', label: '思考预算', type: 'number', min: 1024, defaultValue: 4096, description: 'thinking.budget_tokens，须 ≥1024 且小于 max_tokens' },
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

provider.models = [
  model(provider, {
    name: 'claude-fable-5',
    fullName: 'Claude Fable 5',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-06-09',
    description: '旗舰模型，1M 上下文 / 128k 输出；自适应思考恒开启，不支持采样参数；$10/$50 每百万 token',
    endpoints: [ep(provider.proxyPrefix, '/v1/messages', { capability: 'CHAT', protocolKey: 'claude' })],
    modelSchema: claudeAdaptiveSchema(),
  }),
  model(provider, {
    name: 'claude-opus-5',
    fullName: 'Claude Opus 5',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-07-23',
    description: '接近 Fable 5 的智能，价格减半；思考仅 adaptive，不支持采样参数；$5/$25 每百万 token',
    endpoints: [ep(provider.proxyPrefix, '/v1/messages', { capability: 'CHAT', protocolKey: 'claude' })],
    modelSchema: claudeAdaptiveSchema(),
  }),
  model(provider, {
    name: 'claude-opus-4-8',
    fullName: 'Claude Opus 4.8',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-06-01',
    description: '1M 上下文 / 128k 输出；思考仅 adaptive（省略=不思考），不支持采样参数；$5/$25 每百万 token',
    endpoints: [ep(provider.proxyPrefix, '/v1/messages', { capability: 'CHAT', protocolKey: 'claude' })],
    modelSchema: claudeAdaptiveSchema(),
  }),
  model(provider, {
    name: 'claude-opus-4-7',
    fullName: 'Claude Opus 4.7',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-04-01',
    description: '1M 上下文 / 128k 输出；思考仅 adaptive，新增 xhigh effort，不支持采样参数；$5/$25 每百万 token',
    endpoints: [ep(provider.proxyPrefix, '/v1/messages', { capability: 'CHAT', protocolKey: 'claude' })],
    modelSchema: claudeAdaptiveSchema(),
  }),
  model(provider, {
    name: 'claude-opus-4-6',
    fullName: 'Claude Opus 4.6',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-02-07',
    description: '1M 上下文 / 128k 输出；支持采样参数与扩展/自适应思考；$5/$25 每百万 token',
    endpoints: [ep(provider.proxyPrefix, '/v1/messages', { capability: 'CHAT', protocolKey: 'claude' })],
    modelSchema: claudeThinkingSchema(),
  }),
  model(provider, {
    name: 'claude-opus-4-5',
    fullName: 'Claude Opus 4.5',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2025-11-24',
    description: '200k 上下文 / 64k 输出；支持扩展思考，首发 effort 参数（beta）；$5/$25 每百万 token',
    endpoints: [ep(provider.proxyPrefix, '/v1/messages', { capability: 'CHAT', protocolKey: 'claude' })],
    modelSchema: claudeThinkingSchema(64000),
  }),
  model(provider, {
    name: 'claude-sonnet-5',
    fullName: 'Claude Sonnet 5',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2025-11-01',
    description: '1M 上下文 / 128k 输出；自适应思考默认开启，不支持采样参数；标准价 $2/$10 每百万 token',
    endpoints: [ep(provider.proxyPrefix, '/v1/messages', { capability: 'CHAT', protocolKey: 'claude' })],
    modelSchema: claudeAdaptiveSchema(),
  }),
  model(provider, {
    name: 'claude-sonnet-4-6',
    fullName: 'Claude Sonnet 4.6',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-03-01',
    description: '1M 上下文 / 128k 输出；支持采样参数与扩展/自适应思考；$3/$15 每百万 token',
    endpoints: [ep(provider.proxyPrefix, '/v1/messages', { capability: 'CHAT', protocolKey: 'claude' })],
    modelSchema: claudeThinkingSchema(),
  }),
  model(provider, {
    name: 'claude-sonnet-4-5',
    fullName: 'Claude Sonnet 4.5',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2025-09-29',
    description: '200k 上下文（1M 为 beta）/ 64k 输出；支持扩展思考；$3/$15 每百万 token',
    endpoints: [ep(provider.proxyPrefix, '/v1/messages', { capability: 'CHAT', protocolKey: 'claude' })],
    modelSchema: claudeThinkingSchema(64000),
  }),
  model(provider, {
    name: 'claude-haiku-4-5',
    fullName: 'Claude Haiku 4.5',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2025-10-15',
    description: '200k 上下文 / 64k 输出；支持扩展思考；高性价比 $1/$5 每百万 token',
    endpoints: [ep(provider.proxyPrefix, '/v1/messages', { capability: 'CHAT', protocolKey: 'claude' })],
    modelSchema: claudeThinkingSchema(64000),
  }),
]

export default provider
