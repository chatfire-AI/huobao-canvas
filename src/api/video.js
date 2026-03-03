/**
 * Video API | 视频生成 API
 */

import { request } from '@/utils'

// 创建视频任务
export const createVideoTask = (data, options = {}) => {
  const { endpoint = '/videos', requestType = 'json' } = options
  return request({
    url: endpoint,
    method: 'post',
    data,
    headers: requestType === 'formdata'
      ? { 'Content-Type': 'multipart/form-data' }
      : { 'Content-Type': 'application/json' }
  })
}

// 查询视频任务状态
export const getVideoTaskStatus = (taskId, options = {}) => {
  const { endpoint = '/videos' } = options
  return request({
    url: `${endpoint}/${taskId}`,
    method: 'get'
  })
}
// 轮询视频任务直到完成
export const pollVideoTask = async (taskId, maxAttempts = 120, interval = 5000) => {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await getVideoTaskStatus(taskId)

    if (result.status === 'completed' || result.data) {
      return result
    }

    if (result.status === 'failed') {
      throw new Error(result.error?.message || '视频生成失败')
    }

    await new Promise(resolve => setTimeout(resolve, interval))
  }

  throw new Error('视频生成超时')
}
