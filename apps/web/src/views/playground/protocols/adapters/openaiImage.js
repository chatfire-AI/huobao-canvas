import { extractMediaResult, hasTaskHeader, readTaskIdFromResponse } from '../adapter.js'

export const openaiImage = {
  protocolKey: 'openai-image',
  behavior: { type: 'image', stream: false, async: false },
  buildRequest({ modelName, formData, inputTransform, endpoint }) {
    const data = inputTransform ? inputTransform(formData) : formData
    const isEdit = /\/images\/edits/.test(endpoint?.path || '')
    // xAI 的 /images/edits 只接受 JSON（image 需 {url} 对象包装），不走 multipart
    const useFormData = isEdit && !(endpoint?.path || '').includes('/official/xai/')
    return { body: { model: modelName, ...data }, contentType: useFormData ? 'formdata' : 'json' }
  },
  parseStreamEvent() { return { text: '', imageParts: [], done: true } },
  extractText() { return '' },
  extractMedia(result, outputSchema, getNestedValue) {
    return extractMediaResult(result, 'image', outputSchema, getNestedValue)
  },
  isAsyncResponse(response, endpoint) {
    if (hasTaskHeader(response)) return true
    return String(endpoint?.responseMode || '').toUpperCase() === 'ASYNC'
  },
  parseTaskLink(response, endpoint) {
    const id = readTaskIdFromResponse(response, response)
    if (!id) return null
    return { taskId: id, resultType: 'image' }
  },
}
