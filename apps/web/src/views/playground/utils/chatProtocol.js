export function buildChatRequest(protocol, model, messages, params = {}) {
  const options = { ...params }
  delete options.messages

  if (protocol === 'openai-responses') {
    const maxOutputTokens = options.max_output_tokens ?? options.max_tokens
    delete options.max_tokens
    // 演武场 schema 的扁平 reasoning_effort → Responses API 的 reasoning.effort
    const reasoningEffort = options.reasoning_effort
    delete options.reasoning_effort
    return {
      model,
      ...options,
      ...(maxOutputTokens ? { max_output_tokens: maxOutputTokens } : {}),
      ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {}),
      input: messages.map(toResponsesMessage),
    }
  }

  if (protocol === 'claude') {
    const system = messages
      .filter((message) => message.role === 'system')
      .map((message) => textContent(message.content))
      .filter(Boolean)
      .join('\n')
    // 演武场 schema 的扁平参数 → Anthropic Messages API 结构
    // （后端原生直通，无转换层；字段名依据 docs/models/claude/*.md §3）
    const mapped = {}
    const thinkingType = options.thinking
    const thinkingBudget = Number(options.thinking_budget) || 0
    delete options.thinking
    delete options.thinking_budget
    // OpenAI 系 schema 的字段在 Anthropic 端点无对应语义：max_completion_tokens
    // 映射为 max_tokens（MiniMax M2/M3 走 Claude 端点时值不丢失、不泄漏未知字段）；
    // reasoning_effort 直接丢弃（DeepSeek/MiniMax M3 泄漏会被严格校验 400）
    const maxTokens = Number(options.max_tokens ?? options.max_completion_tokens) || 4096
    delete options.max_completion_tokens
    delete options.reasoning_effort
    if (thinkingType === 'adaptive' || thinkingType === 'disabled') {
      mapped.thinking = { type: thinkingType }
    } else if (thinkingType === true && thinkingBudget > 0) {
      // schema 表单 thinking 为布尔开关，仅开启时发送；官方要求 budget_tokens < max_tokens
      const budget = Math.min(thinkingBudget, Math.max(maxTokens - 1, 1024))
      mapped.thinking = { type: 'enabled', budget_tokens: budget }
    }
    // 扩展思考与采样参数互斥（官方要求 temperature 保持默认 1），开启时剥离避免 400
    if (mapped.thinking?.type === 'enabled') {
      delete options.temperature
      delete options.top_p
      delete options.top_k
    }
    if (options.output_effort) {
      mapped.output_config = { effort: options.output_effort }
    }
    delete options.output_effort
    return {
      model,
      ...options,
      ...mapped,
      max_tokens: maxTokens,
      ...(system ? { system } : {}),
      messages: messages
        .filter((message) => message.role !== 'system')
        .map((message) => ({ role: message.role, content: toClaudeContent(message.content) })),
    }
  }

  if (protocol === 'gemini') {
    const systemText = messages
      .filter((message) => message.role === 'system')
      .map((message) => textContent(message.content))
      .filter(Boolean)
      .join('\n')
    const generationConfig = {
      temperature: options.temperature,
      topP: options.top_p,
      topK: options.top_k,
      maxOutputTokens: options.maxOutputTokens ?? options.max_output_tokens ?? options.max_tokens,
      stopSequences: typeof options.stop === 'string' ? [options.stop] : options.stop,
      responseMimeType: options.response_mime_type,
      responseModalities: options.response_modalities ?? options.responseModalities,
    }
    return {
      contents: messages
        .filter((message) => message.role !== 'system')
        .map((message) => ({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: toGeminiParts(message.content),
        })),
      ...(systemText ? { systemInstruction: { parts: [{ text: systemText }] } } : {}),
      ...(compact(generationConfig) ? { generationConfig: compact(generationConfig) } : {}),
      ...(options.tools ? { tools: options.tools } : {}),
      ...(options.safetySettings ? { safetySettings: options.safetySettings } : {}),
    }
  }

  return { model, ...options, messages }
}

export function parseSSELine(line) {
  if (!line.startsWith('data:')) return null
  const raw = line.slice(5).trim()
  if (!raw) return null
  if (raw === '[DONE]') return { done: true }
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function extractChatEventText(protocol, event) {
  if (!event || event.done) return ''
  if (protocol === 'openai-responses') {
    return event.type === 'response.output_text.delta' ? event.delta || '' : ''
  }
  if (protocol === 'claude') {
    return event.type === 'content_block_delta' ? event.delta?.text || '' : ''
  }
  if (protocol === 'gemini') {
    return event.candidates?.flatMap((candidate) => candidate.content?.parts || [])
      .map((part) => part.text || '')
      .join('') || ''
  }
  return event.choices?.[0]?.delta?.content || ''
}

export function extractChatResponseText(protocol, response) {
  if (protocol === 'openai-responses') {
    return response.output_text
      || response.output?.flatMap((item) => item.content || []).map((part) => part.text || '').join('')
      || ''
  }
  if (protocol === 'claude') {
    return response.content?.map((part) => part.text || '').join('') || ''
  }
  if (protocol === 'gemini') {
    return response.candidates?.flatMap((candidate) => candidate.content?.parts || [])
      .map((part) => part.text || '')
      .join('') || ''
  }
  // OpenAI 兼容：content 可能是字符串或多模态 parts 数组
  const content = response.choices?.[0]?.message?.content
  if (typeof content === 'string') return content
  if (Array.isArray(content)) return content.map((part) => part?.text || '').join('')
  return ''
}

function toResponsesMessage(message) {
  if (!Array.isArray(message.content)) return message
  return {
    role: message.role,
    content: message.content.map((part) => {
      if (part.type === 'image_url') {
        return { type: 'input_image', image_url: part.image_url?.url }
      }
      if (part.type === 'file_url') {
        return { type: 'input_file', file_url: part.file_url?.url }
      }
      return { type: 'input_text', text: part.text || '' }
    }),
  }
}

function toClaudeContent(content) {
  if (!Array.isArray(content)) return content
  return content.map((part) => {
    if (part.type !== 'image_url') return { type: 'text', text: part.text || '' }
    const url = part.image_url?.url || ''
    const dataUrl = url.match(/^data:([^;]+);base64,(.+)$/)
    return {
      type: 'image',
      source: dataUrl
        ? { type: 'base64', media_type: dataUrl[1], data: dataUrl[2] }
        : { type: 'url', url },
    }
  })
}

function toGeminiParts(content) {
  if (!Array.isArray(content)) return [{ text: String(content || '') }]
  return content.map((part) => {
    if (part.type !== 'image_url') return { text: part.text || '' }
    const url = part.image_url?.url || ''
    const dataUrl = url.match(/^data:([^;]+);base64,(.+)$/)
    return dataUrl
      ? { inlineData: { mimeType: dataUrl[1], data: dataUrl[2] } }
      : { fileData: { fileUri: url } }
  })
}

function textContent(content) {
  if (typeof content === 'string') return content
  return Array.isArray(content)
    ? content.filter((part) => part.type === 'text').map((part) => part.text || '').join('')
    : ''
}

function compact(value) {
  const entries = Object.entries(value).filter(([, item]) =>
    item !== undefined && item !== null && item !== '' && (!Array.isArray(item) || item.length > 0))
  return entries.length ? Object.fromEntries(entries) : null
}
