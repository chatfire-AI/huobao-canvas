/**
 * Model Store | 模型状态管理
 * Built-in models + custom models from local storage | 开源版内置模型 + 本地存储自定义模型
 */

import { ref, computed } from 'vue'
import {
  IMAGE_MODELS,
  VIDEO_MODELS,
  CHAT_MODELS,
  SEEDREAM_SIZE_OPTIONS,
  SEEDREAM_4K_SIZE_OPTIONS,
  SEEDREAM_QUALITY_OPTIONS,
  VIDEO_RATIO_LIST,
  VIDEO_RATIO_OPTIONS,
  VIDEO_DURATION_OPTIONS,
  DEFAULT_IMAGE_MODEL,
  DEFAULT_VIDEO_MODEL,
  DEFAULT_CHAT_MODEL,
  DEFAULT_IMAGE_SIZE,
  DEFAULT_VIDEO_RATIO,
  DEFAULT_VIDEO_DURATION
} from '@/config/models'
import { useModelConfig } from '@/hooks/useModelConfig'

// Loading state (always false for built-in models) | 加载状态
const loading = ref(false)
const error = ref(null)

// Get model config hook | 获取模型配置 hook
const getModelConfigHook = () => {
  try {
    return useModelConfig()
  } catch {
    return null
  }
}

/**
 * Initialize models (no-op for built-in) | 初始化模型
 */
export const loadAllModels = async () => {
  const modelConfig = getModelConfigHook()
  if (modelConfig) {
    return [...modelConfig.allImageModels.value, ...modelConfig.allVideoModels.value, ...modelConfig.allChatModels.value]
  }
  return [...IMAGE_MODELS, ...VIDEO_MODELS, ...CHAT_MODELS]
}

/**
 * Get model config by name | 根据名称获取模型配置
 */
export const getModelConfig = (modelKey) => {
  const modelConfig = getModelConfigHook()
  if (modelConfig) {
    return modelConfig.getImageModel(modelKey) || 
           modelConfig.getVideoModel(modelKey) || 
           modelConfig.getChatModel(modelKey)
  }
  const allModels = [...IMAGE_MODELS, ...VIDEO_MODELS, ...CHAT_MODELS]
  return allModels.find(m => m.key === modelKey)
}

/**
 * Get size options for image model | 获取图片模型尺寸选项
 * Returns options based on model's sizes array and quality
 */
export const getModelSizeOptions = (modelKey, quality = 'standard') => {
  const model = IMAGE_MODELS.find(m => m.key === modelKey)
  
  // If model has getSizesByQuality function, use it | 如果模型有 getSizesByQuality 函数，使用它
  if (model?.getSizesByQuality) {
    return model.getSizesByQuality(quality)
  }
  
  if (!model?.sizes) return SEEDREAM_SIZE_OPTIONS
  
  // Convert sizes array to dropdown options | 转换 sizes 数组为下拉选项
  const sizeOptions = quality === '4k' ? SEEDREAM_4K_SIZE_OPTIONS : SEEDREAM_SIZE_OPTIONS
  return model.sizes.map(size => {
    const option = sizeOptions.find(o => o.key === size)
    return option || { label: size, key: size }
  })
}

/**
 * Get quality options for image model | 获取图片模型画质选项
 */
export const getModelQualityOptions = (modelKey) => {
  const model = IMAGE_MODELS.find(m => m.key === modelKey)
  return model?.qualities || []
}

/**
 * Get ratio options for video model | 获取视频模型比例选项
 * Returns options based on model's ratios array
 */
export const getModelRatioOptions = (modelKey) => {
  const model = VIDEO_MODELS.find(m => m.key === modelKey)
  if (!model?.ratios) return VIDEO_RATIO_OPTIONS
  
  // Convert ratios array to dropdown options | 转换 ratios 数组为下拉选项
  return model.ratios.map(ratio => {
    const option = VIDEO_RATIO_LIST.find(o => o.key === ratio)
    return option || { label: ratio, key: ratio }
  })
}

/**
 * Get duration options for video model | 获取视频模型时长选项
 * Returns options based on model's durs array
 */
export const getModelDurationOptions = (modelKey) => {
  const model = VIDEO_MODELS.find(m => m.key === modelKey)
  if (!model?.durs) return VIDEO_DURATION_OPTIONS
  
  // durs is already in { label, key } format | durs 已经是 { label, key } 格式
  return model.durs
}

// Dropdown options (built-in + custom) | 下拉选项（内置 + 自定义）
export const imageModelOptions = computed(() => {
  const modelConfig = getModelConfigHook()
  return modelConfig ? modelConfig.allImageModels.value : IMAGE_MODELS
})

export const videoModelOptions = computed(() => {
  const modelConfig = getModelConfigHook()
  return modelConfig ? modelConfig.allVideoModels.value : VIDEO_MODELS
})

export const chatModelOptions = computed(() => {
  const modelConfig = getModelConfigHook()
  return modelConfig ? modelConfig.allChatModels.value : CHAT_MODELS
})

// Simple select options (for n-select) | 简单选择选项
export const imageModelSelectOptions = computed(() => 
  imageModelOptions.value.map(m => ({ label: m.label, value: m.key }))
)

export const videoModelSelectOptions = computed(() => 
  videoModelOptions.value.map(m => ({ label: m.label, value: m.key }))
)

export const chatModelSelectOptions = computed(() => 
  chatModelOptions.value.map(m => ({ label: m.label, value: m.key }))
)

// Export model arrays (reactive with custom models) | 导出模型数组（响应式，包含自定义模型）
export const imageModels = computed(() => imageModelOptions.value)
export const videoModels = computed(() => videoModelOptions.value)
export const chatModels = computed(() => chatModelOptions.value)

// Export defaults | 导出默认值
export {
  DEFAULT_IMAGE_MODEL,
  DEFAULT_VIDEO_MODEL,
  DEFAULT_CHAT_MODEL,
  DEFAULT_IMAGE_SIZE,
  DEFAULT_VIDEO_RATIO,
  DEFAULT_VIDEO_DURATION
}

// Export options | 导出选项
export { SEEDREAM_SIZE_OPTIONS, SEEDREAM_4K_SIZE_OPTIONS, SEEDREAM_QUALITY_OPTIONS, VIDEO_RATIO_OPTIONS, VIDEO_DURATION_OPTIONS }

// Export state | 导出状态
export { loading, error }
