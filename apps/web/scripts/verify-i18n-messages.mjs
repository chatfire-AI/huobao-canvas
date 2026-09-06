/**
 * 语言包回归校验：用真实 vue-i18n 实例对四语种全部 key 逐一 t()。
 *
 * 复刻浏览器运行时编译路径（message-compiler 语法校验）：裸 `@`（链接消息保留字）、
 * 未闭合 `{`、非法插值等会在此直接抛错——此前「文案语法非法 → 组件渲染中断」的
 * 线上问题（promptDock 的 @ 引用提示）就是这条路径漏进来的。
 *
 * 用法：node scripts/verify-i18n-messages.mjs（pnpm test 一并执行）
 */
import { createI18n } from 'vue-i18n'
import zhCN from '../src/locales/zh-CN/index.js'
import en from '../src/locales/en/index.js'
import ja from '../src/locales/ja/index.js'
import ko from '../src/locales/ko/index.js'

const LOCALES = { 'zh-CN': zhCN, en, ja, ko }
const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  fallbackLocale: 'zh-CN',
  messages: LOCALES,
  missingWarn: false,
  warnHtmlMessage: false,
})

const flatten = (obj, prefix = '') => Object.entries(obj).flatMap(([key, value]) => (
  typeof value === 'string' ? [`${prefix}${key}`] : flatten(value, `${prefix}${key}.`)
))

let bad = 0
for (const [locale, tree] of Object.entries(LOCALES)) {
  i18n.global.locale.value = locale
  for (const key of flatten(tree)) {
    try {
      i18n.global.t(key)
    } catch (error) {
      bad += 1
      console.error(`[${locale}] ${key} → ${String(error.message).split('\n')[0]}`)
    }
  }
}

if (bad) {
  console.error(`\n共 ${bad} 条语法非法文案（@ 用 {'@'} 转义，插值占位 {name}）`)
  process.exit(1)
}
console.log(`四语种消息编译通过（${Object.values(LOCALES).reduce((n, t) => n + flatten(t).length, 0)} 条）`)
