import { ep, model, messagesField, temperatureField, maxTokensField, promptField, schema, t } from './_shared.js'

const provider = {
  id: 'qwen',
  get label() { return t('qwen.label') },
  icon: 'qwen-color.png',
  docsUrl: 'https://help.aliyun.com/zh/model-studio/developer-reference',
  baseUrl: 'https://dashscope.aliyuncs.com',
  proxyPrefix: '/official/qwen',
  auth: { type: 'bearer' },
  testPath: '/compatible-mode/v1/models',
}

const P = provider.proxyPrefix

// ── 端点构造 ──

/** OpenAI 兼容 chat（qwen3.* 对话系列统一入口） */
const chatEp = () =>
  ep(P, '/compatible-mode/v1/chat/completions', { capability: 'CHAT', protocolKey: 'openai-chat' })

/** DashScope 原生多模态生成（图像同步） */
const imageEp = () =>
  ep(P, '/api/v1/services/aigc/multimodal-generation/generation', { capability: 'IMAGE', protocolKey: 'dashscope' })

/** DashScope 异步任务轮询（视频统一 query 配置） */
const dashscopeTaskQuery = {
  path: `${P}/api/v1/tasks/{taskId}`,
  method: 'GET',
  taskIdPath: 'output.task_id',
  statusPath: 'output.task_status',
  completedValues: ['SUCCEEDED'],
  failedValues: ['FAILED', 'CANCELED'],
}

/** DashScope 原生视频合成（异步，需 X-DashScope-Async 头） */
const videoEp = () =>
  ep(P, '/api/v1/services/aigc/video-generation/video-synthesis', {
    capability: 'VIDEO', responseMode: 'ASYNC', protocolKey: 'dashscope',
    extraHeaders: { 'X-DashScope-Async': 'enable' },
    query: dashscopeTaskQuery,
  })

// ── schema 片段 ──

/** 对话 schema：按官方文档是否支持混合思考决定是否带 enable_thinking */
const chatSchema = ({ thinking = false, thinkingDefault = true } = {}) => schema({
  protocolKey: 'openai-chat',
  input: [
    messagesField,
    temperatureField(),
    maxTokensField(),
    ...(thinking
      ? [{ key: 'enable_thinking', label: t('fields.thinking'), type: 'switch', defaultValue: thinkingDefault,
           description: t('qwen.thinkingDesc') }]
      : []),
  ],
})

/** 把 images 字段数组展开为 media 素材项（@conditional 逐项存在才保留） */
const mediaItems = (type, field, max) =>
  Array.from({ length: max }, (_, i) => ({
    type,
    url: '$${' + field + '[' + i + ']}',
    '@conditional': `${field}[${i}]`,
  }))

/** 把 images 字段数组展开为多模态 content 图像项 */
const imageContentItems = (field, max) =>
  Array.from({ length: max }, (_, i) => ({
    image: '$${' + field + '[' + i + ']}',
    '@conditional': `${field}[${i}]`,
  }))

const resolutionField = (options = ['720P', '1080P'], def = '1080P') => ({
  key: 'resolution', label: t('fields.resolution'), type: 'select', defaultValue: def, options,
})

const ratioField = (options = ['16:9', '9:16', '1:1', '4:3', '3:4'], def = '16:9') => ({
  key: 'ratio', label: t('fields.aspectRatio'), type: 'select', defaultValue: def, options,
})

const durationField = (min, max, def = 5, description = t('qwen.durationBilling')) => ({
  key: 'duration', label: t('fields.durationSec'), type: 'number', min, max, defaultValue: def, description,
})

const promptExtendField = () => ({ key: 'prompt_extend', label: t('fields.promptExtend'), type: 'switch', defaultValue: true,
  description: t('qwen.promptExtendDesc') })

