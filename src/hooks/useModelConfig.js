/**
 * Model Config Hook | 模型配置 Hook
 * Manages model configuration with local storage persistence
 */

import { ref, computed, watch } from 'vue'
import { STORAGE_KEYS } from '@/utils'
import { useProvider } from './useProvider'
import {
  CHAT_MODELS,
  IMAGE_MODELS,
  VIDEO_MODELS,
  DEFAULT_CHAT_MODEL,
  DEFAULT_IMAGE_MODEL,
  DEFAULT_VIDEO_MODEL
} from '@/config/models'

/**
 * 检查模型是否支持指定渠道
 * @param {Object} model - 模型配置
 * @param {string} provider - 渠道名称
 * @returns {boolean} 是否支持
 */
const isModelSupported = (model, provider) => {
  // 如果没有 provider 字段，默认支持所有渠道
  if (!model.provider) {
    return true
  }
  // 如果有 provider 字段，检查是否包含指定渠道
  return model.provider.includes(provider)
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
    // Ignore storage errors
  }
}

/**
 * Get stored string value from localStorage
 */
const getStored = (key, defaultValue = '') => {
  try {
    return localStorage.getItem(key) || defaultValue
  } catch {
    return defaultValue
  }
}

/**
 * Set stored string value to localStorage
 */
const setStored = (key, value) => {
  try {
    if (value) {
      localStorage.setItem(key, value)
    } else {
      localStorage.removeItem(key)
    }
  } catch {
    // Ignore storage errors
  }
}

// Shared reactive state (singleton pattern)
const customChatModels = ref(getStoredJson(STORAGE_KEYS.CUSTOM_CHAT_MODELS, []))
const customImageModels = ref(getStoredJson(STORAGE_KEYS.CUSTOM_IMAGE_MODELS, []))
const customVideoModels = ref(getStoredJson(STORAGE_KEYS.CUSTOM_VIDEO_MODELS, []))

// 按渠道存储的自定义模型 | 结构: { 'openai': [{key, label}], 'chatfire': [{key, label}] }
const customChatModelsByProvider = ref(getStoredJson(STORAGE_KEYS.CUSTOM_CHAT_MODELS_BY_PROVIDER || 'custom-chat-models-by-provider', {}))
const customImageModelsByProvider = ref(getStoredJson(STORAGE_KEYS.CUSTOM_IMAGE_MODELS_BY_PROVIDER || 'custom-image-models-by-provider', {}))
const customVideoModelsByProvider = ref(getStoredJson(STORAGE_KEYS.CUSTOM_VIDEO_MODELS_BY_PROVIDER || 'custom-video-models-by-provider', {}))

const selectedChatModel = ref(getStored(STORAGE_KEYS.SELECTED_CHAT_MODEL, DEFAULT_CHAT_MODEL))
const selectedImageModel = ref(getStored(STORAGE_KEYS.SELECTED_IMAGE_MODEL, DEFAULT_IMAGE_MODEL))
const selectedVideoModel = ref(getStored(STORAGE_KEYS.SELECTED_VIDEO_MODEL, DEFAULT_VIDEO_MODEL))

/**
 * Model Configuration Hook
 */
