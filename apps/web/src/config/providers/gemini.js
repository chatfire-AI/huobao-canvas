import { ep, model, messagesField, temperatureField, promptField, schema } from './_shared.js'

const provider = {
  id: 'gemini',
  label: 'Google Gemini',
  icon: 'gemini-color.png',
  docsUrl: 'https://ai.google.dev/gemini-api/docs',
  baseUrl: 'https://generativelanguage.googleapis.com',
  proxyPrefix: '/official/gemini',
  auth: { type: 'x-goog-api-key' },
  testPath: '/v1beta/models',
}

const P = provider.proxyPrefix

// gemini 适配器把扁平参数归入 generationConfig（temperature/topP/maxOutputTokens...）
const chatSchema = () => schema({
  protocolKey: 'gemini',
  input: [
    messagesField,
    temperatureField(),
    { key: 'maxOutputTokens', label: 'Max Output Tokens', type: 'number',
      min: 1, max: 65536, defaultValue: 8192, description: '最大输出 token 数' },
  ],
})

// 官方原生格式：contents[].parts[].text + generationConfig.responseModalities
// imageSizes 为空数组时不声明 imageSize 字段（仅 1K 的档位移除该键，避免下发空串）
// 参考图：images 字段经 inputTransform 注入为 {image: dataURL} 部件，由 gemini 适配器转 inlineData
const imageSchema = ({ prompt, aspectRatios, imageSizes = [] }) => schema({
  protocolKey: 'gemini',
  input: [
    promptField(prompt),
    { key: 'images', label: '参考图', type: 'images', max: 3, description: '图生图/参考生成（可上传或由上游节点传入）' },
    { key: 'aspectRatio', label: '宽高比', type: 'select', defaultValue: '1:1',
      options: aspectRatios },
    ...(imageSizes.length
      ? [{ key: 'imageSize', label: '分辨率', type: 'select', defaultValue: '1K',
          options: imageSizes, description: '输出分辨率，必须大写 K' }]
      : []),
  ],
  inputBindings: { sourceImages: 'images' },
  inputTransform: {
    contents: [{ parts: [
      { text: '$${prompt}' },
      { image: '$${images[0]}', '@conditional': 'images[0]' },
      { image: '$${images[1]}', '@conditional': 'images[1]' },
      { image: '$${images[2]}', '@conditional': 'images[2]' },
    ] }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: {
        aspectRatio: '$${aspectRatio}',
        ...(imageSizes.length ? { imageSize: '$${imageSize}' } : {}),
      },
    },
  },
  output: { displayType: 'image' },
})

// Gemini 3 系图像模型通用宽高比（10 种）
const ASPECTS_10 = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9']
// 3.1 系新增极宽/极高规格（共 14 种）
const ASPECTS_14 = [...ASPECTS_10, '1:4', '4:1', '1:8', '8:1']