// models 用 getter 定义：每次读取重建，schema 内文案（t()）跟随语言切换
Object.defineProperty(provider, 'models', {
  enumerable: true,
  get: () => [
  // ── 对话 ──
  model(provider, {
    name: 'qwen3.8-max',
    fullName: 'Qwen 3.8 Max',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-08-03',
    endpoints: [chatEp()],
    modelSchema: chatSchema({ thinking: true }),
  }),
  model(provider, {
    name: 'qwen3.8-2.4t-a95b',
    fullName: 'Qwen 3.8 2.4T-A95B',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-08-12',
    endpoints: [chatEp()],
    modelSchema: chatSchema({ thinking: true }),
  }),
  model(provider, {
    name: 'qwen3.7-max',
    fullName: 'Qwen 3.7 Max',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-05-20',
    endpoints: [chatEp()],
    modelSchema: chatSchema({ thinking: true }),
  }),
  model(provider, {
    name: 'qwen3.7-plus',
    fullName: 'Qwen 3.7 Plus',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-05-26',
    endpoints: [chatEp()],
    modelSchema: chatSchema({ thinking: true }),
  }),
  model(provider, {
    name: 'qwen3.7-flash',
    fullName: 'Qwen 3.7 Flash',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-07-21',
    endpoints: [chatEp()],
    modelSchema: chatSchema({ thinking: true }),
  }),
  model(provider, {
    name: 'qwen3.6-flash',
    fullName: 'Qwen 3.6 Flash',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-04-16',
    endpoints: [chatEp()],
    modelSchema: chatSchema({ thinking: true }),
  }),
  model(provider, {
    name: 'qwen3-coder-plus',
    fullName: 'Qwen 3 Coder Plus',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2025-07-22',
    endpoints: [chatEp()],
    // 官方模型页未提供 enable_thinking，不支持思考模式
    modelSchema: chatSchema(),
  }),
  model(provider, {
    name: 'qwen3-coder-flash',
    fullName: 'Qwen 3 Coder Flash',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2025-07-28',
    endpoints: [chatEp()],
    modelSchema: chatSchema(),
  }),
  model(provider, {
    name: 'qwen3-omni-flash',
    fullName: 'Qwen 3 Omni Flash',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2025-12-01',
    endpoints: [chatEp()],
    // HTTP 版支持思考模式（仅输出文本），官方未标注默认开启
    modelSchema: chatSchema({ thinking: true, thinkingDefault: false }),
  }),

  // ── 图像 ──
  model(provider, {
    name: 'qwen-image-3.0',
    fullName: 'Qwen Image 3.0',
    type: '2', typeName: '图片', icon: provider.icon, launchTime: '2026-07-21',
    endpoints: [imageEp()],
    // DashScope 官方原生：input.messages[].content[]（text + 0~3 张 image）+ parameters
    modelSchema: schema({
      protocolKey: 'dashscope',
      input: [
        promptField(t('prompts.catWindowsill')),
        { key: 'images', label: t('qwen.images03'), type: 'images', max: 3,
          description: t('qwen.images03Desc') },
        { key: 'size', label: t('fields.size'), type: 'select', defaultValue: '2048*2048',
          options: ['2048*2048', '2688*1536', '1536*2688', '2368*1728', '1728*2368'] },
        { key: 'n', label: t('fields.count'), type: 'number', min: 1, max: 6, defaultValue: 1 },
        { key: 'negative_prompt', label: t('fields.negativePrompt'), type: 'textarea', defaultValue: '' },
      ],
      inputBindings: { sourceImages: 'images' },
      inputTransform: {
        input: {
          messages: [{ role: 'user', content: [
            { text: '$${prompt}' },
            ...imageContentItems('images', 3),
          ] }],
        },
        parameters: {
          size: '$${size}',
          n: '$${n}',
          negative_prompt: '$${negative_prompt}',
        },
      },
      output: { displayType: 'image' },
    }),
  }),
  model(provider, {
    name: 'qwen-image-3.0-pro',
    fullName: 'Qwen Image 3.0 Pro',
    type: '2', typeName: '图片', icon: provider.icon, launchTime: '2026-07-25',
    endpoints: [imageEp()],
    // 与 qwen-image-3.0 同构，高质量档位
    modelSchema: schema({
      protocolKey: 'dashscope',
      input: [
        promptField(t('prompts.catWindowsill')),
        { key: 'images', label: t('qwen.images03'), type: 'images', max: 3,
          description: t('qwen.images03Desc') },
        { key: 'size', label: t('fields.size'), type: 'select', defaultValue: '2048*2048',
          options: ['2048*2048', '2688*1536', '1536*2688', '2368*1728', '1728*2368'] },
        { key: 'n', label: t('fields.count'), type: 'number', min: 1, max: 6, defaultValue: 1 },
        { key: 'negative_prompt', label: t('fields.negativePrompt'), type: 'textarea', defaultValue: '' },
      ],
      inputBindings: { sourceImages: 'images' },
      inputTransform: {
        input: {
          messages: [{ role: 'user', content: [
            { text: '$${prompt}' },
            ...imageContentItems('images', 3),
          ] }],
        },
        parameters: {
          size: '$${size}',
          n: '$${n}',
          negative_prompt: '$${negative_prompt}',
        },
      },
      output: { displayType: 'image' },
    }),
  }),
  model(provider, {
    name: 'qwen-image-2.0-pro',
    fullName: 'Qwen Image 2.0 Pro',
    type: '2', typeName: '图片', icon: provider.icon, launchTime: '2026-03-03',
    endpoints: [imageEp()],
    // DashScope 官方原生：input.messages[].content[]（text + 可选 image）+ parameters
    modelSchema: schema({
      protocolKey: 'dashscope',
      input: [
        promptField(t('prompts.catWindowsill')),
        { key: 'image', label: t('qwen.imageEdit'), type: 'image', description: t('fields.sourceImageDesc') },
        { key: 'size', label: t('fields.size'), type: 'select', defaultValue: '2048*2048',
          options: ['2048*2048', '2688*1536', '1536*2688', '2368*1728', '1728*2368'] },
        { key: 'n', label: t('fields.count'), type: 'number', min: 1, max: 6, defaultValue: 1 },
        { key: 'negative_prompt', label: t('fields.negativePrompt'), type: 'textarea', defaultValue: '' },
      ],
      inputBindings: { sourceImage: 'image' },
      inputTransform: {
        input: {
          messages: [{ role: 'user', content: [
            { text: '$${prompt}' },
            { image: '$${image}', '@conditional': 'image' },
          ] }],
        },
        parameters: {
          size: '$${size}',
          n: '$${n}',
          negative_prompt: '$${negative_prompt}',
        },
      },
      output: { displayType: 'image' },
    }),
  }),
  model(provider, {
    name: 'wan2.7-image',
    fullName: 'Wan 2.7 Image',
    type: '2', typeName: '图片', icon: provider.icon, launchTime: '2026-04-25',
    endpoints: [imageEp()],
    // DashScope 官方原生同步：input.messages[].content[]（text + 0~9 张 image）+ parameters
    modelSchema: schema({
      protocolKey: 'dashscope',
      input: [
        promptField(t('prompts.catWindowsill')),
        { key: 'images', label: t('qwen.images09'), type: 'images', max: 9,
          description: t('qwen.images09Desc') },
        { key: 'size', label: t('fields.size'), type: 'select', defaultValue: '2K',
          options: ['2K', '1K'], description: t('qwen.sizeCustomDesc') },
        { key: 'n', label: t('fields.count'), type: 'number', min: 1, max: 4, defaultValue: 1,
          description: t('qwen.countBillingDesc') },
        { key: 'enable_sequential', label: t('fields.sequentialMode'), type: 'switch', defaultValue: false },
        { key: 'thinking_mode', label: t('fields.thinkingMode'), type: 'switch', defaultValue: true,
          description: t('qwen.thinkingModeDesc') },
      ],
      inputBindings: { sourceImages: 'images' },
      inputTransform: {
        input: {
          messages: [{ role: 'user', content: [
            { text: '$${prompt}' },
            ...imageContentItems('images', 9),
          ] }],
        },
        parameters: {
          size: '$${size}',
          n: '$${n}',
          enable_sequential: '$${enable_sequential}',
          thinking_mode: '$${thinking_mode}',
        },
      },
      output: { displayType: 'image' },
    }),
  }),
  model(provider, {
    name: 'wan2.7-image-pro',
    fullName: 'Wan 2.7 Image Pro',
    type: '2', typeName: '图片', icon: provider.icon, launchTime: '2026-04-25',
    endpoints: [imageEp()],
    // 与 wan2.7-image 同构，唯一支持 4K 输出的万相图像模型
    modelSchema: schema({
      protocolKey: 'dashscope',
      input: [
        promptField(t('prompts.catWindowsill')),
        { key: 'images', label: t('qwen.images09'), type: 'images', max: 9,
          description: t('qwen.images09Desc') },
        { key: 'size', label: t('fields.size'), type: 'select', defaultValue: '2K',
          options: ['4K', '2K', '1K'], description: t('qwen.size4kDesc') },
        { key: 'n', label: t('fields.count'), type: 'number', min: 1, max: 4, defaultValue: 1,
          description: t('qwen.countBillingDesc') },
        { key: 'enable_sequential', label: t('fields.sequentialMode'), type: 'switch', defaultValue: false },
        { key: 'thinking_mode', label: t('fields.thinkingMode'), type: 'switch', defaultValue: true,
          description: t('qwen.thinkingModeDesc') },
      ],
      inputBindings: { sourceImages: 'images' },
      inputTransform: {
        input: {
          messages: [{ role: 'user', content: [
            { text: '$${prompt}' },
            ...imageContentItems('images', 9),
          ] }],
        },
        parameters: {
          size: '$${size}',
          n: '$${n}',
          enable_sequential: '$${enable_sequential}',
          thinking_mode: '$${thinking_mode}',
        },
      },
      output: { displayType: 'image' },
    }),
  }),
  model(provider, {
    name: 'z-image-turbo',
    fullName: 'Z-Image Turbo',
    type: '2', typeName: '图片', icon: provider.icon, launchTime: '2025-12-23',
    endpoints: [imageEp()],
    // 仅文生图：content 必须恰好 1 个 text，无 n/负向提示词/图片输入
    modelSchema: schema({
      protocolKey: 'dashscope',
      input: [
        promptField(t('prompts.catWindowsill')),
        { key: 'size', label: t('fields.size'), type: 'select', defaultValue: '1024*1536',
          options: ['1024*1536', '832*1248', '1280*720', '1248*1872', '1024*1024'] },
        { key: 'prompt_extend', label: t('fields.promptExtend'), type: 'switch', defaultValue: false,
          description: t('qwen.promptExtendLlmDesc') },
      ],
      inputTransform: {
        input: { messages: [{ role: 'user', content: [{ text: '$${prompt}' }] }] },
        parameters: { size: '$${size}', prompt_extend: '$${prompt_extend}' },
      },
      output: { displayType: 'image' },
    }),
  }),

  // ── 视频 ──
  model(provider, {
    name: 'wan3.0-video',
    fullName: 'Wan 3.0 Video',
    type: '3', typeName: '视频', icon: provider.icon, launchTime: '2026-08-06',
    endpoints: [videoEp()],
    // 万相 3.0 All-in-One：文生 / 首帧图生 / 参考生视频一体，最长 30 秒；
    // 官方首帧图与参考图互斥（同传必报错），@conditional 不支持"另一字段为空"的反向条件，
    // 无法在 inputTransform 层自动互斥，仅在描述中标注，需用户保证只填其一
    modelSchema: schema({
      protocolKey: 'dashscope',
      input: [
        promptField(t('prompts.catBeach')),
        { key: 'image', label: t('fields.firstFrame'), type: 'image',
          description: t('qwen.firstFrameMutexDesc') },
        { key: 'images', label: t('qwen.images010'), type: 'images', max: 10,
          description: t('qwen.images010Desc') },
        resolutionField(['1080P', '720P', '480P']),
        // 官方默认 adaptive（画幅跟随素材/提示词）
        ratioField(['adaptive', '16:9', '9:16', '1:1', '4:3', '3:4'], 'adaptive'),
        durationField(2, 30),
      ],
      inputBindings: { sourceImage: 'image', sourceImages: 'images' },
      videoModes: ['first', 'reference'],
      // 官方未定义 prompt_extend，勿传
      inputTransform: {
        input: {
          prompt: '$${prompt}',
          media: [
            { type: 'first_frame', url: '$${image}', '@conditional': 'image' },
            ...mediaItems('reference_image', 'images', 10),
          ],
        },
        parameters: {
          resolution: '$${resolution}',
          ratio: '$${ratio}',
          duration: '$${duration}',
        },
      },
      output: { displayType: 'video' },
    }),
  }),
  model(provider, {
    name: 'wan2.6-t2v',
    fullName: t('qwen.names.wan26t2v'),
    type: '3', typeName: '视频', icon: provider.icon, launchTime: '2025-12-01',
    endpoints: [videoEp()],
    // 万相 2.6 旧版协议：parameters.size + shot_type（2.7 已弃用）
    modelSchema: schema({
      protocolKey: 'dashscope',
      input: [
        promptField(t('prompts.catBeach')),
        { key: 'negative_prompt', label: t('fields.negativePrompt'), type: 'textarea', defaultValue: '' },
        { key: 'size', label: t('fields.resolution'), type: 'select', defaultValue: '1920*1080',
          options: ['1920*1080', '1080*1920', '1440*1440', '1632*1248', '1248*1632',
            '1280*720', '720*1280', '960*960', '1088*832', '832*1088'] },
        durationField(2, 15),
        { key: 'shot_type', label: t('fields.shotType'), type: 'select', defaultValue: 'single',
          options: ['single', 'multi'], description: t('qwen.shotTypeDesc') },
        promptExtendField(),
      ],
      inputTransform: {
        input: { prompt: '$${prompt}', negative_prompt: '$${negative_prompt}' },
        parameters: {
          size: '$${size}',
          duration: '$${duration}',
          shot_type: '$${shot_type}',
          prompt_extend: '$${prompt_extend}',
        },
      },
      output: { displayType: 'video' },
    }),
  }),
  model(provider, {
    name: 'wan2.7-t2v',
    fullName: t('qwen.names.wan27t2v'),
    type: '3', typeName: '视频', icon: provider.icon, launchTime: '2026-04-25',
    endpoints: [videoEp()],
    // 万相 2.7 新版协议：resolution + ratio 取代 size，shot_type 已弃用
    modelSchema: schema({
      protocolKey: 'dashscope',
      input: [
        promptField(t('prompts.catBeach')),
        { key: 'negative_prompt', label: t('fields.negativePrompt'), type: 'textarea', defaultValue: '' },
        resolutionField(),
        ratioField(),
        durationField(2, 15),
        promptExtendField(),
      ],
      inputTransform: {
        input: { prompt: '$${prompt}', negative_prompt: '$${negative_prompt}' },
        parameters: {
          resolution: '$${resolution}',
          ratio: '$${ratio}',
          duration: '$${duration}',
          prompt_extend: '$${prompt_extend}',
        },
      },
      output: { displayType: 'video' },
    }),
  }),
  model(provider, {
    name: 'wan2.7-i2v',
    fullName: t('qwen.names.wan27i2v'),
    type: '3', typeName: '视频', icon: provider.icon, launchTime: '2026-04-25',
    endpoints: [videoEp()],
    // input.media[] 素材组合区分任务类型：首帧 / 首帧+尾帧（官方无 ratio，画幅跟随素材）
    modelSchema: schema({
      protocolKey: 'dashscope',
      input: [
        { ...promptField(t('prompts.catGrass')), required: false },
        { key: 'image', label: t('fields.firstFrame'), type: 'image', required: true },
        { key: 'last_frame', label: t('fields.lastFrame'), type: 'image', description: t('qwen.lastFrameDesc') },
        resolutionField(),
        durationField(2, 15),
        promptExtendField(),
      ],
      inputBindings: { sourceImage: 'image', lastFrameImage: 'last_frame' },
      videoModes: ['first', 'firstlast'],
      inputTransform: {
        input: {
          prompt: '$${prompt}',
          media: [
            { type: 'first_frame', url: '$${image}' },
            { type: 'last_frame', url: '$${last_frame}', '@conditional': 'last_frame' },
          ],
        },
        parameters: {
          resolution: '$${resolution}',
          duration: '$${duration}',
          prompt_extend: '$${prompt_extend}',
        },
      },
      output: { displayType: 'video' },
    }),
  }),
  model(provider, {
    name: 'wan2.7-r2v',
    fullName: t('qwen.names.wan27r2v'),
    type: '3', typeName: '视频', icon: provider.icon, launchTime: '2026-06-12',
    endpoints: [videoEp()],
    // input.media[]：1~5 个 reference_image（画布侧仅注入图像参考）
    modelSchema: schema({
      protocolKey: 'dashscope',
      input: [
        promptField(t('prompts.characterSeaside')),
        { key: 'images', label: t('qwen.images15'), type: 'images', max: 5, required: true,
          description: t('qwen.images15Desc') },
        resolutionField(),
        ratioField(),
        durationField(2, 15, 5, t('qwen.durationRefDesc')),
        promptExtendField(),
      ],
      inputBindings: { sourceImages: 'images' },
      videoModes: ['reference'],
      inputTransform: {
        input: {
          prompt: '$${prompt}',
          media: mediaItems('reference_image', 'images', 5),
        },
        parameters: {
          resolution: '$${resolution}',
          ratio: '$${ratio}',
          duration: '$${duration}',
          prompt_extend: '$${prompt_extend}',
        },
      },
      output: { displayType: 'video' },
    }),
  }),
  model(provider, {
    name: 'happyhorse-1.1-t2v',
    fullName: t('qwen.names.hh11t2v'),
    type: '3', typeName: '视频', icon: provider.icon, launchTime: '2026-06-22',
    endpoints: [videoEp()],
    // 官方未定义 negative_prompt / prompt_extend，勿传
    modelSchema: schema({
      protocolKey: 'dashscope',
      input: [
        promptField(t('prompts.cardboardCity')),
        resolutionField(['480P', '720P', '1080P']),
        ratioField(['16:9', '9:16', '1:1', '4:3', '3:4', '4:5', '5:4', '9:21', '21:9']),
        durationField(3, 15),
      ],
      inputTransform: {
        input: { prompt: '$${prompt}' },
        parameters: {
          resolution: '$${resolution}',
          ratio: '$${ratio}',
          duration: '$${duration}',
        },
      },
      output: { displayType: 'video' },
    }),
  }),
  model(provider, {
    name: 'happyhorse-1.1-i2v',
    fullName: t('qwen.names.hh11i2v'),
    type: '3', typeName: '视频', icon: provider.icon, launchTime: '2026-06-22',
    endpoints: [videoEp()],
    // input.media 恰好 1 个 first_frame；不支持 ratio（画幅跟随首帧）
    modelSchema: schema({
      protocolKey: 'dashscope',
      input: [
        { ...promptField(t('prompts.catGrass')), required: false },
        { key: 'image', label: t('fields.firstFrame'), type: 'image', required: true },
        resolutionField(['480P', '720P', '1080P']),
        durationField(3, 15),
      ],
      inputBindings: { sourceImage: 'image' },
      videoModes: ['first'],
      inputTransform: {
        input: {
          prompt: '$${prompt}',
          media: [{ type: 'first_frame', url: '$${image}' }],
        },
        parameters: {
          resolution: '$${resolution}',
          duration: '$${duration}',
        },
      },
      output: { displayType: 'video' },
    }),
  }),
  model(provider, {
    name: 'happyhorse-1.1-r2v',
    fullName: t('qwen.names.hh11r2v'),
    type: '3', typeName: '视频', icon: provider.icon, launchTime: '2026-06-22',
    endpoints: [videoEp()],
    // input.media 1~9 个 reference_image，prompt 以 [Image N] 按顺序引用
    modelSchema: schema({
      protocolKey: 'dashscope',
      input: [
        promptField(t('prompts.fanLady')),
        { key: 'images', label: t('qwen.images19'), type: 'images', max: 9, required: true,
          description: t('qwen.images19Desc') },
        resolutionField(['480P', '720P', '1080P']),
        ratioField(['16:9', '9:16', '3:4', '4:3', '4:5', '5:4', '1:1', '9:21', '21:9']),
        durationField(3, 15),
      ],
      inputBindings: { sourceImages: 'images' },
      videoModes: ['reference'],
      inputTransform: {
        input: {
          prompt: '$${prompt}',
          media: mediaItems('reference_image', 'images', 9),
        },
        parameters: {
          resolution: '$${resolution}',
          ratio: '$${ratio}',
          duration: '$${duration}',
        },
      },
      output: { displayType: 'video' },
    }),
  }),
  ],
})

export default provider
