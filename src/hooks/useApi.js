/**
 * API Hooks | API Hooks
 * Simplified hooks for open source version | 开源版简化 hooks
 */

import { ref, reactive, onUnmounted } from 'vue'
import {
  generateImage,
  createVideoTask,
  getVideoTaskStatus,
  streamChatCompletions
} from '@/api'
import { getModelByName } from '@/config/models'
import { useApiConfig } from './useApiConfig'
import { useProvider } from './useProvider'
import { useModelStore } from '@/stores/pinia'

/**
 * Base API state hook | 基础 API 状态 Hook
 */
export const useApiState = () => {
  const loading = ref(false)
  const error = ref(null)
  const status = ref('idle')

  const reset = () => {
    loading.value = false
    error.value = null
    status.value = 'idle'
  }

  const setLoading = (isLoading) => {
    loading.value = isLoading
    status.value = isLoading ? 'running' : status.value
  }

  const setError = (err) => {
    error.value = err
    status.value = 'error'
    loading.value = false
  }

  const setSuccess = () => {
    status.value = 'success'
    loading.value = false
    error.value = null
  }

  return { loading, error, status, reset, setLoading, setError, setSuccess }
}

/**
 * Chat composable | 问答组合式函数
 */
export const useChat = (options = {}) => {
  const { loading, error, status, reset, setLoading, setError, setSuccess } = useApiState()
  const { adaptRequest, adaptResponse } = useProvider()

  const messages = ref([])
  const currentResponse = ref('')
  let abortController = null

  const send = async (content, stream = true) => {
    setLoading(true)
    currentResponse.value = ''

    try {
      const msgList = [
        ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
        ...messages.value,
        { role: 'user', content }
      ]

      // 适配请求参数
      const adaptedParams = adaptRequest('chat', {
        model: options.model || 'gpt-4o-mini',
        messages: msgList
      })

      if (stream) {
        status.value = 'streaming'
        abortController = new AbortController()
        let fullResponse = ''

        for await (const chunk of streamChatCompletions(
          adaptedParams,
          abortController.signal
        )) {
          fullResponse += chunk
          currentResponse.value = fullResponse
        }

        messages.value.push({ role: 'user', content })
        messages.value.push({ role: 'assistant', content: fullResponse })
        setSuccess()
        return fullResponse
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err)
        throw err
      }
    }
  }

  const stop = () => {
    if (abortController) {
      abortController.abort()
      abortController = null
    }
  }

  const clear = () => {
    messages.value = []
    currentResponse.value = ''
    reset()
  }

  onUnmounted(() => stop())

  return { loading, error, status, messages, currentResponse, send, stop, clear, reset }
}

/**
 * Image generation composable | 图片生成组合式函数
 * Simplified for open source - fixed input/output format
 */
export const useImageGeneration = () => {
  const { loading, error, status, reset, setLoading, setError, setSuccess } = useApiState()
  const { adaptRequest, adaptResponse } = useProvider()
  const modelStore = useModelStore()

  const images = ref([])
  const currentImage = ref(null)

  /**
   * Generate image with fixed params | 固定参数生成图片
   * @param {Object} params - { model, prompt, size, n, image (optional ref image) }
   */
  const generate = async (params) => {
    setLoading(true)
    images.value = []
    currentImage.value = null

    try {
      const modelConfig = getModelByName(params.model)

      // Build request data | 构建请求数据
      const requestData = {
        model: params.model,
        prompt: params.prompt,
        size: params.size || modelConfig?.defaultParams?.size || '2048x2048',
        // n: params.n || 1
      }

      // Add reference image if provided | 添加参考图
      if (params.image) {
        requestData.image = params.image
      }

      // 适配请求参数
      const adaptedParams = adaptRequest('image', requestData)

      // Call API | 调用 API
      const response = await generateImage(adaptedParams, {
        requestType: 'json',
        endpoint: modelStore.getImageEndpoint()
      })

      // 适配响应数据
      const adaptedData = adaptResponse('image', response)

      images.value = adaptedData
      currentImage.value = adaptedData[0] || null
      setSuccess()
      return adaptedData
    } catch (err) {
      setError(err)
      throw err
    }
  }

  return { loading, error, status, images, currentImage, generate, reset }
}

/**
 * Video generation composable | 视频生成组合式函数
 * Simplified for open source - fixed input/output format
 */

