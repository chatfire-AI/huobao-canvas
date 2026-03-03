/**
 * Pinia Store: Model Config | 模型配置 Store
 * 管理模型配置、渠道切换和模型选择
 */

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import {
  CHAT_MODELS,
  IMAGE_MODELS,
  VIDEO_MODELS,
  DEFAULT_CHAT_MODEL,
  DEFAULT_IMAGE_MODEL,
  DEFAULT_VIDEO_MODEL
} from '@/config/models'
import { PROVIDERS, getProviderList, getDefaultProvider, getProviderConfig, getDefaultBaseUrl } from '@/config/providers'

// 存储键名
const STORAGE_KEYS = {
  PROVIDER: 'api-provider',
  CUSTOM_CHAT_MODELS: 'custom-chat-models',
  CUSTOM_IMAGE_MODELS: 'custom-image-models',
  CUSTOM_VIDEO_MODELS: 'custom-video-models',
  SELECTED_CHAT_MODEL: 'selected-chat-model',
  SELECTED_IMAGE_MODEL: 'selected-image-model',
  SELECTED_VIDEO_MODEL: 'selected-video-model',
  CUSTOM_CHAT_MODELS_BY_PROVIDER: 'custom-chat-models-by-provider',
  CUSTOM_IMAGE_MODELS_BY_PROVIDER: 'custom-image-models-by-provider',
  CUSTOM_VIDEO_MODELS_BY_PROVIDER: 'custom-video-models-by-provider',
  API_KEYS_BY_PROVIDER: 'api-keys-by-provider',
  BASE_URLS_BY_PROVIDER: 'base-urls-by-provider'
}

/**
 * Get stored value from localStorage
 */
const getStored = (key, defaultValue = '') => {
  try {
    return localStorage.getItem(key) || defaultValue
  } catch {
    return defaultValue
  }
}

/**
 * Set stored value to localStorage
 */
const setStored = (key, value) => {
  try {
    if (value) {
      localStorage.setItem(key, value)
    } else {
      localStorage.removeItem(key)
    }
  } catch {
    // ignore
  }
}

/**
 * Get stored JSON value from localStorage
 */
const getStoredJson = (key, defaultValue = []) => {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : defaultValue
  } catch {
    return defaultValue
  }
}

/**
 * Set stored JSON value to localStorage
 */
const setStoredJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore
  }
}

/**
 * 检查模型是否支持指定渠道
 */
const isModelSupported = (model, provider) => {
  if (!model.provider) {
    return true
  }
  return model.provider.includes(provider)
}

