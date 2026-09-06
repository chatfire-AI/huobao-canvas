import { createI18n } from 'vue-i18n'
import zhCN from './zh-CN/index.js'
import en from './en/index.js'
import ja from './ja/index.js'
import ko from './ko/index.js'

export const LOCALE_STORAGE_KEY = 'huobao-locale'

export const SUPPORTED_LOCALES = ['zh-CN', 'en', 'ko', 'ja']

function detectLocale() {
  // Node 安全：providers 配置会被 apps/server 引擎直接 import（无浏览器全局）
  const saved = globalThis.localStorage?.getItem(LOCALE_STORAGE_KEY)
  if (SUPPORTED_LOCALES.includes(saved)) return saved
  const lang = globalThis.navigator?.language?.toLowerCase() ?? ''
  if (lang.startsWith('zh')) return 'zh-CN'
  if (lang.startsWith('ko')) return 'ko'
  if (lang.startsWith('ja')) return 'ja'
  return 'en'
}

// 导出 i18n 实例：纯 JS 模块（utils/composables/constants）通过 i18n.global.t 取文案
export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: detectLocale(),
  fallbackLocale: 'zh-CN',
  messages: { 'zh-CN': zhCN, en, ko, ja },
})

export default i18n
