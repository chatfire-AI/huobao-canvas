import { openaiChat } from './adapters/openaiChat.js'
import { openaiResponses } from './adapters/openaiResponses.js'
import { claude } from './adapters/claude.js'
import { openaiImage } from './adapters/openaiImage.js'
import { gemini } from './adapters/gemini.js'
import { dashscope } from './adapters/dashscope.js'
import { ark } from './adapters/ark.js'
import { asyncVideo } from './adapters/asyncVideo.js'

export const protocolRegistry = {
  'openai-chat': openaiChat,
  'openai-responses': openaiResponses,
  claude,
  'openai-image': openaiImage,
  gemini,
  dashscope,
  ark,
  'async-video': asyncVideo,
}

export const getAdapter = (key) => protocolRegistry[key] || openaiChat

// 路径 → 协议簇推断（替代原 getChatProtocol 的三协议正则，扩展到 8 簇）。
// 顺序：厂商前缀优先（/qwen /volcengine /vidu /minimax /v1beta），再按路径特征。
// /official/{id}/ 前缀（厂商官方直连反代）：剥离后按厂商路径特征再推断——
// 预设端点均显式声明 protocolKey，此处仅兜底。
export function inferProtocolKey(path = '', capability = '') {
  const p = path || ''
  const officialMatch = p.match(/^\/official\/[^/]+(\/.*)$/)
  if (officialMatch) {
    const vendorPath = officialMatch[1]
    if (/\/v1beta\/models\//.test(vendorPath)) return 'gemini'
    if (/\/api\/v1\/(services|tasks)/.test(vendorPath)) return 'dashscope'
    if (/contents\/generations\/tasks/.test(vendorPath)) return 'ark'
    if (/\/ent\/v2\//.test(vendorPath)) return 'async-video'
    if (/video_generation|\/videos/.test(vendorPath)) return 'async-video'
    if (/\/v1\/responses(?:$|[/?])/.test(vendorPath)) return 'openai-responses'
    if (/\/v1\/messages(?:$|[/?])/.test(vendorPath)) return 'claude'
    if (/\/images\/(?:generations|edits|wan-edits)/.test(vendorPath)) return 'openai-image'
    return 'openai-chat'
  }
  if (/\/v1beta\/models\//.test(p)) return 'gemini'
  if (/\/qwen\//.test(p)) return 'dashscope'
  if (/\/volcengine\//.test(p)) return 'ark'
  if (/\/vidu\//.test(p)) return 'async-video'
  if (/\/minimax\//.test(p)) return 'async-video'
  if (/\/v1\/responses(?:$|[/?])/.test(p)) return 'openai-responses'
  if (/\/v1\/messages(?:$|[/?])/.test(p)) return 'claude'
  if (/\/videos(?:$|[/?])/.test(p)) return 'async-video'
  if (/\/images\/(?:generations|edits|wan-edits)/.test(p)) return 'openai-image'
  return 'openai-chat'
}
