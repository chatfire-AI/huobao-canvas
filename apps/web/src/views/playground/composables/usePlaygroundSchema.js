import { ref, computed } from 'vue'
import { getEndpointBehavior, getDefaultChatParams, getDefaultImageParams, getDefaultVideoParams } from '../constants/index'
import { endpointCapability, resolveModelEndpoints } from '../utils/modelEndpoints'
import { mergeEndpointSchema } from '../utils/mergeEndpointSchema.js'
import { createInputTransformEngine, getNestedValue } from '@/utils/inputTransform.js'

const applyInputTransformEngine = createInputTransformEngine()

export function usePlaygroundSchema() {
  const modelData = ref({})
  const schemaFields = ref([])
  const inputTransformSchema = ref(null)
  const requestTypeSchema = ref('json')
  const asyncModeSchema = ref('auto')
  const outputSchema = ref(null)
  const inputBindingsSchema = ref(null)
  const chatConfigSchema = ref({
    supportImage: false,
    supportFile: false,
    supportWeb: false,
    supportDeepThink: false
  })
  const endpointSchemasMap = ref(null)
  const cachedGlobalSchema = ref(null)
  const videoModesSchema = ref(null)
  const formData = ref({})

  const selectedEndpointIndex = ref(0)

  const parsedEndpoints = computed(() => {
    const endpoints = resolveModelEndpoints(modelData.value)
    if (Array.isArray(endpoints) && endpoints.length > 0) return endpoints
    const typeName = modelData.value.typeName || ''
    const legacy = modelData.value.endpoint
    // 优先按类型码（'1'对话/'2'图片/'3'视频）判定；typeName 已本地化，中文匹配仅兜底历史数据
    const typeCodes = String(modelData.value.type || '').split(',').map((s) => s.trim())
    if (typeCodes.includes('3') || typeName.includes('视频'))
      return [{ path: legacy ? `/v1${legacy}` : '/v1/videos/generations', contentType: 'JSON', queryPath: '/v1/videos/{taskId}' }]
    if (typeCodes.includes('2') || typeName.includes('图片'))
      return [{ path: legacy ? `/v1${legacy}` : '/v1/images/generations', contentType: 'JSON' }]
    if (typeCodes.includes('1') || typeName.includes('对话') || typeName.includes('文本'))
      return [{ path: '/v1/chat/completions', contentType: 'JSON' }]
    if (legacy) return [{ path: `/v1${legacy}`, contentType: 'JSON' }]
    return [{ path: '/v1/chat/completions', contentType: 'JSON' }]
  })

  const selectedEndpoint = computed(() => parsedEndpoints.value[selectedEndpointIndex.value] || parsedEndpoints.value[0])

  const endpointOptions = computed(() =>
    parsedEndpoints.value.map((ep, idx) => ({ label: `POST ${ep.path} (${ep.contentType || 'JSON'})`, value: idx }))
  )

  const defaultChatConfig = { supportImage: false, supportFile: false, supportWeb: false, supportDeepThink: false }

  const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key)

  const createParsedSchema = (schema = {}, applyDefaults = true) => {
    const chatConfig = hasOwn(schema, 'chatConfig')
      ? (schema.chatConfig ? { ...(applyDefaults ? defaultChatConfig : {}), ...schema.chatConfig } : undefined)
      : (applyDefaults ? defaultChatConfig : undefined)

    return {
      input: hasOwn(schema, 'input') ? (Array.isArray(schema.input) ? schema.input : []) : (applyDefaults ? [] : undefined),
      inputTransform: hasOwn(schema, 'inputTransform') ? schema.inputTransform : (applyDefaults ? null : undefined),
      requestType: hasOwn(schema, 'requestType') ? schema.requestType : (applyDefaults ? 'json' : undefined),
      asyncMode: hasOwn(schema, 'asyncMode') ? schema.asyncMode : (applyDefaults ? 'auto' : undefined),
      chatConfig,
      output: hasOwn(schema, 'output') ? schema.output : (applyDefaults ? null : undefined),
      inputBindings: hasOwn(schema, 'inputBindings') ? schema.inputBindings : (applyDefaults ? null : undefined),
      endpointSchemas: hasOwn(schema, 'endpointSchemas') ? schema.endpointSchemas : (applyDefaults ? null : undefined),
      videoModes: hasOwn(schema, 'videoModes') ? schema.videoModes : (applyDefaults ? null : undefined)
    }
  }

  const parseSchema = (schemaStr, { applyDefaults = true } = {}) => {
    if (!schemaStr) return createParsedSchema({}, applyDefaults)
    try {
      const schema = typeof schemaStr === 'string' ? JSON.parse(schemaStr) : schemaStr
      if (schema && typeof schema === 'object' && !Array.isArray(schema)) {
        return createParsedSchema(schema, applyDefaults)
      }
      if (Array.isArray(schema)) {
        return createParsedSchema({ input: schema }, applyDefaults)
      }
      return createParsedSchema({}, applyDefaults)
    } catch (e) {
      console.error('Parse schema error:', e)
      return createParsedSchema({}, applyDefaults)
    }
  }

  const initFormData = () => {
    const data = {}
    schemaFields.value.forEach(field => {
      if (field.defaultValue !== undefined && field.defaultValue !== '') {
        data[field.key] = field.defaultValue
      } else if (field.type === 'checkbox' || field.type === 'images') {
        data[field.key] = []
      } else if (field.type === 'switch') {
        data[field.key] = false
      } else if (field.type === 'number' || field.type === 'slider') {
        data[field.key] = field.min || 0
      } else {
        data[field.key] = ''
      }
    })
    formData.value = data
  }

  const applyEndpointSchema = (endpointPath) => {
    const globalSchema = cachedGlobalSchema.value || parseSchema(modelData.value.modelSchema, { applyDefaults: false })
    const epSchema = endpointSchemasMap.value?.[endpointPath]
      ? parseSchema(endpointSchemasMap.value[endpointPath], { applyDefaults: false })
      : null

    // 从 endpoint 条目读取模板 schema（由后端 ModelQueryService.enrichEndpointsSchemaJson() 注入）
    const ep = parsedEndpoints.value.find(e => e.path === endpointPath)
    const templateSchema = ep?.schemaJson ? parseSchema(ep.schemaJson, { applyDefaults: false }) : null
    const templateRequestType = ep?.templateRequestType || null

    // 合并优先级：epSchema(端点覆盖) > globalSchema(模型级，迁移数据) > templateSchema(端点模板) > 默认；
    // 空 input 数组视为未声明（模板 Chat 系 input 恰为 []，不得吞掉模型级字段）
    const merged = mergeEndpointSchema({ epSchema, templateSchema, templateRequestType, globalSchema, defaultChatConfig })

    if (merged.input.length === 0) {
      const capability = endpointCapability(selectedEndpoint.value)
      const { behavior } = getEndpointBehavior(endpointPath, capability)
      if (behavior === 'chat') {
        schemaFields.value = getDefaultChatParams()
      } else if (capability === 'image' || /image/.test(endpointPath)) {
        schemaFields.value = getDefaultImageParams()
      } else if (capability === 'video' || behavior === 'async' || /video/.test(endpointPath)) {
        schemaFields.value = getDefaultVideoParams()
      } else {
        schemaFields.value = getDefaultChatParams()
      }
    } else {
      schemaFields.value = merged.input
    }

    inputTransformSchema.value = merged.inputTransform
    requestTypeSchema.value = merged.requestType
    asyncModeSchema.value = merged.asyncMode
    chatConfigSchema.value = merged.chatConfig
    outputSchema.value = merged.output
    inputBindingsSchema.value = merged.inputBindings
    videoModesSchema.value = merged.videoModes

    initFormData()
  }

  // transform 引擎为纯函数（utils/inputTransform.js，Node 服务端共用），此处绑定返回
  const applyInputTransform = applyInputTransformEngine

  const formatOption = (opt) => {
    if (typeof opt === 'string' || typeof opt === 'number' || typeof opt === 'boolean') {
      return { label: String(opt), value: opt }
    }
    if (!opt || typeof opt !== 'object') {
      return { label: String(opt ?? ''), value: opt }
    }
    const value = opt.value ?? opt.key ?? opt.name ?? opt.label
    return {
      label: opt.label ?? opt.name ?? String(value),
      value
    }
  }

  const formatOptions = (options) => {
    if (!Array.isArray(options)) return []
    return options.map(formatOption)
  }

  const setupModel = (res) => {
    modelData.value = res
    const parsed = parseSchema(res?.modelSchema, { applyDefaults: false })
    const { endpointSchemas, ...globalSchema } = parsed
    cachedGlobalSchema.value = globalSchema
    endpointSchemasMap.value = endpointSchemas
  }

  return {
    modelData,
    schemaFields,
    inputTransformSchema,
    requestTypeSchema,
    asyncModeSchema,
    outputSchema,
    inputBindingsSchema,
    chatConfigSchema,
    videoModesSchema,
    formData,
    selectedEndpointIndex,
    parsedEndpoints,
    selectedEndpoint,
    endpointOptions,
    parseSchema,
    initFormData,
    applyEndpointSchema,
    applyInputTransform,
    getNestedValue,
    formatOptions,
    setupModel
  }
}