export const useModelConfig = () => {
  // Get current provider | 获取当前渠道
  const { currentProvider } = useProvider()

  // Combined models (built-in + custom, including provider-specific custom models)
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

  // Available models filtered by provider | 根据渠道过滤的可用模型
  const availableChatModels = computed(() =>
    allChatModels.value.filter(m => isModelSupported(m, currentProvider.value))
  )

  const availableImageModels = computed(() =>
    allImageModels.value.filter(m => isModelSupported(m, currentProvider.value))
  )

  const availableVideoModels = computed(() =>
    allVideoModels.value.filter(m => isModelSupported(m, currentProvider.value))
  )

  // All models (including models from all providers, not filtered) | 所有模型（不按渠道过滤）
  const allAvailableChatModels = computed(() => allChatModels.value)
  const allAvailableImageModels = computed(() => allImageModels.value)
  const allAvailableVideoModels = computed(() => allVideoModels.value)

  // 获取指定渠道的模型（包括内置 + 该渠道自定义）
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

  // Watch and persist changes
  watch(customChatModels, (val) => setStoredJson(STORAGE_KEYS.CUSTOM_CHAT_MODELS, val), { deep: true })
  watch(customImageModels, (val) => setStoredJson(STORAGE_KEYS.CUSTOM_IMAGE_MODELS, val), { deep: true })
  watch(customVideoModels, (val) => setStoredJson(STORAGE_KEYS.CUSTOM_VIDEO_MODELS, val), { deep: true })

  // Watch and persist by provider changes
  watch(customChatModelsByProvider, (val) => {
    const key = STORAGE_KEYS.CUSTOM_CHAT_MODELS_BY_PROVIDER || 'custom-chat-models-by-provider'
    setStoredJson(key, val)
  }, { deep: true })
  watch(customImageModelsByProvider, (val) => {
    const key = STORAGE_KEYS.CUSTOM_IMAGE_MODELS_BY_PROVIDER || 'custom-image-models-by-provider'
    setStoredJson(key, val)
  }, { deep: true })
  watch(customVideoModelsByProvider, (val) => {
    const key = STORAGE_KEYS.CUSTOM_VIDEO_MODELS_BY_PROVIDER || 'custom-video-models-by-provider'
    setStoredJson(key, val)
  }, { deep: true })

  watch(selectedChatModel, (val) => setStored(STORAGE_KEYS.SELECTED_CHAT_MODEL, val))
  watch(selectedImageModel, (val) => setStored(STORAGE_KEYS.SELECTED_IMAGE_MODEL, val))
  watch(selectedVideoModel, (val) => setStored(STORAGE_KEYS.SELECTED_VIDEO_MODEL, val))

  // Add custom model
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

  // Remove custom model
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

  // 按渠道添加自定义模型
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

  // 按渠道删除自定义模型
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

  // Get model by key
  const getChatModel = (key) => allChatModels.value.find(m => m.key === key)
  const getImageModel = (key) => allImageModels.value.find(m => m.key === key)
  const getVideoModel = (key) => allVideoModels.value.find(m => m.key === key)

  // Clear all custom models
  const clearCustomModels = () => {
    customChatModels.value = []
    customImageModels.value = []
    customVideoModels.value = []
    selectedChatModel.value = DEFAULT_CHAT_MODEL
    selectedImageModel.value = DEFAULT_IMAGE_MODEL
    selectedVideoModel.value = DEFAULT_VIDEO_MODEL
  }

  return {
    // All models (built-in + custom)
    allChatModels,
    allImageModels,
    allVideoModels,

    // Available models filtered by provider | 根据渠道过滤的可用模型
    availableChatModels,
    availableImageModels,
    availableVideoModels,

    // All models (including models from all providers, not filtered) | 所有模型（不按渠道过滤）
    allAvailableChatModels,
    allAvailableImageModels,
    allAvailableVideoModels,

    // Custom models only
    customChatModels,
    customImageModels,
    customVideoModels,

    // Selected models
    selectedChatModel,
    selectedImageModel,
    selectedVideoModel,

    // Add methods
    addCustomChatModel,
    addCustomImageModel,
    addCustomVideoModel,

    // Remove methods
    removeCustomChatModel,
    removeCustomImageModel,
    removeCustomVideoModel,

    // Get model
    getChatModel,
    getImageModel,
    getVideoModel,

    // Get models by provider (for ApiSettings)
    getModelsByProvider,

    // Custom models by provider
    customChatModelsByProvider,
    customImageModelsByProvider,
    customVideoModelsByProvider,

    // Add/Remove by provider methods
    addCustomChatModelByProvider,
    addCustomImageModelByProvider,
    addCustomVideoModelByProvider,
    removeCustomChatModelByProvider,
    removeCustomImageModelByProvider,
    removeCustomVideoModelByProvider,

    // Clear
    clearCustomModels
  }
}
