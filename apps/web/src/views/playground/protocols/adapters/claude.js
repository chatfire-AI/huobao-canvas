import { buildChatRequest, extractChatEventText, extractChatResponseText } from '../../utils/chatProtocol.js'
import { hasTaskHeader } from '../adapter.js'

export const claude = {
  protocolKey: 'claude',
  behavior: { type: 'chat', stream: true, async: false },
  buildRequest({ modelName, formData, inputTransform, endpoint }) {
    const data = inputTransform ? inputTransform(formData) : formData
    let body = { model: modelName, ...data }
    if (Array.isArray(body.messages)) {
      const { messages, model: _model, ...params } = body
      body = buildChatRequest('claude', modelName, messages, params)
      if (!body.max_tokens) body.max_tokens = 4096
    }
    return { body, contentType: 'json' }
  },
  parseStreamEvent(event) {
    return { text: extractChatEventText('claude', event), imageParts: [], done: !!event?.done }
  },
  extractText(response) { return extractChatResponseText('claude', response) },
  extractMedia() { return { urls: [], b64s: [], protectedReason: '' } },
  isAsyncResponse(response) {
    if (hasTaskHeader(response)) return true
    return false
  },
  parseTaskLink() { return null },
}
