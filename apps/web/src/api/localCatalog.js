/**
 * 本地模型目录源（官方直连模式默认）
 *
 * 数据源 = 厂商预设（config/providers）+ 用户覆盖（localStorage chatfire_canvas_catalog）：
 *   { disabledModels: [], hiddenProviders: [], customModels: [] }
 * 输出结构与主仓 /sys/model/* 同构，供 usePlaygroundModel 无感消费。
 */
import { providerPresets, collectModels } from '@/config/providers'

const CATALOG_STORAGE = 'chatfire_canvas_catalog'

export const MODEL_TYPE_MAP = { '1': '对话', '2': '图片', '3': '视频' }

export const readCatalogOverrides = () => {
  try {
    return JSON.parse(window.localStorage.getItem(CATALOG_STORAGE)) || {}
  } catch {
    return {}
  }
}

export const writeCatalogOverrides = (overrides) => {
  window.localStorage.setItem(CATALOG_STORAGE, JSON.stringify(overrides || {}))
}

/** 等价于 getModelTypes()：{ "1": "对话", ... } */
export const getLocalModelTypes = () => ({ ...MODEL_TYPE_MAP })

/**
 * 合成 allCategory：[{ name, type, factories: [{ name, models }] }]
 * 与 usePlaygroundModel.loadCategoryData 的输出结构一致。
 */
export const getLocalCategoryData = () => {
  const overrides = readCatalogOverrides()
  const models = collectModels(overrides)
  const categories = []
  for (const [type, label] of Object.entries(MODEL_TYPE_MAP)) {
    const typeModels = models.filter((m) =>
      String(m.type || '').split(',').map((t) => t.trim()).includes(type))
    if (!typeModels.length) continue
    const factoryMap = {}
    for (const m of typeModels) {
      const factory = m.factory || '其他'
      ;(factoryMap[factory] = factoryMap[factory] || []).push(m)
    }
    categories.push({
      name: label,
      type,
      factories: Object.entries(factoryMap).map(([name, list]) => ({
        name,
        models: list.sort((a, b) => String(b.launchTime || '').localeCompare(String(a.launchTime || ''))),
      })),
    })
  }
  return categories
}

/** 等价于 getModelByName / getModelByFullName */
export const getLocalModel = (nameOrFullName) => {
  const models = collectModels(readCatalogOverrides())
  return models.find((m) => m.name === nameOrFullName)
    || models.find((m) => m.fullName === nameOrFullName)
    || null
}

/** 覆盖操作（设置页模型管理用） */
export const setModelDisabled = (name, disabled) => {
  const o = readCatalogOverrides()
  const list = new Set(o.disabledModels || [])
  disabled ? list.add(name) : list.delete(name)
  o.disabledModels = [...list]
  writeCatalogOverrides(o)
}

export const setProviderHidden = (providerId, hidden) => {
  const o = readCatalogOverrides()
  const list = new Set(o.hiddenProviders || [])
  hidden ? list.add(providerId) : list.delete(providerId)
  o.hiddenProviders = [...list]
  writeCatalogOverrides(o)
}

/** 自定义模型：存完整 ModelRecord（name 冲突时覆盖同名） */
export const upsertCustomModel = (record) => {
  const o = readCatalogOverrides()
  const customs = (o.customModels || []).filter((m) => m.name !== record.name)
  customs.push({ ...record, source: 'custom', enable: true })
  o.customModels = customs
  writeCatalogOverrides(o)
}

export const removeCustomModel = (name) => {
  const o = readCatalogOverrides()
  o.customModels = (o.customModels || []).filter((m) => m.name !== name)
  writeCatalogOverrides(o)
}

export const listCustomModels = () => readCatalogOverrides().customModels || []
