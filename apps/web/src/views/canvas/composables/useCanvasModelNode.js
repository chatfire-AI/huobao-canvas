import { CANVAS_NODE_TYPES } from '../constants/nodeTypes.js'
import { useModelRunner } from '../../../composables/useModelRunner.js'
import { getProviderForModel } from '@/config/providers/index.js'
import { getProviderApiKey } from '@/utils/apiKeySession.js'
import {
  DEFAULT_REFERENCE_IMAGE_LIMIT,
  getReferenceImageLimit,
  getVideoReferenceInfo,
  referenceImageLimitMessage,
} from '@/utils/referenceImages.js'

const textFieldCandidates = ['prompt', 'input', 'text', 'query']

const setBoundValue = (params, key, value) => {
  if (!key || value === undefined || value === null || value === '') return params
  return { ...params, [key]: value }
}

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = () => reject(reader.error)
  reader.readAsDataURL(file)
})

/**
 * 从上游图片节点解析可传输的图片来源：
 * URL 直出 / {url} 对象 / {b64_json} base64 → data URL / 本地上传 localFile → data URL。
 * 解析不到返回空串（blob: 本地对象地址不能作为请求参数下发）。
 */
const resolveUpstreamImage = async (payload) => {
  const firstResult = payload.parsedResults?.[0]
  if (typeof firstResult === 'string' && !firstResult.startsWith('blob:')) return firstResult
  if (firstResult && typeof firstResult === 'object') {
    const url = firstResult.url || firstResult.image_url
    if (url && !String(url).startsWith('blob:')) return url
    if (firstResult.b64_json) {
      return `data:${firstResult.mimeType || 'image/png'};base64,${firstResult.b64_json}`
    }
  }
  if (payload.localFile instanceof File) {
    try { return await fileToDataUrl(payload.localFile) } catch { return '' }
  }
  const fallback = payload.url || ''
  return fallback.startsWith('blob:') ? '' : fallback
}

export function applyCanvasInputBindings(params, bindings, inputs) {
  if (!bindings || typeof bindings !== 'object') return params
  let next = { ...params }
  next = setBoundValue(next, bindings.sourceImage, inputs.images[0])
  next = setBoundValue(next, bindings.lastFrameImage, inputs.images[1])
  next = setBoundValue(next, bindings.sourceImages, inputs.images)
  next = setBoundValue(next, bindings.sourceVideo, inputs.video)
  return next
}

function mergePromptIntoParams(params, prompt) {
  if (!prompt) return params
  const next = { ...params }
  const targetKey = textFieldCandidates.find((key) => Object.prototype.hasOwnProperty.call(next, key))
  if (targetKey) {
    next[targetKey] = prompt
    return next
  }
  if (Object.prototype.hasOwnProperty.call(next, 'messages')) {
    next.messages = JSON.stringify([{ role: 'user', content: prompt }], null, 2)
    return next
  }
  next.prompt = prompt
  return next
}

function mergeImageIntoParams(params, imageUrl) {
  if (!imageUrl) return params
  const next = { ...params }
  // 数组型多图字段（images，或声明为 images 类型的 image 字段）追加写入，
  // 避免多个上游图片节点 last-write-wins 互相覆盖
  const arrayKey = ['images', 'image'].find(
    (key) => Object.prototype.hasOwnProperty.call(next, key) && Array.isArray(next[key]),
  )
  if (arrayKey) {
    next[arrayKey] = next[arrayKey].includes(imageUrl) ? next[arrayKey] : [...next[arrayKey], imageUrl]
    return next
  }
  const targetKey = ['image', 'image_url', 'input_image', 'reference_image'].find((key) =>
    Object.prototype.hasOwnProperty.call(next, key)
  )
  next[targetKey || 'image_url'] = imageUrl
  return next
}

