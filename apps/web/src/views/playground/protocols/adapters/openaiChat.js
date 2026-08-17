import { buildChatRequest, extractChatEventText, extractChatResponseText } from '../../utils/chatProtocol.js'
import { hasTaskHeader } from '../adapter.js'

// OpenAI Chat Completions 兼容簇（覆盖各 provider 的 compatible-mode 变体）
export const openaiChat = {
  protocolKey: 'openai-chat',
  behavior: { type: 'chat', stream: true, async: false },

  buildRequest({ modelName, formData, inputTransform, endpoint }) {
    const data = inputTransform ? inputTransform(formData) : formData
    let body = { model: modelName, ...data }
    if (Array.isArray(body.messages) && typeof body.messages !== 'string') {
      const { messages, model: _model, ...params } = body
      body = buildChatRequest('openai-chat', modelName, messages, params)
    }
    return { body, contentType: 'json' }
  },

  parseStreamEvent(event) {
    return { text: extractChatEventText('openai-chat', event), imageParts: [], done: !!event?.done }
  },

  extractText(response) {
    return extractChatResponseText('openai-chat', response)
  },

  extractMedia(result) {
    return { urls: [], b64s: [], protectedReason: '' }
  },

  isAsyncResponse(response) {
    if (hasTaskHeader(response)) return true
    return false
  },
  parseTaskLink() { return null },
}
