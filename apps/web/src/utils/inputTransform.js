/**
 * inputTransform 模板引擎（纯函数，浏览器与 Node 服务端共用）
 *
 * 从 usePlaygroundSchema 抽出，语义不变：把扁平表单 formData 重组为厂商请求体。
 *  - '$${field}'            单值替换（保留原始类型：布尔/数字/字符串/File）
 *  - '@conditional'         数组项/对象键的条件保留（字段有值才下发）
 *  - '@value'               条件对象的取值体
 *  - 'image[0]'             数组下标取值
 * 剔空语义：空串/空数组/全空的嵌套对象不下发（厂商严格校验会 400）。
 * 禁止引入 DOM / vue 依赖（apps/server/engine.js 会直接 import）。
 */

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key)

export const createInputTransformEngine = () => {
  const getValue = (data, fieldPath) => {
    const match = fieldPath.match(/^(\w+)\[(\d+)\]$/)
    if (match) {
      const [, arrayKey, index] = match
      const arr = data[arrayKey]
      if (Array.isArray(arr)) {
        return arr[parseInt(index)]
      }
      return undefined
    }
    return data[fieldPath]
  }

  const hasValue = (data, fieldPath) => {
    const value = getValue(data, fieldPath)
    if (value === undefined || value === null || value === '') return false
    if (Array.isArray(value) && value.length === 0) return false
    return true
  }

  const replaceTemplate = (transform, data) => {
    if (typeof transform === 'string') {
      const singleMatch = transform.match(/^\$\$\{([\w\[\]]+)\}$/)
      if (singleMatch) {
        const value = getValue(data, singleMatch[1])
        if (value instanceof File) return value
        return value !== undefined && value !== '' ? value : ''
      }
      return transform.replace(/\$\$\{([\w\[\]]+)\}/g, (match, fieldPath) => {
        const value = getValue(data, fieldPath)
        if (value instanceof File) return ''
        return value !== undefined && value !== '' ? value : ''
      })
    }
    if (Array.isArray(transform)) {
      const result = []
      for (const item of transform) {
        if (typeof item === 'object' && item !== null && !(item instanceof File) && item['@conditional']) {
          const condField = item['@conditional']
          if (hasValue(data, condField)) {
            const newItem = { ...item }
            delete newItem['@conditional']
            result.push(replaceTemplate(newItem, data))
          }
        } else {
          const processed = replaceTemplate(item, data)
          if (processed instanceof File) {
            result.push(processed)
          } else if (typeof processed === 'string') {
            if (processed !== '') result.push(processed)
          } else {
            result.push(processed)
          }
        }
      }
      return result
    }
    if (typeof transform === 'object' && transform !== null) {
      if (hasOwn(transform, '@value')) {
        return replaceTemplate(transform['@value'], data)
      }
      const result = {}
      for (const [key, value] of Object.entries(transform)) {
        if (key === '@value' || key === '@conditional') continue
        if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof File) && value['@conditional'] && hasOwn(value, '@value')) {
          if (!hasValue(data, value['@conditional'])) continue
          const nextValue = { ...value }
          delete nextValue['@conditional']
          const processedConditional = replaceTemplate(nextValue, data)
          if (processedConditional === '' || processedConditional === undefined || processedConditional === null) continue
          result[key] = processedConditional
          continue
        }
        const processed = replaceTemplate(value, data)
        if (Array.isArray(processed) && processed.length === 0) {
          continue
        }
        if (processed === '' || processed === undefined || processed === null) {
          continue
        }
        result[key] = processed
      }
      // 全部子键被剔除的空包装对象（如 video:{url} 无源视频）整体剔除，
      // 避免下发 video:{} 这类空对象残壳被厂商 400
      if (Object.keys(result).length === 0 && Object.keys(transform).some((k) => k !== '@conditional')) {
        return ''
      }
      return result
    }
    return transform
  }

  return (transform, data) => {
    if (!transform) return data
    const transformed = replaceTemplate(transform, data)
    return transformed === '' ? {} : transformed
  }
}

/** 按点路径取嵌套值（与画布/演武场的 getNestedValue 同语义） */
export const getNestedValue = (obj, path) => {
  if (!obj || !path) return obj
  const paths = path.split('.')
  let value = obj
  for (const p of paths) {
    value = value?.[p]
  }
  return value
}
