/**
 * Models Configuration | 模型配置
 * Centralized model configuration | 集中模型配置
 */

// Seedream image size options | 豆包图片尺寸选项
export const SEEDREAM_SIZE_OPTIONS = [
    { label: '21:9', key: '3024x1296' },
    { label: '16:9', key: '2560x1440' },
    { label: '4:3', key: '2304x1728' },
    { label: '3:2', key: '2496x1664' },
    { label: '1:1', key: '2048x2048' },
    { label: '2:3', key: '1664x2496' },
    { label: '3:4', key: '1728x2304' },
    { label: '9:16', key: '1440x2560' },
    { label: '9:21', key: '1296x3024' }
]

// Seedream 4K image size options | 豆包4K图片尺寸选项
export const SEEDREAM_4K_SIZE_OPTIONS = [
    { label: '21:9', key: '6198x2656' },
    { label: '16:9', key: '5404x3040' },
    { label: '4:3', key: '4694x3520' },
    { label: '3:2', key: '4992x3328' },
    { label: '1:1', key: '4096x4096' },
    { label: '2:3', key: '3328x4992' },
    { label: '3:4', key: '3520x4694' },
    { label: '9:16', key: '3040x5404' },
    { label: '9:21', key: '2656x6198' }
]

// Seedream quality options | 豆包画质选项
export const SEEDREAM_QUALITY_OPTIONS = [
    { label: '标准画质', key: 'standard' },
    { label: '4K 高清', key: '4k' }
]

export const BANANA_SIZE_OPTIONS = [
    { label: '16:9', key: '16x9' },
    { label: '4:3', key: '4x3' },
    { label: '3:2', key: '3x2' },
    { label: '1:1', key: '1x1' },
    { label: '2:3', key: '2x3' },
    { label: '3:4', key: '3x4' },
    { label: '9:16', key: '9x16' },
]

// Image generation models | 图片生成模型
export const IMAGE_MODELS = [
    {
        label: 'Nano Banana Pro',
        key: 'nano-banana-pro',
        provider: ['chatfire'], // 火宝渠道
        sizes: BANANA_SIZE_OPTIONS.map(s => s.key),
        // qualities: SEEDREAM_QUALITY_OPTIONS,
        // getSizesByQuality: (quality) => quality === '4k' ? SEEDREAM_4K_SIZE_OPTIONS : SEEDREAM_SIZE_OPTIONS,
        defaultParams: {
            size: '1x1',
            quality: 'standard',
            style: 'vivid'
        }
    },
    {
        label: '豆包 Seedream 4.5',
        key: 'doubao-seedream-4-5-251128',
        provider: ['chatfire'], // 火宝渠道
        sizes: SEEDREAM_SIZE_OPTIONS.map(s => s.key),
        qualities: SEEDREAM_QUALITY_OPTIONS,
        getSizesByQuality: (quality) => quality === '4k' ? SEEDREAM_4K_SIZE_OPTIONS : SEEDREAM_SIZE_OPTIONS,
        defaultParams: {
            size: '2048x2048',
            quality: 'standard',
            style: 'vivid'
        }
    },
    {
        label: 'Nano Banana',
        key: 'nano-banana',
        provider: ['chatfire'], // 火宝渠道
        tips: '尺寸写在提示词中: 尺寸 9:16',
        sizes: [],
        defaultParams: {
            quality: 'standard',
            style: 'vivid'
        }
    },

]

// Video ratio options | 视频比例选项
export const VIDEO_RATIO_LIST = [
    { label: '16:9 (横版)', key: '16x9' },
    { label: '4:3', key: '4x3' },
    { label: '1:1 (方形)', key: '1x1' },
    { label: '3:4', key: '3x4' },
    { label: '9:16 (竖版)', key: '9x16' }
]

// Video resolution options for Seedance | Seedance 分辨率选项
export const SEEDANCE_RESOLUTION_OPTIONS = [
    { label: '480p', key: '480p' },
    { label: '720p', key: '720p' },
    { label: '1080p', key: '1080p' }
]

