import { i18n } from '@/locales'

const FIELD_GROUP_ORDER = [
  { key: 'basic' },
  { key: 'generation' },
  { key: 'media' },
  { key: 'advanced' },
  { key: 'callback' },
  { key: 'debug' }
]

const fieldGroupLabel = (key) => i18n.global.t(`playground.groups.${key}`)

const FIELD_GROUP_KEYS = new Set(FIELD_GROUP_ORDER.map(group => group.key))

const unwrapValue = (value) => {
  if (value && typeof value === 'object' && 'value' in value) return value.value
  return value
}

const normalizeKey = (value) => String(value || '').trim()
const lowerKey = (value) => normalizeKey(value).toLowerCase()

export function getTransportType(endpoint, requestTypeSchema) {
  const requestType = lowerKey(unwrapValue(requestTypeSchema))
  const contentType = lowerKey(endpoint?.contentType || endpoint?.content_type || endpoint?.requestType || endpoint?.request_type)

  if (
    requestType === 'formdata' ||
    requestType === 'form-data' ||
    requestType === 'multipart' ||
    contentType === 'form' ||
    contentType === 'formdata' ||
    contentType === 'form-data' ||
    contentType.includes('multipart/form-data')
  ) {
    return 'FormData'
  }

  return 'JSON'
}

export function getEndpointActionLabel(endpoint, index = 0) {
  const explicitLabel = endpoint?.title || endpoint?.name || endpoint?.action || endpoint?.label
  if (explicitLabel) return explicitLabel

  const path = endpoint?.path || endpoint?.url
  if (path) return path

  return `Endpoint ${index + 1}`
}

function getEndpointSummary(endpoint, requestTypeSchema) {
  return {
    label: getEndpointActionLabel(endpoint),
    path: endpoint?.path || endpoint?.url || '',
    method: endpoint?.method || 'POST',
    transport: getTransportType(endpoint, requestTypeSchema),
    asyncMode: endpoint?.asyncMode || endpoint?.async_mode || endpoint?.mode || 'auto'
  }
}

export function normalizeFieldControl(field) {
  const rawType = typeof field === 'string'
    ? field
    : field?.control || field?.component || field?.type || field?.inputType || field?.format || 'text'
  const type = lowerKey(rawType)

  if (['textarea', 'longtext', 'multiline', 'json', 'object', 'array'].includes(type)) return 'textarea'
  if (['select', 'dropdown', 'enum', 'combobox'].includes(type)) return 'select'
  if (['number', 'integer', 'float', 'double', 'int'].includes(type)) return 'number'
  if (['slider', 'range'].includes(type)) return 'slider'
  if (['switch', 'boolean', 'bool', 'toggle'].includes(type)) return 'switch'
  if (['radio', 'radiogroup'].includes(type)) return 'radio'
  if (['checkbox', 'checklist', 'multiselect', 'multi-select'].includes(type)) return 'checkbox'
  if (['file', 'upload', 'binary'].includes(type)) return 'file'
  if (['image', 'image_upload', 'image-upload'].includes(type)) return 'image'
  if (['images', 'image-list', 'multi-image', 'multi_image'].includes(type)) return 'images'
  if (['password', 'secret'].includes(type)) return 'password'

  return 'text'
}

function getFieldGroup(field, resultType) {
  const explicitGroup = lowerKey(field?.group || field?.category || field?.section)
  if (FIELD_GROUP_KEYS.has(explicitGroup)) return explicitGroup

  const key = lowerKey(field?.key || field?.name || field?.field)
  const control = normalizeFieldControl(field)
  const result = lowerKey(resultType)

  if (
    ['callback_url', 'webhook_url', 'notify_url', 'response_url'].includes(key) ||
    key.includes('callback') ||
    key.includes('webhook')
  ) {
    return 'callback'
  }

  if (
    ['debug', 'verbose', 'stream', 'raw', 'trace', 'logprobs'].includes(key) ||
    key.startsWith('debug_') ||
    key.endsWith('_debug')
  ) {
    return 'debug'
  }

  if (
    control === 'file' ||
    control === 'images' ||
    ['image', 'images', 'mask', 'audio', 'file', 'files', 'input_audio', 'input_image'].includes(key) ||
    key.includes('image') ||
    key.includes('audio') ||
    key.includes('mask')
  ) {
    return 'media'
  }

  if (
    ['prompt', 'messages', 'input', 'content', 'text'].includes(key) ||
    (result === 'chat' && key === 'system')
  ) {
    return 'basic'
  }

  if (
    [
      'model',
      'size',
      'n',
      'quality',
      'style',
      'seed',
      'temperature',
      'top_p',
      'max_tokens',
      'max_completion_tokens',
      'response_format',
      'voice',
      'speed',
      'duration',
      'resolution',
      'aspect_ratio'
    ].includes(key)
  ) {
    return 'generation'
  }

  if (field?.required) return 'basic'

  return 'advanced'
}

export function isPrimaryExperienceField(field, resultType) {
  if (field?.quick === true || field?.primary === true) return true

  const key = lowerKey(field?.key || field?.name || field?.field)
  if (['prompt', 'messages', 'input', 'image', 'mask', 'audio'].includes(key)) return true

  const result = lowerKey(resultType)
  if (result === 'chat' && ['system', 'user'].includes(key)) return true

  return false
}

export function groupSchemaFields(fields, resultType) {
  const grouped = new Map(FIELD_GROUP_ORDER.map(group => [
    group.key,
    {
      key: group.key,
      label: fieldGroupLabel(group.key),
      fields: [],
      requiredCount: 0,
      totalCount: 0
    }
  ]))

  const list = Array.isArray(fields) ? fields : []
  for (const field of list) {
    if (!field || typeof field !== 'object') continue

    const groupKey = getFieldGroup(field, resultType)
    const group = grouped.get(groupKey) || grouped.get('advanced')
    const normalizedField = {
      ...field,
      control: normalizeFieldControl(field),
      group: group.key,
      primary: isPrimaryExperienceField(field, resultType)
    }

    group.fields.push(normalizedField)
    group.totalCount += 1
    if (field.required) group.requiredCount += 1
  }

  return FIELD_GROUP_ORDER
    .map(group => grouped.get(group.key))
    .filter(group => group.totalCount > 0)
}
