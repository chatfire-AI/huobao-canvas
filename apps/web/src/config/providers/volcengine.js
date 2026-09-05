import { ep, model, messagesField, temperatureField, maxTokensField, promptField, schema } from './_shared.js'

const provider = {
  id: 'volcengine',
  label: '火山引擎 豆包',
  icon: 'doubao-color.png',
  docsUrl: 'https://www.volcengine.com/docs/82379',
  baseUrl: 'https://ark.cn-beijing.volces.com',
  proxyPrefix: '/official/volcengine',
  auth: { type: 'bearer' },
  testPath: '/api/v3/models',
}

const P = provider.proxyPrefix

// ── 豆包 Seed 对话（OpenAI 兼容 /chat/completions）──
const chatModel = ({ name, fullName, launchTime }) => model(provider, {
  name, fullName,
  type: '1', typeName: '对话', icon: provider.icon, launchTime,
  endpoints: [ep(P, '/api/v3/chat/completions', { capability: 'CHAT', protocolKey: 'openai-chat' })],
  modelSchema: schema({
    protocolKey: 'openai-chat',
    input: [messagesField, temperatureField(1), maxTokensField('max_tokens', 4096, 65536)],
  }),
})

// ── Seedream 图像（OpenAI 兼容 /images/generations）──
// extra 用于追加版本特有字段（output_format / aspect_ratio 等）
const seedreamSchema = ({ sizes, defaultSize, imageMax = 14, imageDesc = '图生图/多图融合', extra = [] }) => schema({
  protocolKey: 'openai-image',
  input: [
    promptField('一只坐在窗台上的可爱猫咪'),
    { key: 'size', label: '尺寸', type: 'select', defaultValue: defaultSize, options: sizes },
    { key: 'image', label: '参考图', type: 'images', max: imageMax, description: imageDesc },
    ...extra,
    { key: 'response_format', label: '返回格式', type: 'select', defaultValue: 'url',
      options: ['url', 'b64_json'] },
  ],
  inputBindings: { sourceImages: 'image' },
  output: { displayType: 'image' },
})

const seedreamModel = ({ name, fullName, launchTime, schemaOpts }) => model(provider, {
  name, fullName,
  type: '2', typeName: '图片', icon: provider.icon, launchTime,
  endpoints: [ep(P, '/api/v3/images/generations', { capability: 'IMAGE', protocolKey: 'openai-image' })],
  modelSchema: seedreamSchema(schemaOpts),
})

// ── Seedance 视频（Ark 内容任务，异步轮询）──
const arkVideoQuery = {
  path: `${P}/api/v3/contents/generations/tasks/{taskId}`,
  method: 'GET',
  taskIdPath: 'id',
  statusPath: 'status',
  completedValues: ['succeeded'],
  failedValues: ['failed', 'cancelled', 'expired'],
}

const arkVideoEp = () => ep(P, '/api/v3/contents/generations/tasks', {
  capability: 'VIDEO', responseMode: 'ASYNC', protocolKey: 'ark', query: arkVideoQuery,
})

// 2.0 系列与 1.5 Pro 的 ratio 枚举（1.0 Pro 无 adaptive 档位）
const SEEDANCE_RATIOS = ['adaptive', '16:9', '4:3', '1:1', '3:4', '9:16', '21:9']