// 视频节点参考图按参考模式映射:首帧→first_frame 系,首尾帧→首帧+last_frame 系(有序),
// 全能参考→images/reference 系;探测失败回退通用合并(自定义 key 的模型)
function mergeVideoImagesIntoParams(params, images, videoRefInfo) {
  if (!images.length) return params
  if (videoRefInfo && videoRefInfo.mode !== 'text') {
    const next = { ...params }
    if (videoRefInfo.mode === 'reference' && videoRefInfo.referenceField) {
      next[videoRefInfo.referenceField.key] = [...images]
      return next
    }
    if (videoRefInfo.firstKey) next[videoRefInfo.firstKey] = images[0]
    if (videoRefInfo.mode === 'firstlast' && videoRefInfo.lastKey && images[1]) {
      next[videoRefInfo.lastKey] = images[1]
    }
    return next
  }
  return images.reduce((acc, url) => mergeImageIntoParams(acc, url), params)
}

// inputBindings 显式声明时的参考图容量:sourceImage=1 + lastFrameImage=1 + sourceImages=images 字段上限
function bindingsImageCapacity(bindings, fields) {
  if (!bindings || typeof bindings !== 'object') return null
  let capacity = 0
  if (bindings.sourceImage) capacity += 1
  if (bindings.lastFrameImage) capacity += 1
  if (bindings.sourceImages) {
    const imagesField = (fields || []).find((f) => String(f?.type || '').toLowerCase() === 'images')
    const max = Number(imagesField?.max ?? imagesField?.limit)
    capacity += Number.isFinite(max) && max > 0 ? Math.floor(max) : DEFAULT_REFERENCE_IMAGE_LIMIT
  }
  return capacity > 0 ? capacity : null
}

