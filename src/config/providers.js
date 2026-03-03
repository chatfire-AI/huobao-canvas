/**
 * API Provider Adapters | API 渠道适配器
 * 适配不同 API 提供商的请求参数和响应格式
 */

// 渠道适配配置
export const PROVIDERS = {
  chatfire: {
    label: '火宝 (Chatfire)',
    defaultBaseUrl: 'https://api.chatfire.site',
    // 端点路径
    endpoints: {
      chat: '/chat/completions',
      image: '/v1/images/generations',
      video: '/v1/video/generations',
      videoQuery: '/v1/videos/{taskId}'
    },
    // 火宝渠道请求适配
    requestAdapter: {
      chat: (params) => {
        const adapted = {
          model: params.model,
          messages: params.messages
        }
        if (params.temperature !== undefined) adapted.temperature = params.temperature
        if (params.max_tokens !== undefined) adapted.max_tokens = params.max_tokens
        if (params.stream !== undefined) adapted.stream = params.stream
        return adapted
      },
      image: (params) => {
        const adapted = {
          model: params.model,
          prompt: params.prompt
        }
        if (params.size) adapted.size = params.size
        if (params.n) adapted.n = params.n
        if (params.quality) adapted.quality = params.quality
        if (params.style) adapted.style = params.style
        if (params.image) adapted.image = params.image
        return adapted
      },
      video: (params) => {
        const model = params.model || ''

        // Seedance 模型 - 使用 content 数组格式
        if (model.includes('seedance')) {
          const content = []

          // 构建完整参数文本
          // 格式: prompt --resolution 720p --ratio 16:9 --dur 5 --fps 24 --wm true --seed 11 --cf false
          let textPrompt = params.prompt || ''

          // 添加 resolution 参数
          if (params.resolution) {
            textPrompt += ` --resolution ${params.resolution}`
          }

          // 添加 ratio 参数 (图生视频用 16:9)
          if (params.size) {
            textPrompt += ` --ratio ${params.size}`
          }

          // 添加 duration 参数
          if (params.seconds) {
            textPrompt += ` --dur ${params.seconds}`
          }

          // 添加 fps (固定 24)
          textPrompt += ` --fps 24`

          // 添加水印参数 (默认 true)
          textPrompt += ` --wm ${params.wm !== false ? 'true' : 'false'}`

          // 添加 seed 参数 (可选)
          if (params.seed !== undefined) {
            textPrompt += ` --seed ${params.seed}`
          }

          // 添加 cf 参数 (默认 false)
          textPrompt += ` --cf ${params.cf === true ? 'true' : 'false'}`

          content.push({
            type: 'text',
            text: textPrompt
          })

          // 添加参考图（如果有）
          if (params.first_frame_image) {
            content.push({
              type: 'image_url',
              image_url: {
                url: params.first_frame_image
              }
            })
          }

          const adapted = {
            model: model,
            content: content,
            generate_audio: params.generateAudio !== false
          }

          return adapted
        }

        // Kling 模型 - 使用 kling 特定格式
        if (model.includes('kling')) {
          // 将 ratio 转换为 aspect_ratio 格式
          const ratioMap = {
            '16:9': '16:9',
            '9:16': '9:16',
            '1:1': '1:1',
            '4:3': '4:3',
            '3:4': '3:4'
          }

          const adapted = {
            model_name: model,
            mode: 'std',
            prompt: params.prompt || '',
            aspect_ratio: ratioMap[params.size] || '16:9',
            duration: params.seconds || 5,
            negative_prompt: '',
            cfg_scale: 0.5
          }

          // 添加参考图（如果有）
          if (params.first_frame_image) {
            adapted.image = params.first_frame_image
          }

          return adapted
        }

        // 默认格式（veo 等）
        const adapted = {
          model: params.model,
          prompt: params.prompt || ''
        }
        if (params.first_frame_image) adapted.first_frame_image = params.first_frame_image
        if (params.last_frame_image) adapted.last_frame_image = params.last_frame_image
        if (params.size) adapted.size = params.size
        if (params.seconds) adapted.seconds = params.seconds

        return adapted
      }
    },
    // 火宝渠道响应格式
    responseAdapter: {
      chat: (response) => {
        if (response.choices && response.choices.length > 0) {
          return response.choices[0].message?.content || ''
        }
        return ''
      },
      image: (response) => {
        const data = response.data || response
        return (Array.isArray(data) ? data : [data]).map(item => ({
          url: item.url || item.b64_json || '',
          revisedPrompt: item.revised_prompt || ''
        }))
      },
      video: (response) => {
        return {
          url: response.data?.url || response.url || response.data?.[0]?.url || '',
          ...response
        }
      }
    }
  },
  openai: {
    label: 'OpenAI',
    defaultBaseUrl: 'https://api.chatfire.cn',
    // 端点路径
    endpoints: {
      chat: '/chat/completions',
      image: '/v1/images/generations',
      video: '/v1/videos',
      videoQuery: '/v1/videos/{taskId}'
    },
    // 请求参数适配
    requestAdapter: {
      chat: (params) => {
        const adapted = {
          model: params.model,
          messages: params.messages
        }
        // 添加可选参数
        if (params.temperature !== undefined) adapted.temperature = params.temperature
        if (params.max_tokens !== undefined) adapted.max_tokens = params.max_tokens
        if (params.stream !== undefined) adapted.stream = params.stream
        return adapted
      },
      image: (params) => {
        const adapted = {
          model: params.model,
          prompt: params.prompt
        }
        if (params.size) adapted.size = params.size
        if (params.n) adapted.n = params.n
        if (params.quality) adapted.quality = params.quality
        if (params.style) adapted.style = params.style
        if (params.image) adapted.image = params.image
        return adapted
      },
      video: (params) => {
        const adapted = {
          model: params.model,
          prompt: params.prompt || ''
        }
        if (params.first_frame_image) adapted.first_frame_image = params.first_frame_image
        if (params.last_frame_image) adapted.last_frame_image = params.last_frame_image
        if (params.size) adapted.size = params.size
        if (params.seconds) adapted.seconds = params.seconds
        return adapted
      }
    },
    // 响应数据适配
    responseAdapter: {
      chat: (response) => {
        if (response.choices && response.choices.length > 0) {
          return response.choices[0].message?.content || ''
        }
        return ''
      },
      image: (response) => {
        const data = response.data || response
        return (Array.isArray(data) ? data : [data]).map(item => ({
          url: item.url || item.b64_json || '',
          revisedPrompt: item.revised_prompt || ''
        }))
      },
      video: (response) => {
        return {
          url: response.data?.url || response.url || response.data?.[0]?.url || '',
          ...response
        }
      }
    }
  },

  

  // 默认使用 OpenAI 格式
  default: 'chatfire'
}

// 获取渠道列表
export const getProviderList = () => {
  return Object.entries(PROVIDERS)
    .filter(([key]) => key !== 'default')
    .map(([key, value]) => ({
      key,
      label: value.label
    }))
}

// 获取默认渠道
export const getDefaultProvider = () => {
  return PROVIDERS.default || 'chatfire'
}

// 获取渠道的默认 Base URL
export const getDefaultBaseUrl = (providerKey) => {
  const config = getProviderConfig(providerKey)
  return config.defaultBaseUrl || ''
}

// 获取渠道配置
export const getProviderConfig = (providerKey) => {
  return PROVIDERS[providerKey] || PROVIDERS[PROVIDERS.default]
}