export const useModelStore = defineStore('model', () => {
  // ============ Provider 状态 | Provider State ============

  // 当前选中的渠道
  const currentProvider = ref(getStored(STORAGE_KEYS.PROVIDER) || getDefaultProvider())

  // 渠道列表
  const providerList = computed(() => getProviderList())

  // 当前渠道配置
  const providerConfig = computed(() => getProviderConfig(currentProvider.value))

  // 当前渠道标签
  const providerLabel = computed(() => providerConfig.value.label || currentProvider.value)

  // 设置当前渠道
  const setProvider = (provider) => {
    if (PROVIDERS[provider]) {
      currentProvider.value = provider
      setStored(STORAGE_KEYS.PROVIDER, provider)
    }
  }

  // 清除渠道配置
  const clearProvider = () => {
    currentProvider.value = getDefaultProvider()
    removeStored(STORAGE_KEYS.PROVIDER)
  }

  // 适配请求参数
  const adaptRequest = (type, params) => {
    const config = providerConfig.value
    if (config.requestAdapter && config.requestAdapter[type]) {
      return config.requestAdapter[type](params)
    }
    return params
  }

  // 适配响应数据
  const adaptResponse = (type, response) => {
    const config = providerConfig.value
    if (config.responseAdapter && config.responseAdapter[type]) {
      return config.responseAdapter[type](response)
    }
    return response
  }

  // ============ Custom Models 状态 | Custom Models State ============

  // 全局自定义模型（不区分渠道）
  const customChatModels = ref(getStoredJson(STORAGE_KEYS.CUSTOM_CHAT_MODELS, []))
  const customImageModels = ref(getStoredJson(STORAGE_KEYS.CUSTOM_IMAGE_MODELS, []))
  const customVideoModels = ref(getStoredJson(STORAGE_KEYS.CUSTOM_VIDEO_MODELS, []))

  // 按渠道存储的自定义模型 | 结构: { 'openai': [{key, label}], 'chatfire': [{key, label}] }
  const customChatModelsByProvider = ref(getStoredJson(STORAGE_KEYS.CUSTOM_CHAT_MODELS_BY_PROVIDER, {}))
  const customImageModelsByProvider = ref(getStoredJson(STORAGE_KEYS.CUSTOM_IMAGE_MODELS_BY_PROVIDER, {}))
  const customVideoModelsByProvider = ref(getStoredJson(STORAGE_KEYS.CUSTOM_VIDEO_MODELS_BY_PROVIDER, {}))

  // 选中的模型
  const selectedChatModel = ref(getStored(STORAGE_KEYS.SELECTED_CHAT_MODEL, DEFAULT_CHAT_MODEL))
  const selectedImageModel = ref(getStored(STORAGE_KEYS.SELECTED_IMAGE_MODEL, DEFAULT_IMAGE_MODEL))
  const selectedVideoModel = ref(getStored(STORAGE_KEYS.SELECTED_VIDEO_MODEL, DEFAULT_VIDEO_MODEL))

  // 按渠道存储的 API 配置
  const apiKeysByProvider = ref(getStoredJson(STORAGE_KEYS.API_KEYS_BY_PROVIDER, {}))
  const baseUrlsByProvider = ref(getStoredJson(STORAGE_KEYS.BASE_URLS_BY_PROVIDER, {}))

  // 当前渠道的 API Key 和 Base URL
  const currentApiKey = computed(() => apiKeysByProvider.value[currentProvider.value] || '')
  const currentBaseUrl = computed(() => baseUrlsByProvider.value[currentProvider.value] || getDefaultBaseUrl(currentProvider.value))

  // 设置指定渠道的 API Key
  const setApiKeyByProvider = (provider, apiKey) => {
    apiKeysByProvider.value[provider] = apiKey
  }

  // 设置指定渠道的 Base URL
  const setBaseUrlByProvider = (provider, baseUrl) => {
    baseUrlsByProvider.value[provider] = baseUrl
  }

  // 清除指定渠道的 API 配置
  const clearApiConfigByProvider = (provider) => {
    delete apiKeysByProvider.value[provider]
    delete baseUrlsByProvider.value[provider]
  }

  // ============ Computed: All Models (built-in + custom + by provider) ============

  const allChatModels = computed(() => [
    ...CHAT_MODELS.map(m => ({ ...m, isCustom: false })),
    ...customChatModels.value.map(m => ({
      label: m.label || m.key,
      key: m.key,
      isCustom: true
    })),
    // 添加当前渠道的自定义模型
    ...(customChatModelsByProvider.value[currentProvider.value] || []).map(m => ({
      label: m.label || m.key,
      key: m.key,
      isCustom: true,
      provider: [currentProvider.value]
    }))
  ])

  const allImageModels = computed(() => [
    ...IMAGE_MODELS.map(m => ({ ...m, isCustom: false })),
    ...customImageModels.value.map(m => ({
      label: m.label || m.key,
      key: m.key,
      isCustom: true,
      sizes: [],
      defaultParams: { quality: 'standard', style: 'vivid' }
    })),
    // 添加当前渠道的自定义模型
    ...(customImageModelsByProvider.value[currentProvider.value] || []).map(m => ({
      label: m.label || m.key,
      key: m.key,
      isCustom: true,
      sizes: [],
      defaultParams: { quality: 'standard', style: 'vivid' },
      provider: [currentProvider.value]
    }))
  ])

  const allVideoModels = computed(() => [
    ...VIDEO_MODELS.map(m => ({ ...m, isCustom: false })),
    ...customVideoModels.value.map(m => ({
      label: m.label || m.key,
      key: m.key,
      isCustom: true,
      ratios: ['16x9', '9:16', '1:1'],
      durs: [{ label: '5 秒', key: 5 }, { label: '10 秒', key: 10 }],
      defaultParams: { ratio: '16:9', duration: 5 }
    })),
    // 添加当前渠道的自定义模型
    ...(customVideoModelsByProvider.value[currentProvider.value] || []).map(m => ({
      label: m.label || m.key,
      key: m.key,
      isCustom: true,
      ratios: ['16x9', '9:16', '1:1'],
      durs: [{ label: '5 秒', key: 5 }, { label: '10 秒', key: 10 }],
      defaultParams: { ratio: '16:9', duration: 5 },
      provider: [currentProvider.value]
    }))
  ])

  // ============ Computed: Available Models (filtered by provider) ============

  // 按渠道过滤的可用模型
  const availableChatModels = computed(() =>
    allChatModels.value.filter(m => isModelSupported(m, currentProvider.value))
  )

  const availableImageModels = computed(() =>
    allImageModels.value.filter(m => isModelSupported(m, currentProvider.value))
  )

  const availableVideoModels = computed(() =>
    allVideoModels.value.filter(m => isModelSupported(m, currentProvider.value))
  )

  // ============ Computed: Model Options for UI (all models, not filtered by provider) ============

  // 返回适合 n-dropdown 使用的选项格式（全部模型，不按渠道过滤）
  const allImageModelOptions = computed(() =>
    allImageModels.value.map(m => ({
      label: m.label,
      key: m.key
    }))
  )

  const allVideoModelOptions = computed(() =>
    allVideoModels.value.map(m => ({
      label: m.label,
      key: m.key
    }))
  )

  const allChatModelOptions = computed(() =>
    allChatModels.value.map(m => ({
      label: m.label,
      key: m.key
    }))
  )

  // ============ Computed: Model Options for UI (filtered by provider - deprecated, use all* instead) ============

  // 返回适合 n-dropdown 使用的选项格式
  const imageModelOptions = computed(() =>
    availableImageModels.value.map(m => ({
      label: m.label,
      key: m.key
    }))
  )

  const videoModelOptions = computed(() =>
    availableVideoModels.value.map(m => ({
      label: m.label,
      key: m.key
    }))
  )

  const chatModelOptions = computed(() =>
    availableChatModels.value.map(m => ({
      label: m.label,
      key: m.key
    }))
  )

  // ============ Methods: Add/Remove Custom Models ============

  const addCustomChatModel = (modelKey, label = '') => {
    if (!modelKey || customChatModels.value.some(m => m.key === modelKey)) return false
    customChatModels.value.push({ key: modelKey, label: label || modelKey })
    return true
  }

  const addCustomImageModel = (modelKey, label = '') => {
    if (!modelKey || customImageModels.value.some(m => m.key === modelKey)) return false
    customImageModels.value.push({ key: modelKey, label: label || modelKey })
    return true
  }

  const addCustomVideoModel = (modelKey, label = '') => {
    if (!modelKey || customVideoModels.value.some(m => m.key === modelKey)) return false
    customVideoModels.value.push({ key: modelKey, label: label || modelKey })
    return true
  }

  const removeCustomChatModel = (modelKey) => {
    const idx = customChatModels.value.findIndex(m => m.key === modelKey)
    if (idx > -1) {
      customChatModels.value.splice(idx, 1)
      if (selectedChatModel.value === modelKey) {
        selectedChatModel.value = DEFAULT_CHAT_MODEL
      }
      return true
    }
    return false
  }

  const removeCustomImageModel = (modelKey) => {
    const idx = customImageModels.value.findIndex(m => m.key === modelKey)
    if (idx > -1) {
      customImageModels.value.splice(idx, 1)
      if (selectedImageModel.value === modelKey) {
        selectedImageModel.value = DEFAULT_IMAGE_MODEL
      }
      return true
    }
    return false
  }

  const removeCustomVideoModel = (modelKey) => {
    const idx = customVideoModels.value.findIndex(m => m.key === modelKey)
    if (idx > -1) {
      customVideoModels.value.splice(idx, 1)
      if (selectedVideoModel.value === modelKey) {
        selectedVideoModel.value = DEFAULT_VIDEO_MODEL
      }
      return true
    }
    return false
  }

  // ============ Methods: Get Model Config ============

  const getChatModel = (key) => allChatModels.value.find(m => m.key === key)
  const getImageModel = (key) => allImageModels.value.find(m => m.key === key)
  const getVideoModel = (key) => allVideoModels.value.find(m => m.key === key)

  // ============ Methods: Get API Endpoints ============

  // 获取图片端点
  const getImageEndpoint = () => {
    const endpoint = providerConfig.value.endpoints?.image || '/images/generations'
    return `${currentBaseUrl.value}${endpoint}`
  }

  // 获取视频生成端点
  const getVideoEndpoint = () => {
    const endpoint = providerConfig.value.endpoints?.video || '/videos'
    return `${currentBaseUrl.value}${endpoint}`
  }

  // 获取视频任务查询端点
  const getVideoTaskEndpoint = () => {
    const config = providerConfig.value
    // 优先使用 videoQuery 端点，支持 {taskId} 占位符替换
    let endpoint = config.endpoints?.videoQuery || config.endpoints?.video || '/videos'
    return `${currentBaseUrl.value}${endpoint}`
  }

  // ============ Methods: Get Models By Provider (for ApiSettings) ============

  const getModelsByProvider = (provider) => {
    const chat = [
      ...CHAT_MODELS.filter(m => isModelSupported(m, provider)).map(m => ({ ...m, isCustom: false })),
      ...(customChatModelsByProvider.value[provider] || []).map(m => ({
        label: m.label || m.key,
        key: m.key,
        isCustom: true,
        provider: [provider]
      }))
    ]
    const image = [
      ...IMAGE_MODELS.filter(m => isModelSupported(m, provider)).map(m => ({ ...m, isCustom: false })),
      ...(customImageModelsByProvider.value[provider] || []).map(m => ({
        label: m.label || m.key,
        key: m.key,
        isCustom: true,
        sizes: [],
        defaultParams: { quality: 'standard', style: 'vivid' },
        provider: [provider]
      }))
    ]
    const video = [
      ...VIDEO_MODELS.filter(m => isModelSupported(m, provider)).map(m => ({ ...m, isCustom: false })),
      ...(customVideoModelsByProvider.value[provider] || []).map(m => ({
        label: m.label || m.key,
        key: m.key,
        isCustom: true,
        ratios: ['16x9', '9:16', '1:1'],
        durs: [{ label: '5 秒', key: 5 }, { label: '10 秒', key: 10 }],
        defaultParams: { ratio: '16:9', duration: 5 },
        provider: [provider]
      }))
    ]
    return { chat, image, video }
  }

  // ============ Methods: Add/Remove Custom Models By Provider ============

  const addCustomChatModelByProvider = (modelKey, provider, label = '') => {
    if (!modelKey) return false
    if (!customChatModelsByProvider.value[provider]) {
      customChatModelsByProvider.value[provider] = []
    }
    if (customChatModelsByProvider.value[provider].some(m => m.key === modelKey)) return false
    customChatModelsByProvider.value[provider].push({ key: modelKey, label: label || modelKey })
    return true
  }

  const addCustomImageModelByProvider = (modelKey, provider, label = '') => {
    if (!modelKey) return false
    if (!customImageModelsByProvider.value[provider]) {
      customImageModelsByProvider.value[provider] = []
    }
    if (customImageModelsByProvider.value[provider].some(m => m.key === modelKey)) return false
    customImageModelsByProvider.value[provider].push({ key: modelKey, label: label || modelKey })
    return true
  }

  const addCustomVideoModelByProvider = (modelKey, provider, label = '') => {
    if (!modelKey) return false
    if (!customVideoModelsByProvider.value[provider]) {
      customVideoModelsByProvider.value[provider] = []
    }
    if (customVideoModelsByProvider.value[provider].some(m => m.key === modelKey)) return false
    customVideoModelsByProvider.value[provider].push({ key: modelKey, label: label || modelKey })
    return true
  }

  const removeCustomChatModelByProvider = (modelKey, provider) => {
    if (!customChatModelsByProvider.value[provider]) return false
    const idx = customChatModelsByProvider.value[provider].findIndex(m => m.key === modelKey)
    if (idx > -1) {
      customChatModelsByProvider.value[provider].splice(idx, 1)
      return true
    }
    return false
  }

  const removeCustomImageModelByProvider = (modelKey, provider) => {
    if (!customImageModelsByProvider.value[provider]) return false
    const idx = customImageModelsByProvider.value[provider].findIndex(m => m.key === modelKey)
    if (idx > -1) {
      customImageModelsByProvider.value[provider].splice(idx, 1)
      return true
    }
    return false
  }

  const removeCustomVideoModelByProvider = (modelKey, provider) => {
    if (!customVideoModelsByProvider.value[provider]) return false
    const idx = customVideoModelsByProvider.value[provider].findIndex(m => m.key === modelKey)
    if (idx > -1) {
      customVideoModelsByProvider.value[provider].splice(idx, 1)
      return true
    }
    return false
  }

  // 清除所有自定义模型
  const clearCustomModels = () => {
    customChatModels.value = []
    customImageModels.value = []
    customVideoModels.value = []
    selectedChatModel.value = DEFAULT_CHAT_MODEL
    selectedImageModel.value = DEFAULT_IMAGE_MODEL
    selectedVideoModel.value = DEFAULT_VIDEO_MODEL
  }

  // ============ Watch & Persist ============

  // 监听并持久化自定义模型
  watch(customChatModels, (val) => setStoredJson(STORAGE_KEYS.CUSTOM_CHAT_MODELS, val), { deep: true })
  watch(customImageModels, (val) => setStoredJson(STORAGE_KEYS.CUSTOM_IMAGE_MODELS, val), { deep: true })
  watch(customVideoModels, (val) => setStoredJson(STORAGE_KEYS.CUSTOM_VIDEO_MODELS, val), { deep: true })

  // 监听并持久化按渠道的自定义模型
  watch(customChatModelsByProvider, (val) => setStoredJson(STORAGE_KEYS.CUSTOM_CHAT_MODELS_BY_PROVIDER, val), { deep: true })
  watch(customImageModelsByProvider, (val) => setStoredJson(STORAGE_KEYS.CUSTOM_IMAGE_MODELS_BY_PROVIDER, val), { deep: true })
  watch(customVideoModelsByProvider, (val) => setStoredJson(STORAGE_KEYS.CUSTOM_VIDEO_MODELS_BY_PROVIDER, val), { deep: true })

  // 监听并持久化选中的模型
  watch(selectedChatModel, (val) => setStored(STORAGE_KEYS.SELECTED_CHAT_MODEL, val))
  watch(selectedImageModel, (val) => setStored(STORAGE_KEYS.SELECTED_IMAGE_MODEL, val))
  watch(selectedVideoModel, (val) => setStored(STORAGE_KEYS.SELECTED_VIDEO_MODEL, val))

  // 监听并持久化 API 配置
  watch(apiKeysByProvider, (val) => setStoredJson(STORAGE_KEYS.API_KEYS_BY_PROVIDER, val), { deep: true })
  watch(baseUrlsByProvider, (val) => setStoredJson(STORAGE_KEYS.BASE_URLS_BY_PROVIDER, val), { deep: true })

  return {
    // Provider
    currentProvider,
    providerList,
    providerConfig,
    providerLabel,
    setProvider,
    clearProvider,
    adaptRequest,
    adaptResponse,

    // All models (built-in + custom)
    allChatModels,
    allImageModels,
    allVideoModels,

    // Available models filtered by provider
    availableChatModels,
    availableImageModels,
    availableVideoModels,

    // Model options for UI (dropdown format)
    imageModelOptions,
    videoModelOptions,
    chatModelOptions,

    // All model options (not filtered by provider)
    allImageModelOptions,
    allVideoModelOptions,
    allChatModelOptions,

    // Selected models
    selectedChatModel,
    selectedImageModel,
    selectedVideoModel,

    // Custom models
    customChatModels,
    customImageModels,
    customVideoModels,

    // Custom models by provider
    customChatModelsByProvider,
    customImageModelsByProvider,
    customVideoModelsByProvider,

    // Add/Remove methods
    addCustomChatModel,
    addCustomImageModel,
    addCustomVideoModel,
    removeCustomChatModel,
    removeCustomImageModel,
    removeCustomVideoModel,

    // Add/Remove by provider methods
    addCustomChatModelByProvider,
    addCustomImageModelByProvider,
    addCustomVideoModelByProvider,
    removeCustomChatModelByProvider,
    removeCustomImageModelByProvider,
    removeCustomVideoModelByProvider,

    // Get model
    getChatModel,
    getImageModel,
    getVideoModel,

    // Get API endpoints
    getImageEndpoint,
    getVideoEndpoint,
    getVideoTaskEndpoint,

    // Get models by provider (for ApiSettings)
    getModelsByProvider,

    // Clear all custom models
    clearCustomModels,

    // API Config by provider
    currentApiKey,
    currentBaseUrl,
    apiKeysByProvider,
    baseUrlsByProvider,
    setApiKeyByProvider,
    setBaseUrlByProvider,
    clearApiConfigByProvider
  }
})