export function useCanvasModelNode({
  getIncomingNodes,
  updateNodePayload,
  materializeCanvasResults,
  detachResultOwnership,
  getNestedValue,
}) {
  const { resumeModelTask, runModel } = useModelRunner({ getNestedValue })

  // imageLimit:目标模型的参考图上限(由 schema image/images 字段推断),超出的上游图片忽略并计数;
  // videoRefInfo:视频节点的参考模式(首帧/首尾帧/全能参考),决定图片写入哪些字段
  const collectUpstreamParams = async (node, baseParams = {}, inputBindings = null, imageLimit = Infinity, videoRefInfo = null) => {
    let params = { ...baseParams }
    const incoming = getIncomingNodes(node.id)
    const inputs = { images: [], video: '' }
    const sourceResults = []
    const isVideoNode = node.type === CANVAS_NODE_TYPES.VIDEO
    let droppedImages = 0

    for (const item of incoming) {
      const source = item.node
      if (!source) continue
      const payload = source.data?.payload || {}
      if (source.type === CANVAS_NODE_TYPES.TEXT) {
        params = mergePromptIntoParams(params, payload.prompt)
      }
      if (source.type === CANVAS_NODE_TYPES.IMAGE) {
        const imageUrl = await resolveUpstreamImage(payload)
        if (imageUrl) {
          if (inputs.images.length >= imageLimit) {
            droppedImages += 1
          } else {
            inputs.images.push(imageUrl)
            // 视频节点延迟到循环后按参考模式映射(首帧/尾帧有序),非视频节点沿用通用合并
            if (!inputBindings && !isVideoNode) params = mergeImageIntoParams(params, imageUrl)
          }
        }
      }
      if (source.type === CANVAS_NODE_TYPES.VIDEO) {
        const firstResult = payload.parsedResults?.[0]
        const videoUrl = typeof firstResult === 'string'
          ? firstResult
          : firstResult?.url || firstResult?.video_url || payload.url
        inputs.video = videoUrl || inputs.video
        if (!inputBindings && videoUrl) params.video_url = videoUrl
      }
      if (payload.result) {
        sourceResults.push(payload.result)
      }
    }

    // 聚合所有上游结果：单上游时仍是对象（与旧行为一致），多上游时为数组，
    // 避免原先 last-write-wins 互相覆盖导致结果丢失。
    if (sourceResults.length === 1) params.source_result = sourceResults[0]
    else if (sourceResults.length > 1) params.source_results = sourceResults

    // 视频节点无显式绑定时,按参考模式把有序图片列表映射到首帧/尾帧/参考字段
    if (!inputBindings && isVideoNode) {
      params = mergeVideoImagesIntoParams(params, inputs.images, videoRefInfo)
    }

    return { params: applyCanvasInputBindings(params, inputBindings, inputs), droppedImages }
  }

  const validateRequiredFields = (fields, params) => {
    const missing = fields
      .filter((field) => field.required)
      .filter((field) => {
        const value = params[field.key]
        if (Array.isArray(value)) return value.length === 0
        return value === undefined || value === null || value === ''
      })
      .map((field) => field.label || field.key)

    if (missing.length) {
      throw new Error(`缺少必填参数：${missing.join('、')}`)
    }
  }

  const runCanvasModelNode = async ({
    node,
    apiKey,
    apiBaseUrl,
    modelData,
    formData,
    selectedEndpoint,
    inputTransformSchema,
    requestTypeSchema,
    asyncModeSchema,
    outputSchema,
    inputBindingsSchema,
    videoModes,
    schemaFields,
    applyInputTransform,
    signal,
    onTaskSubmitted,
  }) => {
    if (!node) throw new Error('请选择节点')
    // 官方直连模式的模型按厂商取 Key（设置页配置）；网关模式用全局 Key
    const nodeProvider = getProviderForModel(modelData || {})
    const nodeProviderKey = nodeProvider ? getProviderApiKey(nodeProvider.id) : ''
    if (!apiKey && !nodeProviderKey) {
      throw new Error(nodeProvider
        ? `请先在设置页配置 ${nodeProvider.label} 的 API Key`
        : '请先创建或选择 API Key')
    }
    if (!modelData?.name) throw new Error('请先选择模型')

    // 参考图上限:图片节点 image=1 / images=max;视频节点按参考模式
    // (文生=0 / 首帧=1 / 首尾帧=2 / 全能参考=max),显式 inputBindings 优先,探测失败回退通用推断
    const isVideoNode = node.type === CANVAS_NODE_TYPES.VIDEO
    const videoRefInfo = isVideoNode ? getVideoReferenceInfo(schemaFields, videoModes) : null
    let imageLimit
    if (isVideoNode) {
      imageLimit = bindingsImageCapacity(inputBindingsSchema, schemaFields)
        ?? (videoRefInfo.mode !== 'text' || videoRefInfo.declared
          ? videoRefInfo.limit
          : getReferenceImageLimit(schemaFields))
    } else {
      imageLimit = getReferenceImageLimit(schemaFields)
    }
    const { params: upstreamParams, droppedImages } = await collectUpstreamParams(
      node, formData, inputBindingsSchema, imageLimit, videoRefInfo,
    )
    if (droppedImages > 0) {
      window.$message?.warning(referenceImageLimitMessage(imageLimit, droppedImages))
    }
    const mergedParams = mergePromptIntoParams(upstreamParams, node.data?.payload?.prompt || '')
    validateRequiredFields(schemaFields, mergedParams)
    detachResultOwnership?.(node.id)
    updateNodePayload?.(node.id, { params: mergedParams })

    const runResult = await runModel({
      apiKey,
      apiBaseUrl,
      modelData,
      formData: mergedParams,
      selectedEndpoint,
      inputTransformSchema,
      requestTypeSchema,
      asyncModeSchema,
      outputSchema,
      applyInputTransform,
      signal,
      onTaskSubmitted,
    })

    if (!runResult.pending) materializeCanvasResults?.(node.id, runResult)
    return runResult
  }

  return {
    collectUpstreamParams,
    resumeModelTask,
    runCanvasModelNode,
  }
}