export const useVideoGeneration = () => {
  const { loading, error, status, reset, setLoading, setError, setSuccess } = useApiState()
  const { adaptRequest, adaptResponse } = useProvider()
  const modelStore = useModelStore()

  const video = ref(null)
  const taskId = ref(null)
  const progress = reactive({
    attempt: 0,
    maxAttempts: 120,
    percentage: 0
  })

  /**
   * Create video task only (no polling) | 仅创建视频任务（不轮询）
   */
  const createVideoTaskOnly = async (params) => {
    const modelConfig = getModelByName(params.model)

    // Build request data | 构建请求数据
    const requestData = {
      model: params.model,
      prompt: params.prompt || ''
    }
    // Add optional params | 添加可选参数
    if (params.first_frame_image) requestData.first_frame_image = params.first_frame_image
    if (params.last_frame_image) requestData.last_frame_image = params.last_frame_image
    if (params.ratio) requestData.size = params.ratio
    if (params.dur) requestData.seconds = params.dur

    // 适配请求参数
    const adaptedParams = adaptRequest('video', requestData)

    // Call API to create task | 调用 API 创建任务
    const task = await createVideoTask(adaptedParams, {
      requestType: 'json',
      endpoint: modelStore.getVideoEndpoint()
    })

    // Check if async (need polling) | 检查是否异步
    const isAsync = modelConfig?.async !== false

    // If has video URL directly, return | 如果直接有视频 URL，返回
    if (!isAsync || task.data?.url || task.url || task.content?.video_url) {
      return {
        taskId: null,
        url: task.data?.url || task.url || task.content?.video_url
      }
    }

    // Get task ID | 获取任务 ID
    const newTaskId = task.id || task.task_id || task.taskId
    if (!newTaskId) {
      throw new Error('未获取到任务 ID')
    }

    return { taskId: newTaskId }
  }

  /**
   * Poll video task | 轮询视频任务
   */
  const pollVideoTask = async (pollTaskId, onProgress = () => {}) => {
    const maxAttempts = 120
    const interval = 5000

    for (let i = 0; i < maxAttempts; i++) {
      onProgress(i + 1, Math.min(Math.round((i / maxAttempts) * 100), 99))

      // 获取任务查询端点，支持 {taskId} 占位符替换
      let taskEndpoint = modelStore.getVideoTaskEndpoint()
      if (taskEndpoint.includes('{taskId}')) {
        taskEndpoint = taskEndpoint.replace('{taskId}', pollTaskId)
      }

      const result = await getVideoTaskStatus(pollTaskId, {
        endpoint: taskEndpoint
      })

      // 适配轮询响应
      const adaptedResult = adaptResponse('video', result)

      // Check for completion | 检查是否完成
      if (result.status === 'completed' || result.status === 'succeeded' || result.data) {
        const videoUrl = adaptedResult.url || result.data?.url || result.data?.[0]?.url || result.url || result.content?.video_url || result.video_url
        return { ...adaptedResult, url: videoUrl,  }
      }

      // Check for failure | 检查是否失败
      if (result.status === 'failed' || result.status === 'error') {
        throw new Error(result.error?.message || result.message || '视频生成失败')
      }

      // Wait before next poll | 等待下次轮询
      await new Promise(resolve => setTimeout(resolve, interval))
    }

    throw new Error('视频生成超时')
  }

  /**
   * Generate video with fixed params (includes polling) | 固定参数生成视频（含轮询）
   * @param {Object} params - { model, prompt, first_frame_image, last_frame_image, ratio, duration }
   */
  const generate = async (params) => {
    setLoading(true)
    video.value = null
    taskId.value = null
    progress.attempt = 0
    progress.percentage = 0

    try {
      // 创建任务
      const { taskId: newTaskId, url } = await createVideoTaskOnly(params)

      // 如果有直接 URL，返回
      if (url) {
        video.value = { url }
        setSuccess()
        return video.value
      }

      // 需要轮询
      taskId.value = newTaskId
      status.value = 'polling'

      // 轮询获取结果
      const result = await pollVideoTask(newTaskId, (attempt, percentage) => {
        progress.attempt = attempt
        progress.percentage = percentage
      })

      video.value = result
      setSuccess()
      return result
    } catch (err) {
      setError(err)
      throw err
    }
  }

  return { loading, error, status, video, taskId, progress, generate, reset, createVideoTaskOnly, pollVideoTask }
}

/**
 * Combined API composable | 综合 API 组合式函数
 */
export const useApi = () => {
  const config = useApiConfig()
  const chat = useChat()
  const image = useImageGeneration()
  const videoGen = useVideoGeneration()

  return { config, chat, image, video: videoGen }
}