provider.models = [
  model(provider, {
    name: 'gemini-3.7-flash',
    fullName: 'Gemini 3.7 Flash',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-08-14',
    endpoints: [ep(P, '/v1beta/models/{model}:generateContent', { capability: 'CHAT', protocolKey: 'gemini' })],
    modelSchema: chatSchema(),
  }),
  model(provider, {
    name: 'gemini-3.6-flash',
    fullName: 'Gemini 3.6 Flash',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-07-21',
    endpoints: [ep(P, '/v1beta/models/{model}:generateContent', { capability: 'CHAT', protocolKey: 'gemini' })],
    modelSchema: chatSchema(),
  }),
  model(provider, {
    name: 'gemini-3.5-flash',
    fullName: 'Gemini 3.5 Flash',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-05-19',
    endpoints: [ep(P, '/v1beta/models/{model}:generateContent', { capability: 'CHAT', protocolKey: 'gemini' })],
    modelSchema: chatSchema(),
  }),
  model(provider, {
    name: 'gemini-3.5-flash-lite',
    fullName: 'Gemini 3.5 Flash Lite',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-07-21',
    endpoints: [ep(P, '/v1beta/models/{model}:generateContent', { capability: 'CHAT', protocolKey: 'gemini' })],
    modelSchema: chatSchema(),
  }),
  model(provider, {
    name: 'gemini-3.1-pro-preview',
    fullName: 'Gemini 3.1 Pro Preview',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-02-19',
    endpoints: [ep(P, '/v1beta/models/{model}:generateContent', { capability: 'CHAT', protocolKey: 'gemini' })],
    modelSchema: chatSchema(),
  }),
  model(provider, {
    name: 'gemini-3.1-flash-lite',
    fullName: 'Gemini 3.1 Flash Lite',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2026-05-07',
    endpoints: [ep(P, '/v1beta/models/{model}:generateContent', { capability: 'CHAT', protocolKey: 'gemini' })],
    modelSchema: chatSchema(),
  }),
  model(provider, {
    name: 'gemini-3-flash-preview',
    fullName: 'Gemini 3 Flash Preview',
    type: '1', typeName: '对话', icon: provider.icon, launchTime: '2025-12-01',
    endpoints: [ep(P, '/v1beta/models/{model}:generateContent', { capability: 'CHAT', protocolKey: 'gemini' })],
    modelSchema: chatSchema(),
  }),
  model(provider, {
    name: 'gemini-3.1-flash-image',
    fullName: 'Gemini 3.1 Flash Image',
    type: '2', typeName: '图片', icon: provider.icon, launchTime: '2026-05-28',
    endpoints: [ep(P, '/v1beta/models/{model}:generateContent', { capability: 'IMAGE', protocolKey: 'gemini' })],
    modelSchema: imageSchema({
      prompt: 'A cute cat sitting on a windowsill',
      aspectRatios: ASPECTS_14,
      imageSizes: ['0.5K', '1K', '2K', '4K'],
    }),
  }),
  model(provider, {
    name: 'gemini-3-pro-image',
    fullName: 'Gemini 3 Pro Image',
    type: '2', typeName: '图片', icon: provider.icon, launchTime: '2025-11-01',
    endpoints: [ep(P, '/v1beta/models/{model}:generateContent', { capability: 'IMAGE', protocolKey: 'gemini' })],
    modelSchema: imageSchema({
      prompt: 'Da Vinci style anatomical sketch of a butterfly, studio quality',
      aspectRatios: ASPECTS_10,
      imageSizes: ['1K', '2K', '4K'],
    }),
  }),
  model(provider, {
    name: 'gemini-3.1-flash-lite-image',
    fullName: 'Gemini 3.1 Flash Lite Image',
    type: '2', typeName: '图片', icon: provider.icon, launchTime: '2026-06-01',
    endpoints: [ep(P, '/v1beta/models/{model}:generateContent', { capability: 'IMAGE', protocolKey: 'gemini' })],
    // 仅支持 1K，不下发 imageSize
    modelSchema: imageSchema({
      prompt: 'A clean app icon for a note-taking app, flat design',
      aspectRatios: ASPECTS_14,
    }),
  }),
  model(provider, {
    name: 'gemini-2.5-flash-image',
    fullName: 'Gemini 2.5 Flash Image',
    type: '2', typeName: '图片', icon: provider.icon, launchTime: '2025-10-01',
    endpoints: [ep(P, '/v1beta/models/{model}:generateContent', { capability: 'IMAGE', protocolKey: 'gemini' })],
    // 仅支持 1K，不下发 imageSize
    modelSchema: imageSchema({
      prompt: 'A cute cartoon banana chef cooking in a kitchen, studio lighting',
      aspectRatios: ASPECTS_10,
    }),
  }),
  model(provider, {
    name: 'veo-3.1',
    fullName: 'Veo 3.1',
    type: '3', typeName: '视频', icon: provider.icon, launchTime: '2025-10-20',
    endpoints: [ep(P, '/v1beta/models/{model}:predictLongRunning', {
      capability: 'VIDEO', responseMode: 'ASYNC', protocolKey: 'gemini',
      // 长任务轮询：taskId 即 operation 资源名（含斜杠），queryPath 原样拼接
      query: {
        path: `${P}/v1beta/{taskId}`,
        method: 'GET',
        taskIdPath: 'name',
        statusPath: 'done',
        completedValues: ['true'],
        failedPath: 'error',
      },
    })],
    modelSchema: schema({
      protocolKey: 'gemini',
      input: [
        promptField('A cat walking on the beach at sunset'),
        { key: 'aspectRatio', label: '宽高比', type: 'select', defaultValue: '16:9',
          options: ['16:9', '9:16'] },
        { key: 'durationSeconds', label: '时长(秒)', type: 'select', defaultValue: 8,
          options: [4, 6, 8] },
      ],
      inputTransform: {
        instances: [{ prompt: '$${prompt}' }],
        parameters: {
          aspectRatio: '$${aspectRatio}',
          durationSeconds: '$${durationSeconds}',
        },
      },
      output: { displayType: 'video' },
    }),
  }),
]

export default provider
