/**
 * 模型定价展示与费用估算(演武场侧)。
 * 价格语义:separated+token = 元/1M tokens;unified+image = 元/张;unified+call = 元/次;
 * specs(视频按秒等)过于复杂,不在前端估算。
 */

function toNumber(value) {
  if (value == null) return null
  const n = typeof value === 'number' ? value : parseFloat(value)
  return Number.isFinite(n) ? n : null
}

/** 金额格式化:去掉尾随零,小金额保留更多精度 */
export function formatMoney(value) {
  if (value == null) return ''
  const n = toNumber(value)
  if (n == null) return ''
  let s
  if (n < 0.001) s = n.toFixed(6)
  else if (n < 0.1) s = n.toFixed(4)
  else s = n.toFixed(2)
  s = s.replace(/\.?0+$/, '')
  return s || '0'
}

const UNIT_LABELS = { image: '张', call: '次', second: '秒', token: '1M tokens' }

/** 侧边栏/列表用的短价格文案:如 "¥3.2/¥16"、"¥0.28/张"、"按规格计费" */
export function shortPriceText(model) {
  if (!model) return ''
  const type = String(model.billingType || '').toLowerCase()
  const unit = String(model.priceUnit || '').toLowerCase()

  if (type === 'separated') {
    const parts = []
    if (toNumber(model.inputPrice) != null) parts.push(`¥${formatMoney(model.inputPrice)}`)
    if (toNumber(model.outputPrice) != null) parts.push(`¥${formatMoney(model.outputPrice)}`)
    return parts.length ? `${parts.join('/')}/${UNIT_LABELS[unit] || ''}` : ''
  }
  if (type === 'unified') {
    const price = toNumber(model.price)
    if (price == null) return ''
    const unitLabel = UNIT_LABELS[unit]
    return unitLabel ? `¥${formatMoney(price)}/${unitLabel}` : `¥${formatMoney(price)}`
  }
  if (type === 'specs') return '按规格计费'
  return ''
}

/**
 * 估算本次运行费用(展示为"预估",实际计费以后端为准,含用户折扣)。
 * @param {Object} modelData 模型数据(含 price/inputPrice/outputPrice/priceUnit/billingType)
 * @param {Object|null} usage 响应 usage(prompt_tokens/completion_tokens)
 * @param {number} resultCount 生成产物数量(图片张数等)
 * @returns {number|null} 估算金额(元);无法可靠估算时返回 null
 */
export function estimateRunCost(modelData, usage, resultCount = 0) {
  if (!modelData) return null
  const type = String(modelData.billingType || '').toLowerCase()
  const unit = String(modelData.priceUnit || '').toLowerCase()

  // 按张/按次统一价:price × 数量
  if (type === 'unified' && (unit === 'image' || unit === 'call')) {
    const price = toNumber(modelData.price)
    if (price == null) return null
    return price * Math.max(1, resultCount || 1)
  }

  // token 分离计价:输入/输出 token 按 1M 计价
  if (type === 'separated' && unit === 'token' && usage) {
    const input = toNumber(usage.prompt_tokens ?? usage.input_tokens)
    const output = toNumber(usage.completion_tokens ?? usage.output_tokens)
    const inPrice = toNumber(modelData.inputPrice)
    const outPrice = toNumber(modelData.outputPrice)
    if ((input != null || output != null) && (inPrice != null || outPrice != null)) {
      return ((input || 0) / 1_000_000) * (inPrice || 0)
        + ((output || 0) / 1_000_000) * (outPrice || 0)
    }
  }

  return null
}
