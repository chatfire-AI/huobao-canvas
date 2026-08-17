export const CANVAS_NODE_TYPES = {
  TEXT: 'textNode',
  IMAGE: 'imageNode',
  VIDEO: 'videoNode',
  GROUP: 'groupNode',

  // 旧版媒体类型：仅为兼容历史 IndexedDB 数据在反序列化过滤时不崩溃而保留，
  // 不参与节点库、连线校验或新建节点。
  AUDIO: 'audioNode',
  MUSIC: 'musicNode',
}

export const ACTIVE_CANVAS_NODE_TYPES = [
  CANVAS_NODE_TYPES.TEXT,
  CANVAS_NODE_TYPES.IMAGE,
  CANVAS_NODE_TYPES.VIDEO,
  CANVAS_NODE_TYPES.GROUP,
]

export const ALL_CANVAS_NODE_TYPES = Object.values(CANVAS_NODE_TYPES)

export const NODE_MODEL_TYPE_MAP = {
  [CANVAS_NODE_TYPES.TEXT]: '1',
  [CANVAS_NODE_TYPES.IMAGE]: '2',
  [CANVAS_NODE_TYPES.VIDEO]: '3',
}

export const NODE_STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  WAITING: 'waiting',
  SUCCESS: 'success',
  UNAVAILABLE: 'unavailable',
  EXPIRED: 'expired',
  ERROR: 'error',
}

export const NODE_LIBRARY = [
  {
    type: CANVAS_NODE_TYPES.TEXT,
    label: '文本',
    icon: 'tabler:text-caption',
    description: '对应模型库文本/对话分类',
  },
  {
    type: CANVAS_NODE_TYPES.IMAGE,
    label: '图片',
    icon: 'tabler:photo',
    description: '对应模型库图片分类',
  },
  {
    type: CANVAS_NODE_TYPES.VIDEO,
    label: '视频',
    icon: 'tabler:video',
    description: '对应模型库视频分类',
  },
  {
    type: CANVAS_NODE_TYPES.GROUP,
    label: '分组',
    icon: 'tabler:category',
    description: '用于整理画布节点',
  },
]

export const CANVAS_PROMPT_DOCK_META = {
  [CANVAS_NODE_TYPES.TEXT]: {
    label: '文本',
    icon: 'tabler:text-caption',
    placeholder: '输入文本提示词，Enter 生成，Shift + Enter 换行',
    modelPlaceholder: '选择文本模型',
    helper: '输入会写入文本节点，并使用文本/对话分类下的模型',
    modes: [
      { label: '上下文', icon: 'tabler:messages' },
      { label: '语气', icon: 'tabler:mood-smile' },
      { label: '格式', icon: 'tabler:layout-list' },
    ],
    tools: [
      { label: '文本生成', icon: 'tabler:writing' },
      { label: '结构化', icon: 'tabler:list-details' },
      { label: '长文', icon: 'tabler:article' },
      { label: 'Markdown', icon: 'tabler:markdown' },
      { label: '1段', suffixIcon: 'tabler:chevron-down', compact: true },
    ],
    estimate: '轻量',
  },
  [CANVAS_NODE_TYPES.IMAGE]: {
    label: '图片',
    icon: 'tabler:photo',
    placeholder: '输入图片提示词，Enter 生成，Shift + Enter 换行',
    modelPlaceholder: '选择图片模型',
    helper: '输入会写入图片节点，并使用图片分类下的模型',
    modes: [
      { label: '风格', icon: 'tabler:cube' },
      { label: '标记', icon: 'tabler:sparkles' },
      { label: '参考', icon: 'tabler:plus' },
    ],
    tools: [
      { label: '自适应', icon: 'tabler:checkbox' },
      { label: '标准画质', icon: 'tabler:photo-cog' },
      { label: '2K', suffixIcon: 'tabler:chevron-down' },
      { label: '预设', icon: 'tabler:layout-grid' },
      { label: '1张', suffixIcon: 'tabler:chevron-down', compact: true },
    ],
    estimate: '18',
  },
  [CANVAS_NODE_TYPES.VIDEO]: {
    label: '视频',
    icon: 'tabler:video',
    placeholder: '输入视频提示词，Enter 生成，Shift + Enter 换行',
    modelPlaceholder: '选择视频模型',
    helper: '输入会写入视频节点，并使用视频分类下的模型',
    modes: [
      { label: '镜头', icon: 'tabler:camera' },
      { label: '动作', icon: 'tabler:route' },
      { label: '参考', icon: 'tabler:plus' },
    ],
    tools: [
      { label: '16:9', icon: 'tabler:aspect-ratio' },
      { label: '标准画质', icon: 'tabler:video-plus' },
      { label: '5s', suffixIcon: 'tabler:chevron-down' },
      { label: '镜头运动', icon: 'tabler:arrows-shuffle' },
      { label: '1条', suffixIcon: 'tabler:chevron-down', compact: true },
    ],
    estimate: '高',
  },
}

export function getCanvasPromptDockMeta(type) {
  return CANVAS_PROMPT_DOCK_META[type] || {
    label: '节点',
    icon: 'tabler:square',
    placeholder: '输入提示词，Enter 生成，Shift + Enter 换行',
    modelPlaceholder: '选择模型',
    helper: '输入会写入当前节点，并使用该分类下的模型',
    modes: [
      { label: '输入', icon: 'tabler:prompt' },
      { label: '参数', icon: 'tabler:adjustments' },
      { label: '参考', icon: 'tabler:plus' },
    ],
    tools: [
      { label: '默认', icon: 'tabler:settings' },
    ],
    estimate: '',
  }
}

export const getNodeDefaults = (type) => {
  const now = Date.now()
  const base = {
    title: NODE_LIBRARY.find((item) => item.type === type)?.label || '节点',
    status: NODE_STATUS.IDLE,
    createdAt: now,
    updatedAt: now,
    payload: {},
  }

  switch (type) {
    case CANVAS_NODE_TYPES.TEXT:
      return {
        ...base,
        title: '文本',
        payload: {
          prompt: '',
          modelName: '',
          endpointIndex: 0,
          params: {},
          resultType: 'text',
          result: null,
          parsedResults: [],
          error: '',
        },
      }
    case CANVAS_NODE_TYPES.IMAGE:
      return {
        ...base,
        title: '图片',
        payload: {
          prompt: '',
          modelName: '',
          endpointIndex: 0,
          params: {},
          assetId: '',
          url: '',
          name: '',
          resultType: 'image',
          result: null,
          parsedResults: [],
          error: '',
        },
      }
    case CANVAS_NODE_TYPES.VIDEO:
      return {
        ...base,
        title: '视频',
        payload: {
          prompt: '',
          modelName: '',
          endpointIndex: 0,
          params: {},
          url: '',
          taskId: '',
          metadata: null,
          resultType: 'video',
          result: null,
          parsedResults: [],
          error: '',
        },
      }
    case CANVAS_NODE_TYPES.GROUP:
      return {
        title: '分组',
        layout: {
          width: 400,
          height: 300,
        },
      }
    default:
      return base
  }
}
