/**
 * Provider Hook | 渠道管理 Hook
 * 管理当前选中的 API 渠道，提供请求/响应适配功能
 */

import { ref, computed } from 'vue'
import { PROVIDERS, getProviderList, getDefaultProvider, getProviderConfig } from '@/config/providers'

// 存储键名
const STORAGE_KEY = 'api-provider'

/**
 * Get stored value from localStorage | 从 localStorage 获取存储值
 */
const getStored = (key, defaultValue = '') => {
  try {
    return localStorage.getItem(key) || defaultValue
  } catch {
    return defaultValue
  }
}

/**
 * Set stored value to localStorage | 设置存储值到 localStorage
 */
const setStored = (key, value) => {
  try {
    localStorage.setItem(key, value)
  } catch {
    // ignore
  }
}

/**
 * Remove stored value from localStorage | 从 localStorage 移除存储值
 */
const removeStored = (key) => {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

/**
 * 获取存储的渠道
 */
const getStoredProvider = () => {
  return getStored(STORAGE_KEY)
}

/**
 * Provider Hook | 渠道管理 Hook
 */
export const useProvider = () => {
  // 当前选中的渠道
  const currentProvider = ref(getStoredProvider() || getDefaultProvider())

  // 渠道列表
  const providerList = getProviderList()

  // 当前渠道配置
  const providerConfig = computed(() => getProviderConfig(currentProvider.value))

  // 当前渠道标签
  const providerLabel = computed(() => providerConfig.value.label || currentProvider.value)

  /**
   * 设置当前渠道
   */
  const setProvider = (provider) => {
    if (PROVIDERS[provider]) {
      currentProvider.value = provider
      setStored(STORAGE_KEY, provider)
    }
  }

  /**
   * 清除渠道配置
   */
  const clearProvider = () => {
    currentProvider.value = getDefaultProvider()
    removeStored(STORAGE_KEY)
  }

  /**
   * 适配请求参数
   * @param {string} type - 请求类型：'chat' | 'image' | 'video'
   * @param {Object} params - 原始请求参数
   */
  const adaptRequest = (type, params) => {
    const config = providerConfig.value
    if (config.requestAdapter && config.requestAdapter[type]) {
      return config.requestAdapter[type](params)
    }
    // 如果没有适配器，返回原始参数
    return params
  }

  /**
   * 适配响应数据
   * @param {string} type - 响应类型：'chat' | 'image' | 'video'
   * @param {Object} response - 原始响应数据
   */
  const adaptResponse = (type, response) => {
    const config = providerConfig.value
    if (config.responseAdapter && config.responseAdapter[type]) {
      return config.responseAdapter[type](response)
    }
    // 如果没有适配器，返回原始响应
    return response
  }

  return {
    currentProvider,
    providerList,
    providerConfig,
    providerLabel,
    setProvider,
    clearProvider,
    adaptRequest,
    adaptResponse
  }
}
