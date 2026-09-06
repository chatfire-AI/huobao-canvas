import { ref, computed } from 'vue'
import {
  listApiKeys,
  addApiKey,
  removeApiKey,
  getCurrentApiKey,
  setCurrentApiKey,
} from '@/utils/apiKeySession'
import { getGatewayBaseUrl } from '@/config'
import { i18n } from '@/locales'

/**
 * BYOK 模式 API Key 管理：
 * Key 只存浏览器 localStorage（@/utils/apiKeySession），不上传任何服务端。
 * 兼容 URL 参数 ?api_key=sk-... 快速带入。
 */
export function usePlaygroundApiKey(route, router) {
  const apiKeyOptions = ref([])
  const selectedApiKey = ref('')
  const apiKeyLoading = ref(false)
  const apiKeyLoaded = ref(false)

  const maskApiKey = (apiKey) => {
    const value = String(apiKey || '')
    if (!value) return ''
    if (value.length <= 12) return `${value.slice(0, 4)}****`
    return `${value.slice(0, 6)}********${value.slice(-4)}`
  }

  const createOption = (apiKey, item = {}, source = 'stored') => ({
    label: source === 'url' ? i18n.global.t('playground.apiKey.urlLabel', { key: maskApiKey(apiKey) }) : (item.name || maskApiKey(apiKey)),
    value: apiKey,
    source,
    raw: item,
  })

  const routeApiKey = computed(() => {
    const value = route?.query?.api_key
    return Array.isArray(value) ? value[0] : value || ''
  })

  const selectedApiKeyValue = computed(() => selectedApiKey.value || routeApiKey.value || '')

  const loadApiKeys = async () => {
    apiKeyLoading.value = true
    try {
      const options = []

      if (routeApiKey.value) {
        options.push(createOption(routeApiKey.value, {}, 'url'))
      }

      for (const item of listApiKeys()) {
        options.push(createOption(item.key, item))
      }

      apiKeyOptions.value = options
      if (!selectedApiKey.value) {
        selectedApiKey.value = getCurrentApiKey() || options[0]?.value || ''
      }
      apiKeyLoaded.value = true
      return options
    } finally {
      apiKeyLoading.value = false
    }
  }

  const selectApiKey = (apiKey) => {
    selectedApiKey.value = apiKey || ''
    if (apiKey) setCurrentApiKey(apiKey)
  }

  /** 新增 Key 到本地存储并选中 */
  const saveApiKey = (apiKey, name = '') => {
    addApiKey(apiKey, name)
    apiKeyLoaded.value = false
    selectApiKey(String(apiKey || '').trim())
    return loadApiKeys()
  }

  const deleteApiKey = (apiKey) => {
    removeApiKey(apiKey)
    apiKeyLoaded.value = false
    if (selectedApiKey.value === apiKey) selectedApiKey.value = ''
    return loadApiKeys()
  }

  const getFirstApiKey = async () => {
    const options = await loadApiKeys()
    return options[0]?.value || null
  }

  const ensureApiKey = async () => {
    if (selectedApiKeyValue.value) return selectedApiKeyValue.value

    const apiKey = await getFirstApiKey()
    if (apiKey) return apiKey

    window.$message?.warning(i18n.global.t('playground.apiKey.required'))
    return null
  }

  const getApiKey = () => selectedApiKeyValue.value

  const getApiBaseUrl = () => getGatewayBaseUrl()

  return {
    apiKeyOptions,
    selectedApiKey,
    selectedApiKeyValue,
    apiKeyLoading,
    loadApiKeys,
    selectApiKey,
    saveApiKey,
    deleteApiKey,
    maskApiKey,
    ensureApiKey,
    getApiKey,
    getApiBaseUrl,
    getFirstApiKey
  }
}
