/**
 * Playground 常量配置
 */

// API 配置（单一来源见 apiBaseUrl.js）
export { DEFAULT_API_BASE_URL } from './apiBaseUrl.js'

// 输入视图选项
export const INPUT_VIEW_OPTIONS = [
  { 
    type: 'group', 
    label: 'Editable', 
    key: 'editable', 
    children: [
      { label: 'Form', key: 'form' },
      { label: 'JSON', key: 'json' }
    ]
  },
  { 
    type: 'group', 
    label: 'Languages (Read-only)', 
    key: 'languages', 
    children: [
      { label: 'JavaScript', key: 'javascript' },
      { label: 'Python', key: 'python' },
      { label: 'cURL', key: 'curl' },
      { label: 'Java', key: 'java' },
      { label: 'Go', key: 'go' }
    ]
  }
]

// 输入视图标签映射
export const INPUT_VIEW_LABELS = {
  form: 'Form',
  json: 'JSON',
  javascript: 'JavaScript',
  python: 'Python',
  curl: 'cURL',
  java: 'Java',
  go: 'Go'
}

// 输入视图图标映射
export const INPUT_VIEW_ICONS = {
  form: 'tabler:forms',
  json: 'tabler:braces',
  javascript: 'tabler:brand-javascript',
  python: 'tabler:brand-python',
  curl: 'tabler:terminal-2',
  java: 'tabler:coffee',
  go: 'tabler:brand-golang'
}

// 代码视图列表
export const CODE_VIEWS = ['javascript', 'python', 'curl', 'java', 'go']

// Workbench 类型标签
const WORKBENCH_TYPE_TABS = [
  { key: 'all', label: '全部', icon: 'tabler:apps' },
  { key: 'chat', label: 'Chat', icon: 'tabler:message-circle' },
  { key: 'image', label: 'Image', icon: 'tabler:photo' },
  { key: 'video', label: 'Video', icon: 'tabler:video' }
]

// Workbench 参数分组
const WORKBENCH_FIELD_GROUPS = [
  { key: 'basic', label: '基础参数' },
  { key: 'generation', label: '生成控制' },
  { key: 'media', label: '媒体输入' },
  { key: 'advanced', label: '高级参数' },
  { key: 'callback', label: '回调设置' },
  { key: 'debug', label: '调试参数' }
]

// 结果视图标签
const RESULT_VIEW_TABS = [
  { key: 'preview', label: 'Preview', icon: 'tabler:layout-dashboard' },
  { key: 'json', label: 'JSON', icon: 'tabler:braces' },
  { key: 'headers', label: 'Headers', icon: 'tabler:file-description' }
]

// 状态类型映射
export const STATUS_TYPE_MAP = {
  idle: 'default',
  running: 'warning',
  polling: 'warning',
  success: 'success',
  error: 'error'
}

// 状态文本映射
export const STATUS_TEXT_MAP = {
  idle: 'Idle',
  running: 'Running...',
  polling: 'Polling...',
  success: 'Success',
  error: 'Error'
}

// 语言映射（用于代码高亮）
const LANGUAGE_MAP = {
  javascript: 'javascript',
  python: 'python',
  curl: 'bash',
  java: 'java',
  go: 'go',
  json: 'json'
}

// 端点路径 → 行为类型映射
const ENDPOINT_BEHAVIOR_MAP = {
  '/v1/chat/completions':     { behavior: 'chat', streaming: true },
  '/v1/messages':             { behavior: 'chat', streaming: true },
  '/v1/responses':            { behavior: 'chat', streaming: true },
  '/v1/images/generations':   { behavior: 'sync', streaming: false },
  '/v1/images/edits':         { behavior: 'sync', streaming: false },
  '/v1/videos/generations':  { behavior: 'async', streaming: false },
}

export function getEndpointBehavior(path, capability = '') {
  const normalizedCapability = String(capability || '').toLowerCase()
  if (normalizedCapability === 'chat') return { behavior: 'chat', streaming: true }
  if (normalizedCapability === 'video') return { behavior: 'async', streaming: false }
  if (!path) return { behavior: 'sync', streaming: false }
  const entry = ENDPOINT_BEHAVIOR_MAP[path]
  if (entry) return entry
  if (/chat|completions|messages|responses/.test(path)) return { behavior: 'chat', streaming: true }
  if (/video|predictLongRunning|generations\/tasks/.test(path)) return { behavior: 'async', streaming: false }
  return { behavior: 'sync', streaming: false }
}

export function getEndpointDisplayType(path, capability = '') {
  const normalizedCapability = String(capability || '').toLowerCase()
  if (['chat', 'image', 'video'].includes(normalizedCapability)) {
    return normalizedCapability
  }
  const { behavior } = getEndpointBehavior(path, capability)
  if (behavior === 'chat') return 'chat'
  if (behavior === 'async') return 'video'
  if (/image/.test(path)) return 'image'
  return 'text'
}

// 图片模型默认参数
export const DEFAULT_IMAGE_PARAMS = [
  {
    id: 1, key: 'prompt', label: 'Prompt', type: 'textarea', required: true,
    defaultValue: 'A cute cat sitting on a windowsill',
    description: '图片描述文本'
  },
  {
    id: 2, key: 'size', label: 'Size', type: 'select',
    defaultValue: '1024x1024',
    options: [
      { label: '1024x1024', value: '1024x1024' },
      { label: '1024x1792', value: '1024x1792' },
      { label: '1792x1024', value: '1792x1024' },
      { label: '512x512', value: '512x512' }
    ],
    description: '图片尺寸'
  },
  {
    id: 3, key: 'n', label: 'N', type: 'number',
    min: 1, max: 4, defaultValue: 1,
    description: '生成图片数量'
  }
]

// 视频模型默认参数
export const DEFAULT_VIDEO_PARAMS = [
  {
    id: 1, key: 'prompt', label: 'Prompt', type: 'textarea', required: true,
    defaultValue: 'A cat walking on the beach at sunset',
    description: '视频描述文本'
  }
]

// 对话模型默认参数（当模型未配置 input schema 时使用）
export const DEFAULT_CHAT_PARAMS = [
  {
    id: 1, key: 'messages', label: 'Messages', type: 'textarea', required: true,
    defaultValue: JSON.stringify([{ role: 'user', content: 'Hello' }], null, 2),
    description: '对话消息数组，格式: [{"role":"user","content":"..."}]'
  },
  {
    id: 2, key: 'stream', label: 'Stream', type: 'switch', defaultValue: true,
    description: '是否使用流式输出 (SSE)'
  },
  {
    id: 3, key: 'temperature', label: 'Temperature', type: 'slider',
    min: 0, max: 2, step: 0.1, defaultValue: 0.7,
    description: '采样温度，值越高输出越随机'
  },
  {
    id: 4, key: 'max_tokens', label: 'Max Tokens', type: 'number',
    min: 1, max: 128000, defaultValue: 4096,
    description: '最大输出 token 数'
  }
]
