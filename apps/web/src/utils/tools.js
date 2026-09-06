// 图标托管在前端本地 public/icons 下（原 CDN ffile.chatfire.site 已停用（域名现归属 firemux.com））
// dark / light 两套主题变体（清单一致），默认按 <html class="dark"> 现状解析
const iconBaseUrl = (theme) => `${import.meta.env.BASE_URL}icons/${theme === 'light' ? 'light' : 'dark'}/`
// 历史数据可能存的是旧 CDN 完整 URL，统一提取文件名走本地
const LEGACY_CDN_PATTERN = /^https?:\/\/[^/]+\/cf\/chatfire-media\/icon\/(?:dark|light)\//

const currentIconTheme = () => (
  typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
    ? 'dark' : 'light'
)

/**
 * 复制文本到剪贴板
 * 优先使用 Clipboard API（需 HTTPS/localhost），降级到 execCommand
 */
export const copyText = (text) => {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text)
  }
  return new Promise((resolve, reject) => {
    const el = document.createElement('textarea')
    el.value = text
    el.style.cssText = 'position:fixed;opacity:0;pointer-events:none'
    document.body.appendChild(el)
    el.focus()
    el.select()
    try {
      document.execCommand('copy') ? resolve() : reject(new Error('execCommand failed'))
    } catch (e) {
      reject(e)
    } finally {
      document.body.removeChild(el)
    }
  })
}

/**
 * 解析模型图标 URL
 * theme：'dark' | 'light'，缺省读 <html class> 现状；
 * 模板里需要跟随主题切换时应显式传入响应式值（如 isDark.value ? 'dark' : 'light'）。
 * 支持三种格式：
 *   1. 纯文件名：openai.png → 拼接本地对应主题图标前缀
 *   2. 完整 URL：旧 CDN 地址 → 提取文件名走本地；其他外链 → 原样返回
 *   3. 空值：返回 ''
 */
export const resolveModelIcon = (icon, theme) => {
  if (!icon) return ''
  const base = iconBaseUrl(theme || currentIconTheme())
  if (LEGACY_CDN_PATTERN.test(icon)) {
    return base + icon.replace(LEGACY_CDN_PATTERN, '')
  }
  if (icon.startsWith('http://') || icon.startsWith('https://')) {
    return icon
  }
  return base + icon
}

export const map2list = (map) => {
  return Object.entries(map).map(([key, value]) => ({
    label: value,
    value: key,
  }));
}; 
