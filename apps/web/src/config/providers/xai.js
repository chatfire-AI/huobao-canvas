import { ep, model, messagesField, temperatureField, maxTokensField, promptField, schema, t } from './_shared.js'

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

// 图像模型宽高比：官方 16 档全量（枚举按端点不按模型区分）
const ASPECT_RATIOS_FULL = ['auto', '1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '2:1', '1:2', '19.5:9', '9:19.5', '20:9', '9:20', '21:9', '5:2']
// 视频模型宽高比（基础版与 1.5 一致）
const VIDEO_ASPECT_RATIOS = ['16:9', '9:16', '1:1', '4:3', '3:4', '3:2', '2:3']

const chatEp = ep(P, '/v1/chat/completions', { capability: 'CHAT', protocolKey: 'openai-chat' })
const imageGenEp = () => ep(P, '/v1/images/generations', { capability: 'IMAGE', protocolKey: 'openai-image', canvasModeLabel: t('canvasMode.t2i') })
const imageEditEp = () => ep(P, '/v1/images/edits', { capability: 'IMAGE', protocolKey: 'openai-image', canvasModeLabel: t('canvasMode.imageEdit') })

// 视频异步轮询：POST 返回 request_id，GET /v1/videos/{request_id} 查 status
const videoQuery = {
  path: `${P}/v1/videos/{taskId}`,
  method: 'GET',
  taskIdPath: 'request_id',
  statusPath: 'status',
  completedValues: ['done'],
  failedValues: ['failed', 'expired'],
}
const videoGenEp = () => ep(P, '/v1/videos/generations', {
  capability: 'VIDEO', responseMode: 'ASYNC', protocolKey: 'async-video', canvasModeLabel: t('canvasMode.videoGen'), query: videoQuery,
})
const videoEditEp = () => ep(P, '/v1/videos/edits', {
  capability: 'VIDEO', responseMode: 'ASYNC', protocolKey: 'async-video', canvasModeLabel: t('canvasMode.videoEdit'), query: videoQuery,
})

// 对话模型推理力度（reasoning_effort，透传字段；各模型默认 high）
const reasoningEffortField = (options, description) => ({
  key: 'reasoning_effort', label: t('fields.reasoningEffort'), type: 'select', defaultValue: 'high', options, description,
})

// 图像编辑端点 schema（grok edits 参考图 ≤3 张）
// 官方 /v1/images/edits 只接受 JSON，多图源包装为 images:[{url},...]
const imageEditsSchema = () => schema({
  input: [
    promptField(),
    { key: 'image', label: t('xai.images3'), type: 'images', max: 3, required: true },
  ],
  inputBindings: { sourceImages: 'image' },
  inputTransform: {
    prompt: '$${prompt}',
    images: [
      { url: '$${image[0]}', '@conditional': 'image[0]' },
      { url: '$${image[1]}', '@conditional': 'image[1]' },
      { url: '$${image[2]}', '@conditional': 'image[2]' },
    ],
  },
})

// 视频编辑端点 schema（输入视频 ≤8.7 秒，输出保持原时长/比例/分辨率）
// 官方 video 字段为对象包装 video:{url:...}
// inputBindings 声明上游视频注入入口（画布视频节点 → video 字段），
// 缺失时合并回退到模型级 sourceImage 绑定，源视频永远进不来，必填校验必抛错
const videoEditsSchema = () => schema({
  input: [
    promptField(),
    { key: 'video', label: t('xai.sourceVideo'), type: 'video', required: true },
  ],
  inputBindings: { sourceVideo: 'video' },
  inputTransform: {
    prompt: '$${prompt}',
    video: { url: '$${video}' },
  },
})

// models 用 getter 定义：每次读取重建，schema 内文案（t()）跟随语言切换
Object.defineProperty(provider, 'models', {
  enumerable: true,
  get: () => [
  // ── 对话 ──
  model(provider, {
    name: 'grok-4.6',
    fullName: 'Grok 4.6',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-08-13',
    endpoints: [chatEp],
    modelSchema: schema({
      protocolKey: 'openai-chat',
      input: [messagesField, temperatureField(), maxTokensField('max_completion_tokens', 4096, 500000), reasoningEffortField(['low', 'medium', 'high', 'xhigh'])],
    }),
  }),
  model(provider, {
    name: 'grok-4.5',
    fullName: 'Grok 4.5',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-07-08',
    endpoints: [chatEp],
    modelSchema: schema({
      protocolKey: 'openai-chat',
      input: [messagesField, temperatureField(), maxTokensField('max_completion_tokens'), reasoningEffortField(['low', 'medium', 'high'], t('xai.reasoningDesc'))],
    }),
  }),
  model(provider, {
    name: 'grok-4.20-0309-reasoning',
    fullName: 'Grok 4.20 Reasoning',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-03-09',
    endpoints: [chatEp],
    modelSchema: schema({
      protocolKey: 'openai-chat',
      input: [messagesField, temperatureField(), maxTokensField('max_completion_tokens'), reasoningEffortField(['low', 'medium', 'high', 'xhigh'])],
    }),
  }),

  // ── 图像 ──
  model(provider, {
    name: 'grok-imagine-image',
    fullName: 'Grok Imagine Image',
    type: '2', typeName: '图片', icon: provider.icon, launchTime: '2025-12-01',
    endpoints: [imageGenEp(), imageEditEp()],
    modelSchema: schema({
      protocolKey: 'openai-image',
      input: [
        promptField('A cute cat sitting on a windowsill'),
        { key: 'n', label: t('fields.count'), type: 'number', min: 1, max: 10, defaultValue: 1 },
        { key: 'aspect_ratio', label: t('fields.aspectRatio'), type: 'select', defaultValue: 'auto', options: ASPECT_RATIOS_FULL },
        { key: 'resolution', label: t('fields.resolution'), type: 'select', defaultValue: '1k', options: ['1k', '2k'] },
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
    endpoints: [imageGenEp(), imageEditEp()],
    modelSchema: schema({
      protocolKey: 'openai-image',
      input: [
        promptField('A cute cat sitting on a windowsill'),
        { key: 'n', label: t('fields.count'), type: 'number', min: 1, max: 10, defaultValue: 1 },
        { key: 'aspect_ratio', label: t('fields.aspectRatio'), type: 'select', defaultValue: 'auto', options: ASPECT_RATIOS_FULL },
        { key: 'resolution', label: t('fields.resolution'), type: 'select', defaultValue: '2k', options: ['1k', '2k'] },
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
    endpoints: [imageGenEp(), imageEditEp()],
    modelSchema: schema({
      protocolKey: 'openai-image',
      input: [
        promptField('A cute cat sitting on a windowsill'),
        { key: 'n', label: t('fields.count'), type: 'number', min: 1, max: 10, defaultValue: 1 },
        { key: 'aspect_ratio', label: t('fields.aspectRatio'), type: 'select', defaultValue: 'auto', options: ASPECT_RATIOS_FULL },
        { key: 'resolution', label: t('fields.resolution'), type: 'select', defaultValue: '1k', options: ['1k', '2k'] },
        // quality 仅 grok-imagine-image-2.0 支持，其余两个图像模型不下发
        { key: 'quality', label: t('fields.quality'), type: 'select', defaultValue: 'medium', options: ['low', 'medium'], description: t('xai.qualityDesc') },
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
    endpoints: [videoGenEp(), videoEditEp()],
    modelSchema: schema({
      protocolKey: 'async-video',
      input: [
        promptField('A cat walking on the beach at sunset'),
        { key: 'image', label: t('fields.firstFrameRef'), type: 'image' },
        { key: 'duration', label: t('fields.durationSec'), type: 'number', min: 1, max: 15, defaultValue: 8 },
        { key: 'aspect_ratio', label: t('fields.aspectRatio'), type: 'select', defaultValue: '16:9', options: VIDEO_ASPECT_RATIOS },
        { key: 'resolution', label: t('fields.resolution'), type: 'select', defaultValue: '480p', options: ['480p', '720p'] },
      ],
      inputBindings: { sourceImage: 'image' },
      // 官方 image 字段为对象包装 image:{url:...}（@conditional：无首帧参考图则不下发）
      inputTransform: {
        prompt: '$${prompt}',
        image: { '@conditional': 'image', '@value': { url: '$${image}' } },
        duration: '$${duration}',
        aspect_ratio: '$${aspect_ratio}',
        resolution: '$${resolution}',
      },
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
    endpoints: [videoGenEp(), videoEditEp()],
    modelSchema: schema({
      protocolKey: 'async-video',
      input: [
        promptField('A cat walking on the beach at sunset'),
        { key: 'image', label: t('fields.firstFrameRef'), type: 'image' },
        { key: 'duration', label: t('fields.durationSec'), type: 'number', min: 1, max: 15, defaultValue: 10 },
        { key: 'aspect_ratio', label: t('fields.aspectRatio'), type: 'select', defaultValue: '16:9', options: VIDEO_ASPECT_RATIOS },
        { key: 'resolution', label: t('fields.resolution'), type: 'select', defaultValue: '480p', options: ['480p', '720p', '1080p'] },
      ],
      inputBindings: { sourceImage: 'image' },
      // 官方 image 字段为对象包装 image:{url:...}（@conditional：无首帧参考图则不下发）
      inputTransform: {
        prompt: '$${prompt}',
        image: { '@conditional': 'image', '@value': { url: '$${image}' } },
        duration: '$${duration}',
        aspect_ratio: '$${aspect_ratio}',
        resolution: '$${resolution}',
      },
      endpointSchemas: {
        [`${P}/v1/videos/edits`]: videoEditsSchema(),
      },
      output: { displayType: 'video' },
    }),
  }),
  ],
})

export default provider
