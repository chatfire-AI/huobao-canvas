// 协议簇文档模板：定义每簇的展示结构与默认响应字段，模型 docs 数据可覆盖。
export const docsTemplates = {
  'openai-chat': {
    requestTableGroups: ['basic', 'generation', 'media', 'advanced'],
    defaultResponseStructure: [
      { path: 'choices[0].message.content', type: 'string', description: '回复文本' },
      { path: 'choices[0].message.reasoning_content', type: 'string', description: '思考链（若有）' },
      { path: 'usage.prompt_tokens', type: 'integer', description: '输入 token 数' },
      { path: 'usage.completion_tokens', type: 'integer', description: '输出 token 数' },
    ],
    codeTemplate: { authHeader: 'Authorization: Bearer <API_KEY>' },
    clusterNotes: ['请求体为 OpenAI chat.completion 结构', '厂商扩展字段（enable_thinking 等）作为可选参数透传'],
  },
  'openai-responses': {
    requestTableGroups: ['basic', 'generation', 'media', 'advanced'],
    defaultResponseStructure: [
      { path: 'output_text', type: 'string', description: '最终文本' },
      { path: 'output[].type', type: 'string', description: '输出项类型（reasoning/message/function_call）' },
    ],
    codeTemplate: { authHeader: 'Authorization: Bearer <API_KEY>' },
    clusterNotes: ['input 为输入项数组（input_text/input_image/input_file）'],
  },
  claude: {
    requestTableGroups: ['basic', 'generation', 'media', 'advanced'],
    defaultResponseStructure: [
      { path: 'content[].type', type: 'string', description: 'block 类型（text/tool_use/thinking）' },
      { path: 'content[].text', type: 'string', description: '文本块内容' },
      { path: 'stop_reason', type: 'string', description: '结束原因' },
      { path: 'usage.input_tokens', type: 'integer', description: '输入 token 数' },
    ],
    codeTemplate: { authHeader: 'x-api-key: <API_KEY>', extraHeaders: { 'anthropic-version': '2023-06-01' } },
    clusterNotes: ['需 anthropic-version: 2023-06-01 头', 'max_tokens 必填'],
  },
  'openai-image': {
    requestTableGroups: ['basic', 'generation', 'media', 'advanced'],
    defaultResponseStructure: [
      { path: 'data[].url', type: 'string', description: '图片 URL（临时，24h）' },
      { path: 'data[].b64_json', type: 'string', description: '图片 Base64（response_format=b64_json）' },
      { path: 'created', type: 'integer', description: '创建时间戳' },
    ],
    codeTemplate: { authHeader: 'Authorization: Bearer <API_KEY>' },
    clusterNotes: ['编辑端点走 multipart FormData（image + mask）', '参考图数组 image[]'],
  },
  gemini: {
    requestTableGroups: ['basic', 'generation', 'media', 'advanced'],
    defaultResponseStructure: [
      { path: 'candidates[0].content.parts[].text', type: 'string', description: '文本 part' },
      { path: 'candidates[0].content.parts[].inlineData', type: 'object', description: '图像 part（base64）' },
      { path: 'usageMetadata.promptTokenCount', type: 'integer', description: '输入 token 数' },
    ],
    codeTemplate: { authHeader: 'x-goog-api-key: <API_KEY>' },
    clusterNotes: ['图像走 responseModalities:["IMAGE"] + imageConfig', '流式走 :streamGenerateContent 或 ?alt=sse'],
  },
  dashscope: {
    requestTableGroups: ['basic', 'generation', 'media', 'advanced'],
    defaultResponseStructure: [
      { path: 'output.choices[0].message.content[0].image', type: 'string', description: '图像 URL（24h）' },
      { path: 'output.task_id', type: 'string', description: '视频任务 ID' },
      { path: 'output.video_url', type: 'string', description: '成片 URL（24h，查询返回）' },
    ],
    codeTemplate: { authHeader: 'Authorization: Bearer <API_KEY>', asyncHeaders: { 'X-DashScope-Async': 'enable' } },
    clusterNotes: ['视频创建需 X-DashScope-Async: enable 头', '异步两步：创建 → GET /api/v1/tasks/{task_id} 轮询'],
  },
  ark: {
    requestTableGroups: ['basic', 'generation', 'media', 'advanced'],
    defaultResponseStructure: [
      { path: 'data[].url', type: 'string', description: '图像 URL（24h）' },
      { path: 'data[].size', type: 'string', description: '图像尺寸' },
      { path: 'id', type: 'string', description: '视频任务 ID' },
      { path: 'content.video_url', type: 'string', description: '成片 URL（24h，查询返回）' },
    ],
    codeTemplate: { authHeader: 'Authorization: Bearer <API_KEY>' },
    clusterNotes: ['视频 content[] 多模态数组（text/image_url/video_url/audio_url）', '任务状态含 expired'],
  },
  'async-video': {
    requestTableGroups: ['basic', 'generation', 'media', 'advanced'],
    defaultResponseStructure: [
      { path: 'task_id / request_id / id', type: 'string', description: '任务 ID（提交返回）' },
      { path: 'creations[].url', type: 'string', description: '成片 URL（Vidu，24h）' },
      { path: 'video.url', type: 'string', description: '成片 URL（xAI）' },
      { path: 'task.content.url', type: 'string', description: '成片 URL（MiniMax）' },
    ],
    codeTemplate: { authHeader: 'Authorization: Bearer <API_KEY>', note: 'Vidu 用 Authorization: Token <API_KEY>' },
    clusterNotes: ['异步两步：提交 → 轮询网关 /v1/tasks/{id}?view=normalized', '产物 URL 24h 过期'],
  },
}

export const getDocsTemplate = (protocolKey) => docsTemplates[protocolKey] || docsTemplates['openai-chat']

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
