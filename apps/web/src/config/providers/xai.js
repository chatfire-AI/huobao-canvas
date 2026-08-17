import { ep, model, messagesField, temperatureField, maxTokensField, promptField, schema } from './_shared.js'

const provider = {
  id: 'xai',
  label: 'xAI Grok',
  icon: 'grok.png',
  docsUrl: 'https://docs.x.ai/docs/api-reference',
  baseUrl: 'https://api.x.ai',
  proxyPrefix: '/official/xai',
  auth: { type: 'bearer' },
  testPath: '/v1/models',
}

const P = provider.proxyPrefix

// 图像模型宽高比：基础版文档存在来源分歧（保守 5 档），quality/2.0 为完整 14 档
const ASPECT_RATIOS_FULL = ['auto', '1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '2:1', '1:2', '19.5:9', '9:19.5', '20:9', '9:20']
const ASPECT_RATIOS_BASIC = ['auto', '1:1', '16:9', '9:16', '3:2', '2:3']
// 视频模型宽高比（基础版与 1.5 一致）
const VIDEO_ASPECT_RATIOS = ['16:9', '9:16', '1:1', '4:3', '3:4', '3:2', '2:3']

const chatEp = ep(P, '/v1/chat/completions', { capability: 'CHAT', protocolKey: 'openai-chat' })
const imageGenEp = ep(P, '/v1/images/generations', { capability: 'IMAGE', protocolKey: 'openai-image', canvasModeLabel: '文生图' })
const imageEditEp = ep(P, '/v1/images/edits', { capability: 'IMAGE', protocolKey: 'openai-image', canvasModeLabel: '图像编辑' })

// 视频异步轮询：POST 返回 request_id，GET /v1/videos/{request_id} 查 status
const videoQuery = {
  path: `${P}/v1/videos/{taskId}`,
  method: 'GET',
  taskIdPath: 'request_id',
  statusPath: 'status',
  completedValues: ['done'],
  failedValues: ['failed', 'expired'],
}
const videoGenEp = ep(P, '/v1/videos/generations', {
  capability: 'VIDEO', responseMode: 'ASYNC', protocolKey: 'async-video', canvasModeLabel: '视频生成', query: videoQuery,
})
const videoEditEp = ep(P, '/v1/videos/edits', {
  capability: 'VIDEO', responseMode: 'ASYNC', protocolKey: 'async-video', canvasModeLabel: '视频编辑', query: videoQuery,
})

// 图像编辑端点 schema（grok edits 参考图 ≤3 张）
const imageEditsSchema = () => schema({
  input: [
    promptField(),
    { key: 'image', label: '参考图(≤3张)', type: 'images', max: 3, required: true },
  ],
  inputBindings: { sourceImages: 'image' },
})

// 视频编辑端点 schema（输入视频 ≤8.7 秒，输出保持原时长/比例/分辨率）
const videoEditsSchema = () => schema({
  input: [
    promptField(),
    { key: 'video', label: '源视频(≤8.7秒)', type: 'video', required: true },
  ],
})

provider.models = [
  // ── 对话 ──
  model(provider, {
    name: 'grok-4.6',
    fullName: 'Grok 4.6',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-08-13',
    endpoints: [chatEp],
    modelSchema: schema({
      protocolKey: 'openai-chat',
      input: [messagesField, temperatureField(), maxTokensField()],
    }),
  }),
  model(provider, {
    name: 'grok-4.5',
    fullName: 'Grok 4.5',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-07-08',
    endpoints: [chatEp],
    modelSchema: schema({
      protocolKey: 'openai-chat',
      input: [messagesField, temperatureField(), maxTokensField()],
    }),
  }),
  model(provider, {
    name: 'grok-4-1-fast',
    fullName: 'Grok 4.1 Fast',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2025-11-01',
    endpoints: [chatEp],
    modelSchema: schema({
      protocolKey: 'openai-chat',
      input: [messagesField, temperatureField(), maxTokensField()],
    }),
  }),
  model(provider, {
    name: 'grok-4.20-beta',
    fullName: 'Grok 4.20 Beta',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-03-09',
    endpoints: [chatEp],
    modelSchema: schema({
      protocolKey: 'openai-chat',
      input: [messagesField, temperatureField(), maxTokensField()],
    }),
  }),

  // ── 图像 ──
  model(provider, {
    name: 'grok-imagine-image',
    fullName: 'Grok Imagine Image',
    type: '2', typeName: '图片', icon: provider.icon, launchTime: '2025-12-01',
    endpoints: [imageGenEp, imageEditEp],
    modelSchema: schema({
      protocolKey: 'openai-image',
      input: [
        promptField('A cute cat sitting on a windowsill'),
        { key: 'n', label: '数量', type: 'number', min: 1, max: 10, defaultValue: 1 },
        { key: 'aspect_ratio', label: '宽高比', type: 'select', defaultValue: 'auto', options: ASPECT_RATIOS_BASIC },
        { key: 'resolution', label: '分辨率', type: 'select', defaultValue: '1k', options: ['1k', '2k'] },
      ],
      endpointSchemas: {
        [`${P}/v1/images/edits`]: imageEditsSchema(),
      },
      output: { displayType: 'image' },
    }),
  }),
  model(provider, {
    name: 'grok-imagine-image-quality',
    fullName: 'Grok Imagine Image Quality',
    type: '2', typeName: '图片', icon: provider.icon, launchTime: '2026-02-01',
    endpoints: [imageGenEp, imageEditEp],
    modelSchema: schema({
      protocolKey: 'openai-image',
      input: [
        promptField('A cute cat sitting on a windowsill'),
        { key: 'n', label: '数量', type: 'number', min: 1, max: 10, defaultValue: 1 },
        { key: 'aspect_ratio', label: '宽高比', type: 'select', defaultValue: 'auto', options: ASPECT_RATIOS_FULL },
        { key: 'resolution', label: '分辨率', type: 'select', defaultValue: '2k', options: ['1k', '2k'] },
      ],
      endpointSchemas: {
        [`${P}/v1/images/edits`]: imageEditsSchema(),
      },
      output: { displayType: 'image' },
    }),
  }),
  model(provider, {
    name: 'grok-imagine-image-2.0',
    fullName: 'Grok Imagine Image 2.0',
    type: '2', typeName: '图片', icon: provider.icon, launchTime: '2026-08-01',
    endpoints: [imageGenEp, imageEditEp],
    modelSchema: schema({
      protocolKey: 'openai-image',
      input: [
        promptField('A cute cat sitting on a windowsill'),
        { key: 'n', label: '数量', type: 'number', min: 1, max: 10, defaultValue: 1 },
        { key: 'aspect_ratio', label: '宽高比', type: 'select', defaultValue: 'auto', options: ASPECT_RATIOS_FULL },
        { key: 'resolution', label: '分辨率', type: 'select', defaultValue: '1k', options: ['1k', '2k'] },
        { key: 'quality', label: '质量', type: 'select', defaultValue: 'medium', options: ['low', 'medium'] },
      ],
      endpointSchemas: {
        [`${P}/v1/images/edits`]: imageEditsSchema(),
      },
      output: { displayType: 'image' },
    }),
  }),

  // ── 视频 ──
  model(provider, {
    name: 'grok-imagine-video',
    fullName: 'Grok Imagine Video',
    type: '3', typeName: '视频', icon: provider.icon, launchTime: '2025-12-10',
    endpoints: [videoGenEp, videoEditEp],
    modelSchema: schema({
      protocolKey: 'async-video',
      input: [
        promptField('A cat walking on the beach at sunset'),
        { key: 'image', label: '首帧参考图', type: 'image' },
        { key: 'duration', label: '时长(秒)', type: 'number', min: 1, max: 15, defaultValue: 8 },
        { key: 'aspect_ratio', label: '宽高比', type: 'select', defaultValue: '16:9', options: VIDEO_ASPECT_RATIOS },
        { key: 'resolution', label: '分辨率', type: 'select', defaultValue: '480p', options: ['480p', '720p'] },
      ],
      inputBindings: { sourceImage: 'image' },
      endpointSchemas: {
        [`${P}/v1/videos/edits`]: videoEditsSchema(),
      },
      output: { displayType: 'video' },
    }),
  }),
  model(provider, {
    name: 'grok-imagine-video-1.5',
    fullName: 'Grok Imagine Video 1.5',
    type: '3', typeName: '视频', icon: provider.icon, launchTime: '2026-05-01',
    endpoints: [videoGenEp, videoEditEp],
    modelSchema: schema({
      protocolKey: 'async-video',
      input: [
        promptField('A cat walking on the beach at sunset'),
        { key: 'image', label: '首帧参考图', type: 'image' },
        { key: 'duration', label: '时长(秒)', type: 'number', min: 1, max: 15, defaultValue: 10 },
        { key: 'aspect_ratio', label: '宽高比', type: 'select', defaultValue: '16:9', options: VIDEO_ASPECT_RATIOS },
        { key: 'resolution', label: '分辨率', type: 'select', defaultValue: '480p', options: ['480p', '720p', '1080p'] },
      ],
      inputBindings: { sourceImage: 'image' },
      endpointSchemas: {
        [`${P}/v1/videos/edits`]: videoEditsSchema(),
      },
      output: { displayType: 'video' },
    }),
  }),
]

export default provider
