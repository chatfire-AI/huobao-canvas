import { i18n } from '@/locales'

const t = (key, args) => i18n.global.t(key, args)

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

const NODE_TYPE_LABEL_KEYS = {
  [CANVAS_NODE_TYPES.TEXT]: 'canvas.nodeTypes.text',
  [CANVAS_NODE_TYPES.IMAGE]: 'canvas.nodeTypes.image',
  [CANVAS_NODE_TYPES.VIDEO]: 'canvas.nodeTypes.video',
  [CANVAS_NODE_TYPES.GROUP]: 'canvas.nodeTypes.group',
}

export const getCanvasNodeTypeLabel = (type) => t(NODE_TYPE_LABEL_KEYS[type] || 'canvas.nodeTypes.node')

// 节点库条目：label/description 走 i18n（见 connectionRules.getCanvasNodeMeta），
// 此处只保留类型与图标等静态元数据
export const NODE_LIBRARY = [
  {
    type: CANVAS_NODE_TYPES.TEXT,
    icon: 'tabler:text-caption',
  },
  {
    type: CANVAS_NODE_TYPES.IMAGE,
    icon: 'tabler:photo',
  },
  {
    type: CANVAS_NODE_TYPES.VIDEO,
    icon: 'tabler:video',
  },
  {
    type: CANVAS_NODE_TYPES.GROUP,
    icon: 'tabler:category',
  },
]

// 提示词码头元数据：图标/结构静态保留，文案在 getCanvasPromptDockMeta 内按当前语言取
const CANVAS_PROMPT_DOCK_STATIC_META = {
  [CANVAS_NODE_TYPES.TEXT]: {
    icon: 'tabler:text-caption',
    modes: [
      { labelKey: 'modeContext', icon: 'tabler:messages' },
      { labelKey: 'modeTone', icon: 'tabler:mood-smile' },
      { labelKey: 'modeFormat', icon: 'tabler:layout-list' },
    ],
    tools: [
      { labelKey: 'toolTextGen', icon: 'tabler:writing' },
      { labelKey: 'toolStructured', icon: 'tabler:list-details' },
      { labelKey: 'toolLongForm', icon: 'tabler:article' },
      { labelKey: 'toolMarkdown', icon: 'tabler:markdown' },
      { labelKey: 'toolOneParagraph', suffixIcon: 'tabler:chevron-down', compact: true },
    ],
    estimateKey: 'estimateLight',
  },
  [CANVAS_NODE_TYPES.IMAGE]: {
    icon: 'tabler:photo',
    modes: [
      { labelKey: 'modeStyle', icon: 'tabler:cube' },
      { labelKey: 'modeMark', icon: 'tabler:sparkles' },
      { labelKey: 'modeReference', icon: 'tabler:plus' },
    ],
    tools: [
      { labelKey: 'toolAdaptive', icon: 'tabler:checkbox' },
      { labelKey: 'toolStandardQuality', icon: 'tabler:photo-cog' },
      { label: '2K', suffixIcon: 'tabler:chevron-down' },
      { labelKey: 'toolPreset', icon: 'tabler:layout-grid' },
      { labelKey: 'toolOneImage', suffixIcon: 'tabler:chevron-down', compact: true },
    ],
    estimate: '18',
  },
  [CANVAS_NODE_TYPES.VIDEO]: {
    icon: 'tabler:video',
    modes: [
      { labelKey: 'modeShot', icon: 'tabler:camera' },
      { labelKey: 'modeMotion', icon: 'tabler:route' },
      { labelKey: 'modeReference', icon: 'tabler:plus' },
    ],
    tools: [
      { label: '16:9', icon: 'tabler:aspect-ratio' },
      { labelKey: 'toolStandardQuality', icon: 'tabler:video-plus' },
      { label: '5s', suffixIcon: 'tabler:chevron-down' },
      { labelKey: 'toolCameraMotion', icon: 'tabler:arrows-shuffle' },
      { labelKey: 'toolOneVideo', suffixIcon: 'tabler:chevron-down', compact: true },
    ],
    estimateKey: 'estimateHigh',
  },
}

const PROMPT_DOCK_TEXT_KEYS = {
  [CANVAS_NODE_TYPES.TEXT]: { placeholder: 'textPlaceholder', modelPlaceholder: 'textModelPlaceholder', helper: 'textHelper' },
  [CANVAS_NODE_TYPES.IMAGE]: { placeholder: 'imagePlaceholder', modelPlaceholder: 'imageModelPlaceholder', helper: 'imageHelper' },
  [CANVAS_NODE_TYPES.VIDEO]: { placeholder: 'videoPlaceholder', modelPlaceholder: 'videoModelPlaceholder', helper: 'videoHelper' },
}

const DEFAULT_PROMPT_DOCK_STATIC_META = {
  icon: 'tabler:square',
  modes: [
    { labelKey: 'modeInput', icon: 'tabler:prompt' },
    { labelKey: 'modeParams', icon: 'tabler:adjustments' },
    { labelKey: 'modeReference', icon: 'tabler:plus' },
  ],
  tools: [
    { labelKey: 'toolDefault', icon: 'tabler:settings' },
  ],
  estimate: '',
}

const metaT = (key) => t(`canvas.promptDockMeta.${key}`)

const translateDockItems = (items = []) => items.map((item) => ({
  ...item,
  label: item.labelKey ? metaT(item.labelKey) : item.label,
}))

export function getCanvasPromptDockMeta(type) {
  const staticMeta = CANVAS_PROMPT_DOCK_STATIC_META[type] || DEFAULT_PROMPT_DOCK_STATIC_META
  const textKeys = PROMPT_DOCK_TEXT_KEYS[type] || {
    placeholder: 'defaultPlaceholder',
    modelPlaceholder: 'defaultModelPlaceholder',
    helper: 'defaultHelper',
  }
  return {
    label: getCanvasNodeTypeLabel(type),
    icon: staticMeta.icon,
    placeholder: metaT(textKeys.placeholder),
    modelPlaceholder: metaT(textKeys.modelPlaceholder),
    helper: metaT(textKeys.helper),
    modes: translateDockItems(staticMeta.modes),
    tools: translateDockItems(staticMeta.tools),
    estimate: staticMeta.estimateKey ? metaT(staticMeta.estimateKey) : (staticMeta.estimate || ''),
  }
}

export const getNodeDefaults = (type) => {
  const now = Date.now()
  const base = {
    title: getCanvasNodeTypeLabel(type),
    status: NODE_STATUS.IDLE,
    createdAt: now,
    updatedAt: now,
    payload: {},
  }

  switch (type) {
    case CANVAS_NODE_TYPES.TEXT:
      return {
        ...base,
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
        title: getCanvasNodeTypeLabel(type),
        layout: {
          width: 400,
          height: 300,
        },
      }
    default:
      return base
  }
}
