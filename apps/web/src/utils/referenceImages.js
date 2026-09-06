/**
 * 参考图上限推断:模型 schema 的 image/images 字段决定可接受的参考图数量。
 * - image  = 单图模型,上限 1
 * - images = 多图模型,取字段 max/limit 配置(与演武场 FieldControl 的 :max 同一约定),未配置默认 9
 * - 无媒体字段 = 该模型不支持参考图,上限 0
 * 对话创作与画布共用,保证两处限制口径一致。
 *
 * 视频模型更复杂,按四种参考模式探测(与演武场 ExperiencePanel 同一约定):
 * - text      文生视频:不收参考图
 * - first     首帧:1 张 → first_frame/image/image_url 字段
 * - firstlast 首尾帧:2 张,有序 → 首帧字段 + last_frame/lastFrame 字段
 * - reference 全能参考:多张 → images/reference_* 字段(上限取字段 max)
 * 模型在 schema.videoModes 显式声明时以声明为准,否则按字段 key 探测。
 */
import { i18n } from '@/locales'

// 调用点求值：切语言后新生成的文案跟随当前语言
const t = (key, params) => i18n.global.t(key, params)

const IMAGE_FIELD_TYPES = new Set(['image', 'images'])

export const DEFAULT_REFERENCE_IMAGE_LIMIT = 9

// 参考模式标签为用户可见文案，改为函数在调用点取当前语言
// （原 VIDEO_REFERENCE_MODES 常量无消费方，已移除；key 保持不变）
export const getVideoReferenceModes = () => [
  { key: 'text', label: t('runtime.reference.modeText') },
  { key: 'first', label: t('runtime.reference.modeFirst') },
  { key: 'firstlast', label: t('runtime.reference.modeFirstLast') },
  { key: 'reference', label: t('runtime.reference.modeReference') },
]
const FIRST_FRAME_KEYS = ['first_frame', 'image', 'image_url']
// 尾帧键：last_frame（qwen）/ lastFrame（驼峰）/ last_image（volcengine seedance、vidu）
const LAST_FRAME_KEYS = ['last_frame', 'lastFrame', 'last_image']
const REFERENCE_KEY_PATTERN = /^(images|input_reference|reference_)/

export const findReferenceImageField = (fields) =>
  (fields || []).find((field) => IMAGE_FIELD_TYPES.has(String(field?.type || '').toLowerCase())) || null

const fieldImageLimit = (field) => {
  if (!field) return 0
  if (String(field.type).toLowerCase() === 'image') return 1
  const max = Number(field.max ?? field.limit)
  return Number.isFinite(max) && max > 0 ? Math.floor(max) : DEFAULT_REFERENCE_IMAGE_LIMIT
}

export const getReferenceImageLimit = (fields) => {
  const field = findReferenceImageField(fields)
  return field ? fieldImageLimit(field) : 0
}

/**
 * 视频模型参考能力探测。
 * @returns {{ mode: string, limit: number, declared: boolean,
 *   firstKey: string, lastKey: string, referenceField: object|null }}
 *   declared=true 表示模型显式声明了 videoModes,探测失败时不应回退到通用注入
 */
export const getVideoReferenceInfo = (fields, declaredModes) => {
  const list = fields || []
  const byKey = new Map(list.map((field) => [field?.key, field]))
  const firstKey = FIRST_FRAME_KEYS.find((key) => byKey.has(key)) || ''
  const lastKey = LAST_FRAME_KEYS.find((key) => byKey.has(key)) || ''
  const referenceField = list.find((field) =>
    String(field?.type || '').toLowerCase() === 'images' || REFERENCE_KEY_PATTERN.test(field?.key || '')) || null

  const declared = Array.isArray(declaredModes) && declaredModes.length > 0
  const modes = declared
    ? declaredModes
    : ['text', firstKey && 'first', firstKey && lastKey && 'firstlast', referenceField && 'reference'].filter(Boolean)

  if (modes.includes('reference') && referenceField) {
    return { mode: 'reference', limit: fieldImageLimit(referenceField), declared, firstKey, lastKey, referenceField }
  }
  if (modes.includes('firstlast') && firstKey && lastKey) {
    return { mode: 'firstlast', limit: 2, declared, firstKey, lastKey, referenceField }
  }
  if (modes.includes('first') && firstKey) {
    return { mode: 'first', limit: 1, declared, firstKey, lastKey, referenceField }
  }
  return { mode: 'text', limit: 0, declared, firstKey, lastKey, referenceField }
}

/** 参考图超限提示文案 */
export const referenceImageLimitMessage = (limit, dropped) => {
  if (limit <= 0) return t('runtime.reference.limitUnsupported')
  return t('runtime.reference.limitExceeded', { limit, dropped })
}
