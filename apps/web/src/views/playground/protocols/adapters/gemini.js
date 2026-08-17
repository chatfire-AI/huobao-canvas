import { buildChatRequest, extractChatEventText, extractChatResponseText } from '../../utils/chatProtocol.js'
import { extractInlineDataImages, extractMediaResult, hasTaskHeader } from '../adapter.js'

const DATA_URL_RE = /^data:([^;]+);base64,([A-Za-z0-9+/=\r\n]+)$/

/**
 * 把 body 里 contents[].parts[] 的 {image: dataURL} 部件转换为官方 inlineData。
 * 图像模型的 inputTransform 用 '$${image}'/'$${images[N]}' 注入参考图（dataURL 字符串），
 * Gemini 官方要求 parts[].inlineData = { mimeType, data(纯 base64) }。
 * 非 dataURL（http URL / File）原样保留，由上游自行保证可访问。
 */
const convertImagePartsToInlineData = (body) => {
  if (!body || !Array.isArray(body.contents)) return body
  const contents = body.contents.map((content) => {
    if (!content || !Array.isArray(content.parts)) return content
    const parts = content.parts.map((part) => {
      if (part && typeof part === 'object' && typeof part.image === 'string') {
        const match = part.image.match(DATA_URL_RE)
        if (match) {
          const { image: _drop, ...rest } = part
          return { ...rest, inlineData: { mimeType: match[1], data: match[2].replace(/\s/g, '') } }
        }
      }
      return part
    })
    return { ...content, parts }
  })
  return { ...body, contents }
}

export const gemini = {
  protocolKey: 'gemini',
  behavior: { type: 'chat', stream: true, async: false },
  buildRequest({ modelName, formData, inputTransform, endpoint }) {
    const data = inputTransform ? inputTransform(formData) : formData
    // model 由 URL {model} 占位符承载，body 里不能带（Gemini 官方会 400 Unknown name "model"）
    const { model: _stripped, ...rest } = { model: modelName, ...data }
    let body = rest
    if (Array.isArray(body.messages)) {
      const { messages, ...params } = body
      body = buildChatRequest('gemini', modelName, messages, params)
    }
    return { body: convertImagePartsToInlineData(body), contentType: 'json' }
  },
  parseStreamEvent(event) {
    return { text: extractChatEventText('gemini', event), imageParts: [], done: !!event?.done }
  },
  extractText(response) { return extractChatResponseText('gemini', response) },
  extractMedia(result, outputSchema, getNestedValue) {
    if (outputSchema?.displayType === 'image') {
      const inline = extractInlineDataImages(result)
      if (inline.length > 0) return { parsedResults: inline, unavailableReason: '' }
    }
    return extractMediaResult(result, 'image', outputSchema, getNestedValue)
  },
  isAsyncResponse(response, endpoint) {
    if (hasTaskHeader(response)) return true
    // Veo 等 :predictLongRunning 端点无任务头兜底时按配置/路径判定
    if (String(endpoint?.responseMode || '').toUpperCase() === 'ASYNC') return true
    return /predictLongRunning/.test(String(endpoint?.path || ''))
  },
  parseTaskLink() { return null },
}