// Ark 官方内容任务：content[] 部件（text + 首帧/尾帧 image_url），规格走顶层参数
// withLastFrame=false 时移除尾帧字段（1.0 Lite 不支持尾帧，传入即报错）
// withFirstFrame=false 时移除首帧字段（Lite T2V 纯文生视频，官方不接受 image）
const seedanceSchema = ({ durationMin, durationMax, resolutions, defaultResolution,
  ratios = SEEDANCE_RATIOS, defaultRatio = 'adaptive', withAudio = false, withLastFrame = true, withFirstFrame = true }) => schema({
  protocolKey: 'ark',
  input: [
    promptField('一只猫在夕阳下的沙滩上行走'),
    ...(withFirstFrame
      ? [{ key: 'image', label: '首帧参考图', type: 'image' }]
      : []),
    ...(withLastFrame && withFirstFrame
      ? [{ key: 'last_image', label: '尾帧参考图', type: 'image' }]
      : []),
    { key: 'duration', label: '时长(秒)', type: 'number', min: durationMin, max: durationMax, defaultValue: 5 },
    { key: 'resolution', label: '分辨率', type: 'select', defaultValue: defaultResolution, options: resolutions },
    { key: 'ratio', label: '宽高比', type: 'select', defaultValue: defaultRatio, options: ratios },
  ],
  inputBindings: !withFirstFrame
    ? null
    : withLastFrame
      ? { sourceImage: 'image', lastFrameImage: 'last_image' }
      : { sourceImage: 'image' },
  videoModes: !withFirstFrame ? ['text'] : withLastFrame ? ['firstlast'] : ['first'],
  inputTransform: {
    content: [
      { type: 'text', text: '$${prompt}' },
      // 有首帧/尾帧参考图才保留对应部件（@conditional 是 applyInputTransform 的数组项语法）
      ...(withFirstFrame
        ? [{ type: 'image_url', image_url: { url: '$${image}' }, role: 'first_frame', '@conditional': 'image' }]
        : []),
      ...(withLastFrame && withFirstFrame
        ? [{ type: 'image_url', image_url: { url: '$${last_image}' }, role: 'last_frame', '@conditional': 'last_image' }]
        : []),
    ],
    duration: '$${duration}',
    resolution: '$${resolution}',
    ratio: '$${ratio}',
    ...(withAudio ? { generate_audio: true } : {}),
  },
  output: { displayType: 'video' },
})

const seedanceModel = ({ name, fullName, launchTime, schemaOpts }) => model(provider, {
  name, fullName,
  type: '3', typeName: '视频', icon: provider.icon, launchTime,
  endpoints: [arkVideoEp()],
  modelSchema: seedanceSchema(schemaOpts),
})

