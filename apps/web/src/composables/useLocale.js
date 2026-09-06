import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { zhCN, dateZhCN, enUS, dateEnUS, koKR, dateKoKR, jaJP, dateJaJP } from 'naive-ui'
import { i18n, LOCALE_STORAGE_KEY } from '@/locales'

const NAIVE_LOCALES = {
  'zh-CN': { locale: zhCN, dateLocale: dateZhCN },
  en: { locale: enUS, dateLocale: dateEnUS },
  ko: { locale: koKR, dateLocale: dateKoKR },
  ja: { locale: jaJP, dateLocale: dateJaJP },
}

const availableLocales = [
  { key: 'zh-CN', label: '简体中文' },
  { key: 'en', label: 'English' },
  { key: 'ko', label: '한국어' },
  { key: 'ja', label: '日本語' },
]

// 共享的语言状态（vue-i18n 全局 composer 即单例，所有 useLocale() 调用共享）
export function useLocale() {
  const { locale } = useI18n()

  const naiveLocale = computed(() => NAIVE_LOCALES[locale.value]?.locale ?? zhCN)
  const naiveDateLocale = computed(() => NAIVE_LOCALES[locale.value]?.dateLocale ?? dateZhCN)
  const currentLocaleLabel = computed(
    () => availableLocales.find((l) => l.key === locale.value)?.label ?? locale.value
  )

  const setLocale = (target) => {
    locale.value = target
    localStorage.setItem(LOCALE_STORAGE_KEY, target)
    document.documentElement.setAttribute('lang', target)
  }

  return { locale, setLocale, availableLocales, currentLocaleLabel, naiveLocale, naiveDateLocale }
}

// 启动时同步一次 <html lang>（初始语言来自浏览器探测/localStorage）
document.documentElement.setAttribute('lang', i18n.global.locale.value)
