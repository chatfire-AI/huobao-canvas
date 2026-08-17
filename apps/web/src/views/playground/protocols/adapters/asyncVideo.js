import { extractMediaResult, hasTaskHeader, readTaskIdFromResponse } from '../adapter.js'

export const asyncVideo = {
  protocolKey: 'async-video',
  behavior: { type: 'video', stream: false, async: true },
  buildRequest({ modelName, formData, inputTransform, endpoint }) {
    const data = inputTransform ? inputTransform(formData) : formData
    return { body: { model: modelName, ...data }, contentType: 'json' }
  },
  parseStreamEvent() { return { text: '', imageParts: [], done: true } },
  extractText() { return '' },
  extractMedia(result, outputSchema, getNestedValue) {
    return extractMediaResult(result, 'video', outputSchema, getNestedValue)
  },
  isAsyncResponse(response, endpoint) {
    if (hasTaskHeader(response)) return true
    const mode = String(endpoint?.responseMode || '').toUpperCase()
    return mode === 'ASYNC' || /video|text2video|video_generation/.test(endpoint?.path || '')
  },
  parseTaskLink(response, endpoint) {
    const id = readTaskIdFromResponse(response, response)
    if (!id) return null
    return { taskId: id, resultType: 'video' }
  },
}
