/**
 * Image API | 图片生成 API
 */

import { request } from '@/utils'

// 将 base64 或 URL 转换为 Blob
const imageDataToBlob = async (imageData) => {
  if (!imageData) return null
  
  // 如果是 Blob，直接返回
  if (imageData instanceof Blob) return imageData
  
  // 如果是 base64 字符串
  if (imageData.startsWith('data:') || imageData.startsWith('/9j/') || imageData.startsWith('iVBOR')) {
    // 移除 data:image/xxx;base64, 前缀
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '')
    const binaryData = atob(base64Data)
    const arrayBuffer = new ArrayBuffer(binaryData.length)
    const uint8Array = new Uint8Array(arrayBuffer)
    for (let i = 0; i < binaryData.length; i++) {
      uint8Array[i] = binaryData.charCodeAt(i)
    }
    return new Blob([arrayBuffer], { type: 'image/png' })
  }
  
  // 如果是 URL，fetch 成 blob
  if (imageData.startsWith('http')) {
    const response = await fetch(imageData)
    return await response.blob()
  }
  
  throw new Error('无效的圖片數據格式')
}

// 生成图片
export const generateImage = async (data, options = {}) => {
  const { requestType = 'json', endpoint = '/images/generations' } = options
  
  // 图生图时使用 FormData（multipart/form-data）
  if (requestType === 'formdata') {
    const formData = new FormData()
    
    // 处理参考图
    if (data.image) {
      try {
        const imageBlob = await imageDataToBlob(data.image)
        formData.append('image', imageBlob, 'reference.png')
      } catch (err) {
        console.error('Failed to convert image:', err)
        throw new Error('无法加载参考图片：' + err.message)
      }
    }
    
    // 添加其他字段
    formData.append('model', data.model || 'gpt-image-2')
    formData.append('prompt', data.prompt || '')
    formData.append('n', (data.n || 1).toString())
    formData.append('size', data.size || '1024x1024')
    
    return request({
      url: endpoint,
      method: 'post',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  }
  
  // 文生图使用 JSON
  return request({
    url: endpoint,
    method: 'post',
    data,
    headers: {}
  })
}