import { ep, model, messagesField, temperatureField, maxTokensField, promptField, schema } from './_shared.js'

const provider = {
  id: 'qwen',
  label: '阿里百炼 Qwen',
  icon: '',
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
      ? [{ key: 'enable_thinking', label: '深度思考', type: 'switch', defaultValue: thinkingDefault,
           description: '混合思考开关，官方默认开启；关闭可省成本' }]
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
  key: 'resolution', label: '分辨率', type: 'select', defaultValue: def, options,
})

const ratioField = (options = ['16:9', '9:16', '1:1', '4:3', '3:4']) => ({
  key: 'ratio', label: '宽高比', type: 'select', defaultValue: '16:9', options,
})

const durationField = (min, max, def = 5, description = '按秒计费') => ({
  key: 'duration', label: '时长(秒)', type: 'number', min, max, defaultValue: def, description,
})

const promptExtendField = { key: 'prompt_extend', label: '智能改写', type: 'switch', defaultValue: true,
  description: '官方默认开启，自动优化提示词（增加耗时）' }

provider.models = [
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
    // DashScope 官方原生：input.messages[].content[]（text + 可选 image）+ parameters
    modelSchema: schema({
      protocolKey: 'dashscope',
      input: [
        promptField('一只坐在窗台上的可爱猫咪'),
        { key: 'image', label: '参考图/编辑图', type: 'image', description: '可上传或由上游节点传入' },
        { key: 'size', label: '尺寸', type: 'select', defaultValue: '2048*2048',
          options: ['2048*2048', '2688*1536', '1536*2688', '2368*1728'] },
        { key: 'n', label: '数量', type: 'number', min: 1, max: 6, defaultValue: 1 },
        { key: 'negative_prompt', label: '负向提示词', type: 'textarea', defaultValue: '' },
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
    name: 'qwen-image-3.0-pro',
    fullName: 'Qwen Image 3.0 Pro',
    type: '2', typeName: '图片', icon: provider.icon, launchTime: '2026-07-25',
    endpoints: [imageEp()],
    // 与 qwen-image-3.0 同构，高质量档位
    modelSchema: schema({
      protocolKey: 'dashscope',
      input: [
        promptField('一只坐在窗台上的可爱猫咪'),
        { key: 'image', label: '参考图/编辑图', type: 'image', description: '可上传或由上游节点传入' },
        { key: 'size', label: '尺寸', type: 'select', defaultValue: '2048*2048',
          options: ['2048*2048', '2688*1536', '1536*2688', '2368*1728'] },
        { key: 'n', label: '数量', type: 'number', min: 1, max: 6, defaultValue: 1 },
        { key: 'negative_prompt', label: '负向提示词', type: 'textarea', defaultValue: '' },
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
    name: 'qwen-image-2.0-pro',
    fullName: 'Qwen Image 2.0 Pro',
    type: '2', typeName: '图片', icon: provider.icon, launchTime: '2026-03-03',
    endpoints: [imageEp()],
    // DashScope 官方原生：input.messages[].content[]（text + 可选 image）+ parameters
    modelSchema: schema({
      protocolKey: 'dashscope',
      input: [
        promptField('一只坐在窗台上的可爱猫咪'),
        { key: 'image', label: '参考图/编辑图', type: 'image', description: '可上传或由上游节点传入' },
        { key: 'size', label: '尺寸', type: 'select', defaultValue: '2048*2048',
          options: ['2048*2048', '2688*1536', '1536*2688', '2368*1728'] },
        { key: 'n', label: '数量', type: 'number', min: 1, max: 6, defaultValue: 1 },
        { key: 'negative_prompt', label: '负向提示词', type: 'textarea', defaultValue: '' },
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
        promptField('一只坐在窗台上的可爱猫咪'),
        { key: 'images', label: '参考图(0~9张)', type: 'images', max: 9,
          description: '图生图/图像编辑/多图参考' },
        { key: 'size', label: '尺寸', type: 'select', defaultValue: '2K',
          options: ['2K', '1K'], description: '也支持 宽*高（如 1488*704）' },
        { key: 'n', label: '数量', type: 'number', min: 1, max: 4, defaultValue: 1,
          description: '组图模式 1~12，直接决定费用' },
        { key: 'enable_sequential', label: '组图模式', type: 'switch', defaultValue: false },
        { key: 'thinking_mode', label: '思考模式', type: 'switch', defaultValue: true,
          description: '仅文生图且非组图时生效' },
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
        promptField('一只坐在窗台上的可爱猫咪'),
        { key: 'images', label: '参考图(0~9张)', type: 'images', max: 9,
          description: '图生图/图像编辑/多图参考' },
        { key: 'size', label: '尺寸', type: 'select', defaultValue: '2K',
          options: ['4K', '2K', '1K'], description: '4K 仅文生图非组图可用' },
        { key: 'n', label: '数量', type: 'number', min: 1, max: 4, defaultValue: 1,
          description: '组图模式 1~12，直接决定费用' },
        { key: 'enable_sequential', label: '组图模式', type: 'switch', defaultValue: false },
        { key: 'thinking_mode', label: '思考模式', type: 'switch', defaultValue: true,
          description: '仅文生图且非组图时生效' },
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
        promptField('一只坐在窗台上的可爱猫咪'),
        { key: 'size', label: '尺寸', type: 'select', defaultValue: '1024*1536',
          options: ['1024*1536', '832*1248', '1280*720', '1248*1872', '1024*1024'] },
        { key: 'prompt_extend', label: '智能改写', type: 'switch', defaultValue: false,
          description: '开启后 LLM 改写提示词并返回推理过程，增加费用' },
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
    // 万相 3.0 All-in-One：文生 / 首帧图生 / 参考生视频一体，最长 30 秒
    modelSchema: schema({
      protocolKey: 'dashscope',
      input: [
        promptField('一只猫在夕阳下的沙滩上行走'),
        { key: 'image', label: '首帧图', type: 'image', description: '传入后按图生视频' },
        { key: 'images', label: '参考图(0~5张)', type: 'images', max: 5,
          description: '参考生视频素材，prompt 中以「图1/图2」按顺序引用' },
        resolutionField(),
        ratioField(),
        durationField(2, 30),
        promptExtendField,
      ],
      inputBindings: { sourceImage: 'image', sourceImages: 'images' },
      videoModes: ['first', 'reference'],
      inputTransform: {
        input: {
          prompt: '$${prompt}',
          media: [
            { type: 'first_frame', url: '$${image}', '@conditional': 'image' },
            ...mediaItems('reference_image', 'images', 5),
          ],
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
    name: 'wan2.6-t2v',
    fullName: 'Wan 2.6 文生视频',
    type: '3', typeName: '视频', icon: provider.icon, launchTime: '2025-12-01',
    endpoints: [videoEp()],
    // 万相 2.6 旧版协议：parameters.size + shot_type（2.7 已弃用）
    modelSchema: schema({
      protocolKey: 'dashscope',
      input: [
        promptField('一只猫在夕阳下的沙滩上行走'),
        { key: 'negative_prompt', label: '负向提示词', type: 'textarea', defaultValue: '' },
        { key: 'size', label: '分辨率', type: 'select', defaultValue: '1920*1080',
          options: ['1920*1080', '1080*1920', '1440*1440', '1632*1248', '1248*1632',
            '1280*720', '720*1280', '960*960', '1088*832', '832*1088'] },
        durationField(2, 15),
        { key: 'shot_type', label: '镜头类型', type: 'select', defaultValue: 'single',
          options: ['single', 'multi'], description: 'multi 多镜头需开启智能改写' },
        promptExtendField,
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
    fullName: 'Wan 2.7 文生视频',
    type: '3', typeName: '视频', icon: provider.icon, launchTime: '2026-04-25',
    endpoints: [videoEp()],
    // 万相 2.7 新版协议：resolution + ratio 取代 size，shot_type 已弃用
    modelSchema: schema({
      protocolKey: 'dashscope',
      input: [
        promptField('一只猫在夕阳下的沙滩上行走'),
        { key: 'negative_prompt', label: '负向提示词', type: 'textarea', defaultValue: '' },
        resolutionField(),
        ratioField(),
        durationField(2, 15),
        promptExtendField,
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
    fullName: 'Wan 2.7 图生视频',
    type: '3', typeName: '视频', icon: provider.icon, launchTime: '2026-04-25',
    endpoints: [videoEp()],
    // input.media[] 素材组合区分任务类型：首帧 / 首帧+尾帧（官方无 ratio，画幅跟随素材）
    modelSchema: schema({
      protocolKey: 'dashscope',
      input: [
        { ...promptField('一只猫在草地上奔跑'), required: false },
        { key: 'image', label: '首帧图', type: 'image', required: true },
        { key: 'last_frame', label: '尾帧图', type: 'image', description: '传入后按首尾帧生视频' },
        resolutionField(),
        durationField(2, 15),
        promptExtendField,
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
    fullName: 'Wan 2.7 参考生视频',
    type: '3', typeName: '视频', icon: provider.icon, launchTime: '2026-06-12',
    endpoints: [videoEp()],
    // input.media[]：1~5 个 reference_image（画布侧仅注入图像参考）
    modelSchema: schema({
      protocolKey: 'dashscope',
      input: [
        promptField('图1中的角色在海边奔跑，镜头缓慢推近'),
        { key: 'images', label: '参考图(1~5张)', type: 'images', max: 5, required: true,
          description: 'prompt 中以「图1/图2」按顺序引用，仅含单一角色' },
        resolutionField(),
        ratioField(),
        durationField(2, 15, 5, '含参考视频时 2~10 秒，按秒计费'),
        promptExtendField,
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
    fullName: 'HappyHorse 1.1 文生视频',
    type: '3', typeName: '视频', icon: provider.icon, launchTime: '2026-06-22',
    endpoints: [videoEp()],
    // 官方未定义 negative_prompt / prompt_extend，勿传
    modelSchema: schema({
      protocolKey: 'dashscope',
      input: [
        promptField('一座由硬纸板和瓶盖搭建的微型城市，在夜晚焕发生机'),
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
    fullName: 'HappyHorse 1.1 图生视频',
    type: '3', typeName: '视频', icon: provider.icon, launchTime: '2026-06-22',
    endpoints: [videoEp()],
    // input.media 恰好 1 个 first_frame；不支持 ratio（画幅跟随首帧）
    modelSchema: schema({
      protocolKey: 'dashscope',
      input: [
        { ...promptField('一只猫在草地上奔跑'), required: false },
        { key: 'image', label: '首帧图', type: 'image', required: true },
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
    fullName: 'HappyHorse 1.1 参考生视频',
    type: '3', typeName: '视频', icon: provider.icon, launchTime: '2026-06-22',
    endpoints: [videoEp()],
    // input.media 1~9 个 reference_image，prompt 以 [Image N] 按顺序引用
    modelSchema: schema({
      protocolKey: 'dashscope',
      input: [
        promptField('[Image 1]中身着红色旗袍的女性拿起[Image 2]中的折扇'),
        { key: 'images', label: '参考图(1~9张)', type: 'images', max: 9, required: true,
          description: 'prompt 中以 [Image 1]/[Image 2] 按 media 顺序引用；短边 ≥400px' },
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
]

export default provider
