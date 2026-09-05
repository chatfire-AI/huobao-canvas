import { ep, model, messagesField, maxTokensField, promptField, schema } from './_shared.js'

const provider = {
  id: 'openai',
  label: 'OpenAI',
  icon: 'openai.png',
  docsUrl: 'https://platform.openai.com/docs/api-reference',
  baseUrl: 'https://api.openai.com',
  proxyPrefix: '/official/openai',
  auth: { type: 'bearer' },
  testPath: '/v1/models',
}

const P = provider.proxyPrefix

// GPT-5 系列均为推理模型，不接收 temperature；max tokens 字段因端点而异：
//   /v1/chat/completions → max_completion_tokens
//   /v1/responses        → max_output_tokens
// reasoning_effort 为扁平透传（openai-responses 协议层映射为 reasoning.effort），
// 档位按代际区分：首代 minimal 起步，5.1 起支持 none，5.6 增设 max。
const chatEp = ep(P, '/v1/chat/completions', { capability: 'CHAT', protocolKey: 'openai-chat' })
const responsesEp = ep(P, '/v1/responses', { capability: 'CHAT', protocolKey: 'openai-responses' })

const EFFORTS_FIRST_GEN = ['minimal', 'low', 'medium', 'high']
const EFFORTS_WITH_NONE = ['none', 'low', 'medium', 'high', 'xhigh']
const EFFORTS_5_6 = ['none', 'low', 'medium', 'high', 'xhigh', 'max']

const reasoningEffortField = (options, defaultValue) => ({
  key: 'reasoning_effort', label: '推理力度', type: 'select', defaultValue, options,
})

const chatSchema = (efforts, defaultValue) => schema({
  protocolKey: 'openai-chat',
  input: [
    messagesField,
    maxTokensField('max_completion_tokens'),
    ...(efforts ? [reasoningEffortField(efforts, defaultValue)] : []),
  ],
})

const responsesSchema = (efforts, defaultValue) => schema({
  protocolKey: 'openai-responses',
  input: [
    messagesField,
    maxTokensField('max_output_tokens'),
    ...(efforts ? [reasoningEffortField(efforts, defaultValue)] : []),
  ],
})

const IMAGE_SIZES = ['1024x1024', '1536x1024', '1024x1536', '2048x2048', '2048x1152', '1152x2048', '3840x2160', '2160x3840', 'auto']
const IMAGE_QUALITIES = ['low', 'medium', 'high', 'auto']

