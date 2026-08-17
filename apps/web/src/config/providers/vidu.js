import { ep, model, promptField, schema } from './_shared.js'

const provider = {
  id: 'vidu',
  label: 'Vidu',
  icon: '',
  docsUrl: 'https://platform.vidu.com/docs',
  baseUrl: 'https://api.vidu.cn',
  proxyPrefix: '/official/vidu',
  // Vidu 官方鉴权例外：Authorization: Token <key>（非 Bearer）
  auth: { type: 'token' },
  testPath: '',
}

const P = provider.proxyPrefix

const viduQuery = {
  path: `${P}/ent/v2/tasks/{taskId}/creations`,
  method: 'GET',
  taskIdPath: 'task_id',
  statusPath: 'state',
  completedValues: ['success'],
  failedValues: ['failed'],
}

const viduVideoInput = (withImages) => [
  promptField('一只猫在夕阳下的沙滩上行走'),
  ...(withImages ? [{ key: 'images', label: '参考图', type: 'images', max: 3, required: true }] : []),
  { key: 'duration', label: '时长(秒)', type: 'number', min: 1, max: 16, defaultValue: 5 },
  { key: 'aspect_ratio', label: '宽高比', type: 'select', defaultValue: '16:9',
    options: ['16:9', '9:16', '1:1'] },
]

// 文生视频字段（q3 系列：resolution 540p/720p/1080p，aspect_ratio 含 3:4/4:3）
const q3Text2VideoInput = () => [
  promptField('一条龙飞过云雾缭绕的群山，细雨飘落'),
  { key: 'duration', label: '时长(秒)', type: 'number', min: 1, max: 16, defaultValue: 5 },
  { key: 'resolution', label: '分辨率', type: 'select', defaultValue: '720p',
    options: ['540p', '720p', '1080p'] },
  { key: 'aspect_ratio', label: '宽高比', type: 'select', defaultValue: '16:9',
    options: ['16:9', '9:16', '3:4', '4:3', '1:1'] },
]

// 参考生视频字段（q3 系列参考图 1–7 张；宽高比仅 16:9/9:16/1:1）
const q3ReferenceVideoInput = ({ durationMin = 3, resolutions = ['540p', '720p', '1080p'] } = {}) => [
  promptField(),
  { key: 'images', label: '参考图', type: 'images', min: 1, max: 7, required: true },
  { key: 'duration', label: '时长(秒)', type: 'number', min: durationMin, max: 16, defaultValue: 5 },
  { key: 'resolution', label: '分辨率', type: 'select', defaultValue: '720p', options: resolutions },
  { key: 'aspect_ratio', label: '宽高比', type: 'select', defaultValue: '16:9',
    options: ['16:9', '9:16', '1:1'] },
]

