/**
 * Model Config Hook | 模型配置 Hook
 * Manages model configuration with local storage persistence
 */

import { ref, computed, watch } from 'vue'
import { STORAGE_KEYS } from '@/utils'
import { 
  CHAT_MODELS, 
  IMAGE_MODELS, 
  VIDEO_MODELS,
  DEFAULT_CHAT_MODEL,
  DEFAULT_IMAGE_MODEL,
  DEFAULT_VIDEO_MODEL
} from '@/config/models'

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

const selectedChatModel = ref(getStored(STORAGE_KEYS.SELECTED_CHAT_MODEL, DEFAULT_CHAT_MODEL))
const selectedImageModel = ref(getStored(STORAGE_KEYS.SELECTED_IMAGE_MODEL, DEFAULT_IMAGE_MODEL))
const selectedVideoModel = ref(getStored(STORAGE_KEYS.SELECTED_VIDEO_MODEL, DEFAULT_VIDEO_MODEL))

/**
 * Model Configuration Hook
 */
export const useModelConfig = () => {
  // Combined models (built-in + custom)
  const allChatModels = computed(() => [
    ...CHAT_MODELS.map(m => ({ ...m, isCustom: false })),
    ...customChatModels.value.map(m => ({ 
      label: m.label || m.key, 
      key: m.key,
      isCustom: true 
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
    }))
  ])

  const allVideoModels = computed(() => [
    ...VIDEO_MODELS.map(m => ({ ...m, isCustom: false })),
    ...customVideoModels.value.map(m => ({ 
      label: m.label || m.key, 
      key: m.key,
      isCustom: true,
      ratios: ['16x9', '9x16', '1x1'],
      durs: [{ label: '5 秒', key: 5 }, { label: '10 秒', key: 10 }],
      defaultParams: { ratio: '16:9', duration: 5 }
    }))
  ])

  // Watch and persist changes
  watch(customChatModels, (val) => setStoredJson(STORAGE_KEYS.CUSTOM_CHAT_MODELS, val), { deep: true })
  watch(customImageModels, (val) => setStoredJson(STORAGE_KEYS.CUSTOM_IMAGE_MODELS, val), { deep: true })
  watch(customVideoModels, (val) => setStoredJson(STORAGE_KEYS.CUSTOM_VIDEO_MODELS, val), { deep: true })

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
    
    // Clear
    clearCustomModels
  }
}