// Video generation models | 视频生成模型
export const VIDEO_MODELS = [
     // Seedance 模型 - 1.5 Pro
    {
        label: 'Seedance 1.5 Pro (图文视频)',
        key: 'doubao-seedance-1-5-pro-251215',
        provider: ['chatfire'],
        type: 't2v+i2v',
        ratios: ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9'],
        durs: [{ label: '5 秒', key: 5 }, { label: '10 秒', key: 10 }],
        resolutions: ['480p', '720p', '1080p'],
        defaultResolution: '1080p',
        defaultParams: { ratio: '16:9', duration: 10, resolution: '1080p' }
    },
    // Seedance 模型 - 文生视频
    {
        label: 'Seedance 1.0 Lite (文生视频)',
        key: 'doubao-seedance-1-0-lite-t2v-250428',
        provider: ['chatfire'],
        type: 't2v', // 文生视频
        ratios: ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9'],
        durs: [{ label: '5 秒', key: 5 }, { label: '10 秒', key: 10 }],
        resolutions: ['480p', '720p', '1080p'],
        defaultResolution: '720p',
        defaultParams: { ratio: '16:9', duration: 5, resolution: '720p' }
    },
    // Seedance 模型 - 图生视频
    {
        label: 'Seedance 1.0 Lite (图生视频)',
        key: 'doubao-seedance-1-0-lite-i2v-250428',
        provider: ['chatfire'],
        type: 'i2v', // 图生视频
        ratios: ['16:9'],
        durs: [{ label: '5 秒', key: 5 }, { label: '10 秒', key: 10 }],
        resolutions: ['480p', '720p', '1080p'],
        defaultResolution: '720p',
        defaultParams: { ratio: '16:9', duration: 5, resolution: '720p' }
    },
    // Seedance 模型 - 图文视频 Pro
    {
        label: 'Seedance 1.0 Pro (图文视频)',
        key: 'doubao-seedance-1-0-pro-250528',
        provider: ['chatfire'],
        type: 't2v+i2v', // 图文视频
        ratios: ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9', '16:9'],
        durs: [{ label: '5 秒', key: 5 }, { label: '10 秒', key: 10 }],
        resolutions: ['480p', '720p', '1080p'],
        defaultResolution: '1080p',
        defaultParams: { ratio: '16:9', duration: 5, resolution: '1080p' }
    },
   
    // Seedance 模型 - 1.0 Pro Fast
    {
        label: 'Seedance 1.0 Pro Fast (图文视频)',
        key: 'doubao-seedance-1-0-pro-fast-251015',
        provider: ['chatfire'],
        type: 't2v+i2v',
        ratios: ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9'],
        durs: [{ label: '5 秒', key: 5 }, { label: '10 秒', key: 10 }],
        resolutions: ['480p', '720p', '1080p'],
        defaultResolution: '1080p',
        defaultParams: { ratio: '16:9', duration: 5, resolution: '1080p' }
    },
    // 可灵 Kling
    // {
    //     label: '可灵 Kling v2.5-turbo',
    //     key: 'kling-v2-1',
    //     provider: ['chatfire'], // 仅火宝渠道
    //     ratios: VIDEO_RATIO_LIST.map(s => s.key),
    //     durs: [{ label: '5 秒', key: 5 }, { label: '10 秒', key: 10 }],
    //     defaultParams: { ratio: '9:16', duration: 10 }
    // },
    // {
    //     label: 'runway/gen4-turbo',
    //     key: 'runway/gen4-turbo',
    //     ratios: VIDEO_RATIO_LIST.map(s => s.key),
    //     durs: [{ label: '5 秒', key: 5 }, { label: '10 秒', key: 10 }],
    //     defaultParams: { ratio: '16:9', duration: 5 }
    // },
    // {
    //     label: '可灵视频 O1',
    //     key: 'kling-video-o1',
    //     ratios: VIDEO_RATIO_LIST.map(s => s.key),
    //     durs: [{ label: '5 秒', key: 5 }, { label: '10 秒', key: 10 }],
    //     defaultParams: { ratio: '16:9', duration: 5 }
    // },
    // {
    //     label: 'viduq2-pro_720p', key: 'viduq2-pro_720p',
    //     ratios: VIDEO_RATIO_LIST.map(s => s.key),
    //     durs: [{ label: '5 秒', key: 5 }, { label: '10 秒', key: 10 }],
    //     defaultParams: { ratio: '16:9', duration: 5 }
    // },
    // {
    //     label: 'Sora 2', key: 'sora-2',
    //     ratios: VIDEO_RATIO_LIST.map(s => s.key),
    //     durs: [{ label: '5 秒', key: 5 }, { label: '10 秒', key: 10 }],
    //     defaultParams: { ratio: '16:9', duration: 5 }
    // }
]

// Chat/LLM models | 对话模型
export const CHAT_MODELS = [
    { label: 'GPT-4o Mini', key: 'gpt-4o-mini', provider: ['openai'] },
    { label: 'GPT-4o', key: 'gpt-4o', provider: ['openai'] },
    { label: 'GPT-5.2', key: 'gpt-5.2', provider: ['openai'] },
    { label: 'DeepSeek Chat', key: 'deepseek-chat', provider: ['openai', 'chatfire'] },
    { label: '豆包 Seed Flash', key: 'doubao-seed-1-6-flash-250615', provider: ['chatfire'] },
    { label: 'Gemini 3 Pro', key: 'gemini-3-pro', provider: ['openai'] }
]

// Image size options | 图片尺寸选项
export const IMAGE_SIZE_OPTIONS = [
    { label: '2048x2048', key: '2048x2048' },
    { label: '1792x1024 (横版)', key: '1792x1024' },
    { label: '1024x1792 (竖版)', key: '1024x1792' }
]

// Image quality options | 图片质量选项
export const IMAGE_QUALITY_OPTIONS = [
    { label: '标准', key: 'standard' },
    { label: '高清', key: 'hd' }
]

// Image style options | 图片风格选项
export const IMAGE_STYLE_OPTIONS = [
    { label: '生动', key: 'vivid' },
    { label: '自然', key: 'natural' }
]

// Video ratio options | 视频比例选项
export const VIDEO_RATIO_OPTIONS = VIDEO_RATIO_LIST

// Video duration options | 视频时长选项
export const VIDEO_DURATION_OPTIONS = [
    { label: '5 秒', key: 5 },
    { label: '10 秒', key: 10 }
]

// Default values | 默认值
export const DEFAULT_IMAGE_MODEL = 'nano-banana-pro'
export const DEFAULT_VIDEO_MODEL = 'doubao-seedance-1-5-pro-251215'
export const DEFAULT_CHAT_MODEL = 'gpt-4o-mini'
export const DEFAULT_IMAGE_SIZE = '2048x2048'
export const DEFAULT_VIDEO_RATIO = '16:9'
export const DEFAULT_VIDEO_DURATION = 5

// Get model by key | 根据 key 获取模型
export const getModelByName = (key) => {
    const allModels = [...IMAGE_MODELS, ...VIDEO_MODELS, ...CHAT_MODELS]
    return allModels.find(m => m.key === key)
}
