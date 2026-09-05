// 图片模型主栏：比例/分辨率/质量/数量（含 camelCase 变体兼容 Gemini/Veo）
const IMAGE_PRIMARY_KEYS = [
  'ratio', 'aspect_ratio', 'aspectRatio',
  'resolution', 'size', 'image_size', 'imageSize',
  'quality',
  'n', 'count', 'image_count',
]

// 视频模型主栏：仅时长/分辨率/比例
const VIDEO_PRIMARY_KEYS = [
  'duration', 'durationSeconds',
  'resolution',
  'ratio', 'aspect_ratio', 'aspectRatio',
]

const COUNT_KEYS = new Set(['n', 'count', 'image_count'])

/**
 * 将模型 schema 字段分为：prompt / 主栏直出 / 收进「更多」
 * 主栏最多 3 个下拉 chip；数量段按钮（n/count）紧凑渲染，始终保留
 * @param fields schema input 字段数组
 * @param modelType 模型类型 '2'=图片 '3'=视频（其他按图片处理）
 */
export function partitionCanvasFields(fields = [], modelType = '') {
  const prompt = fields.find((field) => ['prompt', 'input', 'text', 'query'].includes(field.key)) || null
  const keys = modelType === '3' ? VIDEO_PRIMARY_KEYS : IMAGE_PRIMARY_KEYS
  const order = new Map(keys.map((key, index) => [key, index]))
  const matched = fields
    .filter((field) => order.has(field.key))
    .sort((a, b) => order.get(a.key) - order.get(b.key))
  const countField = matched.find((field) => COUNT_KEYS.has(field.key))
  const chips = matched.filter((field) => !COUNT_KEYS.has(field.key)).slice(0, 3)
  const primary = countField ? [...chips, countField] : chips
  const primaryKeys = new Set(primary.map((field) => field.key))

  return {
    prompt,
    primary,
    more: fields.filter((field) => field !== prompt && !primaryKeys.has(field.key)),
  }
}
