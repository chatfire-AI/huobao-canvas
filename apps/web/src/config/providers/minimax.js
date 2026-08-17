import { ep, model, messagesField, temperatureField, maxTokensField, promptField, schema } from './_shared.js'

const provider = {
  id: 'minimax',
  label: 'MiniMax',
  icon: 'minimax-color.png',
  docsUrl: 'https://platform.minimaxi.com/docs/api-reference',
  baseUrl: 'https://api.minimaxi.com',
  proxyPrefix: '/official/minimax',
  auth: { type: 'bearer' },
  testPath: '/v1/models',
}

const P = provider.proxyPrefix

// M 系列对话模型共用端点组：OpenAI 兼容 + Anthropic 兼容（官方推荐，支持 thinking 等高级特性）
const chatEndpoints = () => [
  ep(P, '/v1/chat/completions', { capability: 'CHAT', protocolKey: 'openai-chat' }),
  ep(P, '/anthropic/v1/messages', { capability: 'CHAT', protocolKey: 'claude', canvasModeLabel: 'Claude 协议' }),
]

// M2.x 系列官方 schema：temperature [0,2] 默认 1；max_tokens 已弃用，官方建议 max_completion_tokens
const m2ChatSchema = () => schema({
  protocolKey: 'openai-chat',
  input: [messagesField, temperatureField(), maxTokensField('max_completion_tokens', 8192)],
})

provider.models = [
  model(provider, {
    name: 'MiniMax-M3',
    fullName: 'MiniMax M3',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-01-12',
    // M3 额外支持 OpenAI Responses 兼容接口（reasoning 参数）
    endpoints: [
      ...chatEndpoints(),
      ep(P, '/v1/responses', { capability: 'CHAT', protocolKey: 'openai-responses', canvasModeLabel: 'Responses 协议' }),
    ],
    modelSchema: m2ChatSchema(),
  }),
  model(provider, {
    name: 'MiniMax-M2.7',
    fullName: 'MiniMax M2.7',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2025-12-01',
    endpoints: chatEndpoints(),
    modelSchema: m2ChatSchema(),
  }),
  model(provider, {
    name: 'MiniMax-M2.7-highspeed',
    fullName: 'MiniMax M2.7 高速版',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2025-12-01',
    endpoints: chatEndpoints(),
    modelSchema: m2ChatSchema(),
  }),
  model(provider, {
    name: 'MiniMax-M2.5',
    fullName: 'MiniMax M2.5',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2025-11-01',
    endpoints: chatEndpoints(),
    modelSchema: m2ChatSchema(),
  }),
  model(provider, {
    name: 'MiniMax-M2.5-highspeed',
    fullName: 'MiniMax M2.5 高速版',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2025-11-01',
    endpoints: chatEndpoints(),
    modelSchema: m2ChatSchema(),
  }),
  model(provider, {
    name: 'MiniMax-M2.1',
    fullName: 'MiniMax M2.1',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2025-10-01',
    endpoints: chatEndpoints(),
    modelSchema: m2ChatSchema(),
  }),
  model(provider, {
    name: 'MiniMax-M2.1-highspeed',
    fullName: 'MiniMax M2.1 高速版',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2025-10-01',
    endpoints: chatEndpoints(),
    modelSchema: m2ChatSchema(),
  }),
  model(provider, {
    name: 'MiniMax-H3',
    fullName: 'MiniMax H3 视频',
    type: '3', typeName: '视频', icon: provider.icon, launchTime: '2026-01-01',
    endpoints: [ep(P, '/v2/video_generation', {
      capability: 'VIDEO', responseMode: 'ASYNC', protocolKey: 'async-video',
      query: {
        path: `${P}/v2/query/video_generation/{taskId}`,
        method: 'GET',
        taskIdPath: 'task_id',
        statusPath: 'task.status',
        completedValues: ['succeeded'],
        failedValues: ['failed', 'cancelled', 'expired'],
      },
    })],
    // 官方 v2 视频生成：content[] 多模态数组（text 必填 + 可选首帧 image_url）
    modelSchema: schema({
      protocolKey: 'async-video',
      input: [
        promptField('一只猫在夕阳下的沙滩上行走'),
        { key: 'image', label: '首帧参考图', type: 'image' },
        { key: 'duration', label: '时长(秒)', type: 'number', min: 4, max: 15, defaultValue: 6 },
        { key: 'resolution', label: '分辨率', type: 'select', defaultValue: '768P',
          options: ['768P', '2K'] },
        { key: 'ratio', label: '宽高比', type: 'select', defaultValue: '16:9',
          options: ['adaptive', '16:9', '9:16', '4:3', '1:1', '3:4', '21:9'],
          description: '文生视频不能为 adaptive；图生视频恒按 adaptive 处理' },
      ],
      inputBindings: { sourceImage: 'image' },
      inputTransform: {
        content: [
          { type: 'text', text: '$${prompt}' },
          // 有首帧参考图才保留该部件（@conditional 是 applyInputTransform 的数组项语法）
          { type: 'image_url', url: '$${image}', '@conditional': 'image' },
        ],
        duration: '$${duration}',
        resolution: '$${resolution}',
        ratio: '$${ratio}',
      },
      output: { displayType: 'video' },
    }),
  }),
]

export default provider