provider.models = [
  model(provider, {
    // 官方模型名（主仓 vidu-q3-* 是库内别名，直连必须用官方名）
    name: 'viduq3-pro',
    fullName: 'Vidu Q3 Pro',
    type: '3', typeName: '视频', icon: provider.icon, launchTime: '2025-12-01',
    endpoints: [
      ep(P, '/ent/v2/text2video', {
        capability: 'VIDEO', responseMode: 'ASYNC', protocolKey: 'async-video',
        canvasModeLabel: '文生视频', query: viduQuery,
      }),
      ep(P, '/ent/v2/img2video', {
        capability: 'VIDEO', responseMode: 'ASYNC', protocolKey: 'async-video',
        canvasModeLabel: '图生视频', query: viduQuery,
      }),
      ep(P, '/ent/v2/reference2video', {
        capability: 'VIDEO', responseMode: 'ASYNC', protocolKey: 'async-video',
        canvasModeLabel: '参考生视频', query: viduQuery,
      }),
      ep(P, '/ent/v2/start-end2video', {
        capability: 'VIDEO', responseMode: 'ASYNC', protocolKey: 'async-video',
        canvasModeLabel: '首尾帧视频', query: viduQuery,
      }),
    ],
    modelSchema: schema({
      protocolKey: 'async-video',
      input: viduVideoInput(false),
      output: { displayType: 'video' },
      endpointSchemas: {
        [`${P}/ent/v2/img2video`]: schema({
          input: [
            promptField(),
            { key: 'image', label: '首帧图', type: 'image', required: true },
            { key: 'duration', label: '时长(秒)', type: 'number', min: 1, max: 16, defaultValue: 5 },
            { key: 'aspect_ratio', label: '宽高比', type: 'select', defaultValue: '16:9',
              options: ['16:9', '9:16', '1:1'] },
          ],
          inputBindings: { sourceImage: 'image' },
          videoModes: ['first'],
        }),
        [`${P}/ent/v2/reference2video`]: schema({
          input: viduVideoInput(true),
          inputBindings: { sourceImages: 'images' },
          videoModes: ['reference'],
        }),
        [`${P}/ent/v2/start-end2video`]: schema({
          input: [
            promptField(),
            { key: 'image', label: '首帧图', type: 'image', required: true },
            { key: 'last_image', label: '尾帧图', type: 'image', required: true },
            { key: 'duration', label: '时长(秒)', type: 'number', min: 1, max: 16, defaultValue: 5 },
          ],
          inputBindings: { sourceImage: 'image', lastFrameImage: 'last_image' },
          videoModes: ['firstlast'],
        }),
      },
    }),
  }),
  model(provider, {
    // 官方模型名（主仓 vidu-q3-turbo 是库内别名，直连必须用官方名）
    name: 'viduq3-turbo',
    fullName: 'Vidu Q3 Turbo',
    type: '3', typeName: '视频', icon: provider.icon, launchTime: '2026-02-11',
    endpoints: [
      ep(P, '/ent/v2/text2video', {
        capability: 'VIDEO', responseMode: 'ASYNC', protocolKey: 'async-video',
        canvasModeLabel: '文生视频', query: viduQuery,
      }),
      ep(P, '/ent/v2/img2video', {
        capability: 'VIDEO', responseMode: 'ASYNC', protocolKey: 'async-video',
        canvasModeLabel: '图生视频', query: viduQuery,
      }),
      ep(P, '/ent/v2/reference2video', {
        capability: 'VIDEO', responseMode: 'ASYNC', protocolKey: 'async-video',
        canvasModeLabel: '参考生视频', query: viduQuery,
      }),
      ep(P, '/ent/v2/start-end2video', {
        capability: 'VIDEO', responseMode: 'ASYNC', protocolKey: 'async-video',
        canvasModeLabel: '首尾帧视频', query: viduQuery,
      }),
    ],
    modelSchema: schema({
      protocolKey: 'async-video',
      input: q3Text2VideoInput(),
      output: { displayType: 'video' },
      endpointSchemas: {
        [`${P}/ent/v2/img2video`]: schema({
          input: [
            promptField(),
            { key: 'image', label: '首帧图', type: 'image', required: true },
            { key: 'duration', label: '时长(秒)', type: 'number', min: 1, max: 16, defaultValue: 5 },
            { key: 'resolution', label: '分辨率', type: 'select', defaultValue: '720p',
              options: ['540p', '720p', '1080p'] },
            { key: 'aspect_ratio', label: '宽高比', type: 'select', defaultValue: '16:9',
              options: ['16:9', '9:16', '3:4', '4:3', '1:1'] },
          ],
          inputBindings: { sourceImage: 'image' },
          videoModes: ['first'],
        }),
        [`${P}/ent/v2/reference2video`]: schema({
          input: q3ReferenceVideoInput(),
          inputBindings: { sourceImages: 'images' },
          videoModes: ['reference'],
        }),
        [`${P}/ent/v2/start-end2video`]: schema({
          input: [
            promptField(),
            { key: 'image', label: '首帧图', type: 'image', required: true },
            { key: 'last_image', label: '尾帧图', type: 'image', required: true },
            { key: 'duration', label: '时长(秒)', type: 'number', min: 1, max: 16, defaultValue: 5 },
            { key: 'resolution', label: '分辨率', type: 'select', defaultValue: '720p',
              options: ['540p', '720p', '1080p'] },
          ],
          inputBindings: { sourceImage: 'image', lastFrameImage: 'last_image' },
          videoModes: ['firstlast'],
        }),
      },
    }),
  }),
  model(provider, {
    // 官方模型名（主仓 vidu-q3-mix 是库内别名，直连必须用官方名）
    // 官方唯一明确支持 reference2video；不支持 subjects 实体模式
    name: 'viduq3-mix',
    fullName: 'Vidu Q3 Mix',
    type: '3', typeName: '视频', icon: provider.icon, launchTime: '2026-04-13',
    endpoints: [
      ep(P, '/ent/v2/reference2video', {
        capability: 'VIDEO', responseMode: 'ASYNC', protocolKey: 'async-video',
        canvasModeLabel: '参考生视频', query: viduQuery,
      }),
    ],
    modelSchema: schema({
      protocolKey: 'async-video',
      // 顶层 input 即其唯一端点 reference2video 的默认字段
      // duration 1–16（pricing 页记为 3–16）；分辨率仅 720p/1080p，无 540p
      input: q3ReferenceVideoInput({ durationMin: 1, resolutions: ['720p', '1080p'] }),
      output: { displayType: 'video' },
      endpointSchemas: {
        [`${P}/ent/v2/reference2video`]: schema({
          input: q3ReferenceVideoInput({ durationMin: 1, resolutions: ['720p', '1080p'] }),
          inputBindings: { sourceImages: 'images' },
          videoModes: ['reference'],
        }),
      },
    }),
  }),
]

export default provider
