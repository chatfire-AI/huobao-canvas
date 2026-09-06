// 协议簇文档模板：定义每簇的展示结构与默认响应字段，模型 docs 数据可覆盖。
import { i18n } from '@/locales'

const t = (key, params) => i18n.global.t(`playground.docs.${key}`, params)

function buildDocsTemplates() {
  return {
    'openai-chat': {
      requestTableGroups: ['basic', 'generation', 'media', 'advanced'],
      defaultResponseStructure: [
        { path: 'choices[0].message.content', type: 'string', description: t('openaiChat.replyText') },
        { path: 'choices[0].message.reasoning_content', type: 'string', description: t('openaiChat.reasoning') },
        { path: 'usage.prompt_tokens', type: 'integer', description: t('openaiChat.promptTokens') },
        { path: 'usage.completion_tokens', type: 'integer', description: t('openaiChat.completionTokens') },
      ],
      codeTemplate: { authHeader: 'Authorization: Bearer <API_KEY>' },
      clusterNotes: [t('openaiChat.noteStructure'), t('openaiChat.notePassthrough')],
    },
    'openai-responses': {
      requestTableGroups: ['basic', 'generation', 'media', 'advanced'],
      defaultResponseStructure: [
        { path: 'output_text', type: 'string', description: t('openaiResponses.outputText') },
        { path: 'output[].type', type: 'string', description: t('openaiResponses.outputType') },
      ],
      codeTemplate: { authHeader: 'Authorization: Bearer <API_KEY>' },
      clusterNotes: [t('openaiResponses.noteInput')],
    },
    claude: {
      requestTableGroups: ['basic', 'generation', 'media', 'advanced'],
      defaultResponseStructure: [
        { path: 'content[].type', type: 'string', description: t('claude.blockType') },
        { path: 'content[].text', type: 'string', description: t('claude.blockText') },
        { path: 'stop_reason', type: 'string', description: t('claude.stopReason') },
        { path: 'usage.input_tokens', type: 'integer', description: t('claude.inputTokens') },
      ],
      codeTemplate: { authHeader: 'x-api-key: <API_KEY>', extraHeaders: { 'anthropic-version': '2023-06-01' } },
      clusterNotes: [t('claude.noteVersion'), t('claude.noteMaxTokens')],
    },
    'openai-image': {
      requestTableGroups: ['basic', 'generation', 'media', 'advanced'],
      defaultResponseStructure: [
        { path: 'data[].url', type: 'string', description: t('openaiImage.imageUrl') },
        { path: 'data[].b64_json', type: 'string', description: t('openaiImage.imageB64') },
        { path: 'created', type: 'integer', description: t('openaiImage.created') },
      ],
      codeTemplate: { authHeader: 'Authorization: Bearer <API_KEY>' },
      clusterNotes: [t('openaiImage.noteEdit'), t('openaiImage.noteImages')],
    },
    gemini: {
      requestTableGroups: ['basic', 'generation', 'media', 'advanced'],
      defaultResponseStructure: [
        { path: 'candidates[0].content.parts[].text', type: 'string', description: t('gemini.textPart') },
        { path: 'candidates[0].content.parts[].inlineData', type: 'object', description: t('gemini.imagePart') },
        { path: 'usageMetadata.promptTokenCount', type: 'integer', description: t('gemini.promptTokens') },
      ],
      codeTemplate: { authHeader: 'x-goog-api-key: <API_KEY>' },
      clusterNotes: [t('gemini.noteImage'), t('gemini.noteStream')],
    },
    dashscope: {
      requestTableGroups: ['basic', 'generation', 'media', 'advanced'],
      defaultResponseStructure: [
        { path: 'output.choices[0].message.content[0].image', type: 'string', description: t('dashscope.imageUrl') },
        { path: 'output.task_id', type: 'string', description: t('dashscope.videoTaskId') },
        { path: 'output.video_url', type: 'string', description: t('dashscope.videoUrl') },
      ],
      codeTemplate: { authHeader: 'Authorization: Bearer <API_KEY>', asyncHeaders: { 'X-DashScope-Async': 'enable' } },
      clusterNotes: [t('dashscope.noteAsync'), t('dashscope.noteFlow', { path: '/api/v1/tasks/{task_id}' })],
    },
    ark: {
      requestTableGroups: ['basic', 'generation', 'media', 'advanced'],
      defaultResponseStructure: [
        { path: 'data[].url', type: 'string', description: t('ark.imageUrl') },
        { path: 'data[].size', type: 'string', description: t('ark.imageSize') },
        { path: 'id', type: 'string', description: t('ark.videoTaskId') },
        { path: 'content.video_url', type: 'string', description: t('ark.videoUrl') },
      ],
      codeTemplate: { authHeader: 'Authorization: Bearer <API_KEY>' },
      clusterNotes: [t('ark.noteContent'), t('ark.noteStatus')],
    },
    'async-video': {
      requestTableGroups: ['basic', 'generation', 'media', 'advanced'],
      defaultResponseStructure: [
        { path: 'task_id / request_id / id', type: 'string', description: t('asyncVideo.taskId') },
        { path: 'creations[].url', type: 'string', description: t('asyncVideo.viduUrl') },
        { path: 'video.url', type: 'string', description: t('asyncVideo.xaiUrl') },
        { path: 'task.content.url', type: 'string', description: t('asyncVideo.minimaxUrl') },
      ],
      codeTemplate: { authHeader: 'Authorization: Bearer <API_KEY>', note: t('asyncVideo.authNote') },
      clusterNotes: [t('asyncVideo.noteFlow', { path: '/v1/tasks/{id}?view=normalized' }), t('asyncVideo.noteExpire')],
    },
  }
}

export const getDocsTemplate = (protocolKey) => {
  const templates = buildDocsTemplates()
  return templates[protocolKey] || templates['openai-chat']
}

export function buildDocsModel({ model, endpoint, schemaFields, protocolKey }) {
  const tpl = getDocsTemplate(protocolKey || 'openai-chat')
  const requestFields = Array.isArray(schemaFields) ? schemaFields : []
  const modelDocs = model?.modelSchema?.docs
  const responseStructure = modelDocs?.responseStructure?.length
    ? modelDocs.responseStructure
    : tpl.defaultResponseStructure
  return {
    summary: modelDocs?.summary || model?.name || '',
    requestFields,
    requestTableGroups: tpl.requestTableGroups,
    responseStructure,
    requestNotes: [...(modelDocs?.requestNotes || []), ...tpl.clusterNotes],
    codeTemplate: tpl.codeTemplate,
    requestExample: modelDocs?.requestExample || null,
  }
}