provider.models = [
  // ── 对话 ──
  chatModel({
    name: 'doubao-seed-2-1-pro-260628', fullName: 'Doubao Seed 2.1 Pro', launchTime: '2026-06-23',
  }),
  chatModel({
    name: 'doubao-seed-2-1-turbo-260628', fullName: 'Doubao Seed 2.1 Turbo', launchTime: '2026-06-23',
  }),
  chatModel({
    name: 'doubao-seed-2-0-pro-260215', fullName: 'Doubao Seed 2.0 Pro', launchTime: '2026-02-15',
  }),
  chatModel({
    name: 'doubao-seed-2-0-mini-260215', fullName: 'Doubao Seed 2.0 Mini', launchTime: '2026-02-15',
  }),
  // 官方无 doubao-seed-2.0-lite，不设该模型
  chatModel({
    name: 'doubao-seed-2-0-code-preview-260215', fullName: 'Doubao Seed 2.0 Code', launchTime: '2026-02-15',
  }),

  // ── 图像 ──
  seedreamModel({
    name: 'doubao-seedream-4-0-250828', fullName: 'Doubao Seedream 4.0', launchTime: '2025-08-28',
    schemaOpts: {
      // 档位 1K/2K/4K 或像素宽高（总像素 1280x720~4096x4096），默认 2048x2048
      sizes: ['1K', '2K', '4K', '2048x2048', '2304x1728', '1728x2304', '2560x1440', '1440x2560'],
      defaultSize: '2K',
    },
  }),
  seedreamModel({
    name: 'doubao-seedream-4-5-251128', fullName: 'Doubao Seedream 4.5', launchTime: '2025-11-28',
    schemaOpts: {
      // 4.5 不支持 1K 档位；像素宽高最低约 2560x1440
      sizes: ['2K', '4K', '2048x2048', '2304x1728', '1728x2304', '2560x1440', '1440x2560'],
      defaultSize: '2048x2048',
    },
  }),
  seedreamModel({
    name: 'doubao-seedream-5-0-260128', fullName: 'Doubao Seedream 5.0 Lite', launchTime: '2026-01-28',
    schemaOpts: {
      sizes: ['2K', '3K', '4K'],
      defaultSize: '2K',
      extra: [{ key: 'output_format', label: '输出格式', type: 'select', defaultValue: 'jpeg',
        options: ['jpeg', 'png'] }],
    },
  }),
  seedreamModel({
    name: 'doubao-seedream-5-0-pro-260628', fullName: 'Doubao Seedream 5.0 Pro', launchTime: '2026-06-28',
    schemaOpts: {
      // Pro 仅 1K/1.5K/2K 档位（最高 2K），支持像素级编辑，参考图+生成图 ≤ 15 张
      sizes: ['1K', '1.5K', '2K'],
      defaultSize: '2K',
      imageDesc: '图生图/多参考图融合（参考图+生成图 ≤ 15 张）',
      extra: [
        { key: 'aspect_ratio', label: '宽高比', type: 'select', defaultValue: 'auto',
          options: ['auto', '1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '21:9'] },
        { key: 'output_format', label: '输出格式', type: 'select', defaultValue: 'jpeg',
          options: ['jpeg', 'png'] },
      ],
    },
  }),

  // ── 视频 ──
  seedanceModel({
    name: 'doubao-seedance-1-0-pro-250528', fullName: 'Doubao Seedance 1.0 Pro', launchTime: '2025-05-28',
    schemaOpts: {
      durationMin: 2, durationMax: 12,
      resolutions: ['480p', '720p', '1080p'], defaultResolution: '1080p',
      // 1.0 Pro 无 adaptive，文生默认 16:9；不支持同步音频
      ratios: ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9'], defaultRatio: '16:9',
    },
  }),
  seedanceModel({
    name: 'doubao-seedance-1-0-lite-t2v-250428', fullName: 'Doubao Seedance 1.0 Lite T2V', launchTime: '2025-04-28',
    schemaOpts: {
      durationMin: 2, durationMax: 12,
      resolutions: ['480p', '720p', '1080p'], defaultResolution: '720p',
      // Lite 文生视频无 adaptive，默认 16:9；纯文生：官方不接受首帧图，不支持同步音频与尾帧
      ratios: ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9'], defaultRatio: '16:9',
      withFirstFrame: false,
      withLastFrame: false,
    },
  }),
  seedanceModel({
    name: 'doubao-seedance-1-0-lite-i2v-250428', fullName: 'Doubao Seedance 1.0 Lite I2V', launchTime: '2025-04-28',
    schemaOpts: {
      durationMin: 2, durationMax: 12,
      resolutions: ['480p', '720p', '1080p'], defaultResolution: '720p',
      // 图生视频画幅跟随首帧，默认 adaptive；不支持同步音频与尾帧
      ratios: ['adaptive', '16:9', '4:3', '1:1', '3:4', '9:16', '21:9'], defaultRatio: 'adaptive',
      withLastFrame: false,
    },
  }),
  seedanceModel({
    name: 'doubao-seedance-1-5-pro-251215', fullName: 'Doubao Seedance 1.5 Pro', launchTime: '2025-12-15',
    schemaOpts: {
      durationMin: 4, durationMax: 12,
      resolutions: ['480p', '720p', '1080p'], defaultResolution: '720p',
      withAudio: true,
    },
  }),
  seedanceModel({
    name: 'doubao-seedance-2-0-260128', fullName: 'Doubao Seedance 2.0', launchTime: '2026-01-28',
    schemaOpts: {
      durationMin: 4, durationMax: 15,
      // 4K：官方 REST 枚举未列出，快速入门显示 2.0 标准版支持；实测若返回 400 则移除
      resolutions: ['480p', '720p', '1080p', '4K'], defaultResolution: '720p',
      withAudio: true,
    },
  }),
  seedanceModel({
    name: 'doubao-seedance-2-0-fast-260128', fullName: 'Doubao Seedance 2.0 Fast', launchTime: '2026-01-28',
    schemaOpts: {
      durationMin: 4, durationMax: 15,
      // 极速版最高 720p，传 1080p 返回 400
      resolutions: ['480p', '720p'], defaultResolution: '720p',
      withAudio: true,
    },
  }),
  seedanceModel({
    name: 'doubao-seedance-2-0-mini-260615', fullName: 'Doubao Seedance 2.0 Mini', launchTime: '2026-06-15',
    schemaOpts: {
      durationMin: 4, durationMax: 15,
      resolutions: ['480p', '720p'], defaultResolution: '720p',
      withAudio: true,
    },
  }),
  seedanceModel({
    name: 'doubao-seedance-2-5-260628', fullName: 'Doubao Seedance 2.5', launchTime: '2026-08-07',
    schemaOpts: {
      // 原生 30 秒电影级视频，全模态参考；最高 1080p（4K 仅 2.0 标准版）
      durationMin: 4, durationMax: 30,
      resolutions: ['480p', '720p', '1080p'], defaultResolution: '720p',
      withAudio: true,
    },
  }),
]

export default provider
