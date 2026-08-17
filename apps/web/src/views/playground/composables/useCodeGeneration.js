import { ref, computed } from 'vue'
import Prism from 'prismjs'
import 'prismjs/themes/prism-tomorrow.css'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-go'
import 'prismjs/components/prism-json'
import { getCodeGenerator, languageMap } from '../constants/codeTemplates'
import { PUBLIC_API_BASE_URL } from '../constants/apiBaseUrl'
import {
  INPUT_VIEW_OPTIONS,
  INPUT_VIEW_LABELS,
  INPUT_VIEW_ICONS,
  CODE_VIEWS
} from '../constants/index'
import { getEndpointBehavior } from '../constants/index'
import { resolveEndpointPath } from '../utils/endpointPath'

const CODE_EXAMPLE_API_KEY = '<API_KEY>'

export function useCodeGeneration({ modelData, formData, selectedEndpoint, inputTransformSchema, requestTypeSchema, route, getApiKey, getApiBaseUrl, applyInputTransform }) {
  const inputView = ref('form')

  const inputViewOptions = INPUT_VIEW_OPTIONS

  const currentInputViewLabel = computed(() => {
    return INPUT_VIEW_LABELS[inputView.value] || 'Form'
  })

  const currentInputViewIcon = computed(() => {
    return INPUT_VIEW_ICONS[inputView.value] || 'tabler:forms'
  })

  const isCodeView = computed(() => {
    return CODE_VIEWS.includes(inputView.value)
  })

  const isFileValue = (data) => {
    return typeof File !== 'undefined' && data instanceof File
  }

  const replaceFileWithPlaceholder = (data) => {
    if (isFileValue(data)) {
      return {
        name: data.name,
        size: data.size,
        type: data.type || 'application/octet-stream',
        placeholder: `file://${data.name}`
      }
    }
    if (Array.isArray(data)) {
      return data.map(item => replaceFileWithPlaceholder(item))
    }
    if (typeof data === 'object' && data !== null) {
      const result = {}
      for (const [key, value] of Object.entries(data)) {
        result[key] = replaceFileWithPlaceholder(value)
      }
      return result
    }
    return data
  }

  // 表单里的 JSON 文本字段（如 messages textarea）在预览/示例中还原为真正的 JSON，
  // 与实际发送逻辑（useModelRunner 会解析 messages 字符串）保持一致
  const parseJsonStrings = (data) => {
    if (typeof data === 'string') {
      const trimmed = data.trim()
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          return parseJsonStrings(JSON.parse(trimmed))
        } catch {
          return data
        }
      }
      return data
    }
    if (Array.isArray(data)) {
      return data.map(item => parseJsonStrings(item))
    }
    if (typeof data === 'object' && data !== null && !isFileValue(data)) {
      const result = {}
      for (const [key, value] of Object.entries(data)) {
        result[key] = parseJsonStrings(value)
      }
      return result
    }
    return data
  }

  const requestPreviewTransport = computed(() => {
    const ep = selectedEndpoint.value
    const useFormData = route.query.request_type === 'formdata' || requestTypeSchema.value === 'formdata' || (ep && ep.contentType === 'FORM')
    return useFormData ? 'formdata' : 'json'
  })

  const requestPreviewBody = computed(() => {
    const source = inputTransformSchema.value
      ? applyInputTransform(inputTransformSchema.value, formData.value)
      : formData.value
    const body = parseJsonStrings(replaceFileWithPlaceholder(source))
    // 与实际发送一致:所有协议适配器都以 { model: modelName, ...data } 注入 model,
    // JSON 预览/接口文档的请求体示例必须同步带上,避免展示与真实请求不一致
    const modelName = modelData.value?.name
    if (modelName && body && typeof body === 'object' && !Array.isArray(body)) {
      return { model: modelName, ...body }
    }
    return body
  })

  const inputJsonCode = computed(() => {
    return JSON.stringify(requestPreviewBody.value, null, 2)
  })

  const currentLanguage = computed(() => {
    return languageMap[inputView.value] || 'javascript'
  })

  const highlightedJsonCode = computed(() => {
    const code = inputJsonCode.value
    return Prism.highlight(code, Prism.languages.json, 'json')
  })

  const highlightedCodeExample = computed(() => {
    const code = currentCodeExample.value
    const lang = currentLanguage.value
    const grammar = Prism.languages[lang]
    if (!grammar) return code
    return Prism.highlight(code, grammar, lang)
  })

  const buildCodeExample = (view) => {
    const modelName = modelData.value.name || 'model-name'
    const ep = selectedEndpoint.value
    const endpoint = resolveEndpointPath(
      ep ? ep.path : '/v1/chat/completions',
      modelName,
      modelData.value.providerCode || modelData.value.factory || '',
    )
    const apiKey = CODE_EXAMPLE_API_KEY
    // 代码示例始终展示线上绝对地址（getApiBaseUrl 在 dev 为同源空串，复制出去不可运行）
    const baseUrl = PUBLIC_API_BASE_URL
    const useFormData = requestPreviewTransport.value === 'formdata'
    const streaming = formData.value.stream === true && (ep ? getEndpointBehavior(ep.path).streaming : false)
    const protocolKey = modelData.value.modelSchema?.protocolKey || 'openai-chat'
    const generator = getCodeGenerator(view, useFormData, streaming, protocolKey)

    const requestParams = requestPreviewBody.value

    return generator ? generator(modelName, requestParams, endpoint, apiKey, baseUrl) : ''
  }

  const currentCodeExample = computed(() => buildCodeExample(inputView.value))
  const javascriptCodeExample = computed(() => buildCodeExample('javascript'))
  const curlCodeExample = computed(() => buildCodeExample('curl'))

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code)
      window.$message?.success('已复制到剪贴板')
    } catch (e) {
      console.error('Copy failed:', e)
      window.$message?.error('复制失败')
    }
  }

  const handleInputViewChange = (key) => {
    inputView.value = key
  }

  return {
    inputView,
    inputViewOptions,
    currentInputViewLabel,
    currentInputViewIcon,
    isCodeView,
    inputJsonCode,
    requestPreviewBody,
    requestPreviewTransport,
    currentLanguage,
    highlightedJsonCode,
    highlightedCodeExample,
    currentCodeExample,
    javascriptCodeExample,
    curlCodeExample,
    copyCode,
    handleInputViewChange
  }
}
