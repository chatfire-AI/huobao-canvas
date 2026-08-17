import { extractMediaResult, hasTaskHeader, readTaskIdFromResponse } from '../adapter.js'

export const ark = {
  protocolKey: 'ark',
  behavior: { type: 'video', stream: false, async: true },
  buildRequest({ modelName, formData, inputTransform, endpoint }) {
    const data = inputTransform ? inputTransform(formData) : formData
    return { body: { model: modelName, ...data }, contentType: 'json' }
  },
  parseStreamEvent() { return { text: '', imageParts: [], done: true } },
  extractText() { return '' },
  extractMedia(result, outputSchema, getNestedValue) {
    const displayType = outputSchema?.displayType === 'image' ? 'image' : 'video'
    return extractMediaResult(result, displayType, outputSchema, getNestedValue)
  },
  isAsyncResponse(response, endpoint) {
    if (hasTaskHeader(response)) return true
    const mode = String(endpoint?.responseMode || '').toUpperCase()
    return mode === 'ASYNC' || /contents\/generations\/tasks/.test(endpoint?.path || '')
  },
  parseTaskLink(response, endpoint) {
    const id = readTaskIdFromResponse(response, response)
    if (!id) return null
    return { taskId: id, resultType: 'video' }
  },
}