provider.models = [
  // ── GPT-5 首代（chat/completions + responses 双端点，走 chat/completions） ──
  model(provider, {
    name: 'gpt-5',
    fullName: 'GPT-5',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2025-08-07',
    endpoints: [chatEp],
    modelSchema: chatSchema(EFFORTS_FIRST_GEN, 'minimal'),
  }),
  model(provider, {
    name: 'gpt-5-mini',
    fullName: 'GPT-5 Mini',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2025-08-07',
    endpoints: [chatEp],
    modelSchema: chatSchema(EFFORTS_FIRST_GEN, 'minimal'),
  }),
  model(provider, {
    name: 'gpt-5-nano',
    fullName: 'GPT-5 Nano',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2025-08-07',
    endpoints: [chatEp],
    modelSchema: chatSchema(EFFORTS_FIRST_GEN, 'minimal'),
  }),
  model(provider, {
    name: 'gpt-5.1',
    fullName: 'GPT-5.1',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2025-11-13',
    endpoints: [chatEp],
    modelSchema: chatSchema(EFFORTS_WITH_NONE, 'none'),
  }),
  // ── GPT-5.2 家族 ──
  model(provider, {
    name: 'gpt-5.2',
    fullName: 'GPT-5.2',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2025-12-11',
    endpoints: [chatEp],
    modelSchema: chatSchema(EFFORTS_WITH_NONE, 'none'),
  }),
  model(provider, {
    name: 'gpt-5.2-pro',
    fullName: 'GPT-5.2 Pro',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2025-12-11',
    // Pro 档仅通过 Responses API 提供
    endpoints: [responsesEp],
    modelSchema: responsesSchema(EFFORTS_WITH_NONE, 'none'),
  }),
  model(provider, {
    name: 'gpt-5.2-codex',
    fullName: 'GPT-5.2 Codex',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2025-12-11',
    // 编码 Agent 模型，仅 Responses API
    endpoints: [responsesEp],
    modelSchema: responsesSchema(EFFORTS_WITH_NONE, 'none'),
  }),
  model(provider, {
    name: 'gpt-5.3-codex',
    fullName: 'GPT-5.3 Codex',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-02-05',
    endpoints: [responsesEp],
    modelSchema: responsesSchema(),
  }),
  // ── GPT-5.4 家族 ──
  model(provider, {
    name: 'gpt-5.4',
    fullName: 'GPT-5.4',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-03-05',
    endpoints: [chatEp],
    modelSchema: chatSchema(EFFORTS_WITH_NONE, 'none'),
  }),
  model(provider, {
    name: 'gpt-5.4-pro',
    fullName: 'GPT-5.4 Pro',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-04-01',
    endpoints: [responsesEp],
    modelSchema: responsesSchema(EFFORTS_WITH_NONE, 'none'),
  }),
  // ── GPT-5.6 系列 ──
  model(provider, {
    name: 'gpt-5.6-sol',
    fullName: 'GPT-5.6 Sol',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-06-01',
    endpoints: [chatEp],
    modelSchema: chatSchema(EFFORTS_5_6, 'none'),
  }),
  model(provider, {
    name: 'gpt-5.6-terra',
    fullName: 'GPT-5.6 Terra',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-06-01',
    endpoints: [chatEp],
    modelSchema: chatSchema(EFFORTS_5_6, 'none'),
  }),
  model(provider, {
    name: 'gpt-5.6-luna',
    fullName: 'GPT-5.6 Luna',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-06-01',
    endpoints: [chatEp],
    modelSchema: chatSchema(EFFORTS_5_6, 'none'),
  }),
  // ── 图像 ──
  model(provider, {
    name: 'gpt-image-1.5',
    fullName: 'GPT Image 1.5',
    type: '2', typeName: '图片', icon: provider.icon, launchTime: '2025-04-23',
    endpoints: [
      ep(P, '/v1/images/generations', { capability: 'IMAGE', protocolKey: 'openai-image', canvasModeLabel: '文生图' }),
      ep(P, '/v1/images/edits', { capability: 'IMAGE', protocolKey: 'openai-image', contentType: 'formdata', canvasModeLabel: '图像编辑' }),
    ],
    modelSchema: schema({
      protocolKey: 'openai-image',
      input: [
        promptField('A cute cat sitting on a windowsill'),
        { key: 'size', label: '尺寸', type: 'select', defaultValue: '1024x1024', options: ['1024x1024', '1536x1024', '1024x1536', 'auto'] },
        { key: 'quality', label: '质量', type: 'select', defaultValue: 'auto', options: IMAGE_QUALITIES },
        { key: 'output_format', label: '输出格式', type: 'select', defaultValue: 'png', options: ['png', 'jpeg', 'webp'] },
        { key: 'n', label: '数量', type: 'number', min: 1, max: 10, defaultValue: 1 },
      ],
      endpointSchemas: {
        [`${P}/v1/images/edits`]: schema({
          input: [
            promptField(),
            { key: 'image', label: '源图像', type: 'image', required: true },
            { key: 'size', label: '尺寸', type: 'select', defaultValue: '1024x1024', options: ['1024x1024', '1536x1024', '1024x1536', 'auto'] },
            { key: 'quality', label: '质量', type: 'select', defaultValue: 'auto', options: IMAGE_QUALITIES },
            { key: 'output_format', label: '输出格式', type: 'select', defaultValue: 'png', options: ['png', 'jpeg', 'webp'] },
            { key: 'input_fidelity', label: '输入保真度', type: 'select', defaultValue: 'high', options: ['high', 'low'] },
            { key: 'n', label: '数量', type: 'number', min: 1, max: 10, defaultValue: 1 },
          ],
          inputBindings: { sourceImage: 'image' },
        }),
      },
    }),
  }),
  model(provider, {
    name: 'gpt-image-2',
    fullName: 'GPT Image 2',
    type: '2', typeName: '图片', icon: provider.icon, launchTime: '2026-04-21',
    endpoints: [
      ep(P, '/v1/images/generations', { capability: 'IMAGE', protocolKey: 'openai-image', canvasModeLabel: '文生图' }),
      ep(P, '/v1/images/edits', { capability: 'IMAGE', protocolKey: 'openai-image', contentType: 'formdata', canvasModeLabel: '图像编辑' }),
    ],
    modelSchema: schema({
      protocolKey: 'openai-image',
      input: [
        promptField('A cute cat sitting on a windowsill'),
        { key: 'size', label: '尺寸', type: 'select', defaultValue: '1024x1024', options: IMAGE_SIZES },
        { key: 'quality', label: '质量', type: 'select', defaultValue: 'auto', options: IMAGE_QUALITIES },
        { key: 'output_format', label: '输出格式', type: 'select', defaultValue: 'png', options: ['png', 'jpeg', 'webp'] },
        { key: 'n', label: '数量', type: 'number', min: 1, max: 10, defaultValue: 1 },
      ],
      endpointSchemas: {
        [`${P}/v1/images/edits`]: schema({
          input: [
            promptField(),
            { key: 'image', label: '源图像', type: 'image', required: true },
            { key: 'size', label: '尺寸', type: 'select', defaultValue: '1024x1024', options: IMAGE_SIZES },
            { key: 'quality', label: '质量', type: 'select', defaultValue: 'auto', options: IMAGE_QUALITIES },
            { key: 'output_format', label: '输出格式', type: 'select', defaultValue: 'png', options: ['png', 'jpeg', 'webp'] },
            { key: 'input_fidelity', label: '输入保真度', type: 'select', defaultValue: 'high', options: ['high', 'low'] },
            { key: 'n', label: '数量', type: 'number', min: 1, max: 10, defaultValue: 1 },
          ],
          inputBindings: { sourceImage: 'image' },
        }),
      },
    }),
  }),
]

export default provider
