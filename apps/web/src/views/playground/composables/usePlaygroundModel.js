import { ref, computed } from 'vue'
import { getModelByName, getModelByFullName, getModelTypes, getModelPage } from '@/api'
import { getLocalCategoryData, getLocalModel } from '@/api/localCatalog'
import { getCatalogMode } from '@/config'
import { map2list } from '@/utils/tools'
import { i18n } from '@/locales'

export function usePlaygroundModel() {
  const modelNames = ref([])
  const selectedModelName = ref('')
  const modelsCache = ref({})
  const allCategory = ref([])
  const cascaderValue = ref(null)
  const showModelDrawer = ref(false)
  const modelSearchQuery = ref('')
  const activeModelType = ref('all')
  const drawerWidth = computed(() => window.innerWidth < 640 ? '100%' : 520)

  const MODEL_TYPE_TAG = {
    '1': { labelKey: 'playground.model.typeChat', type: 'info' },
    '2': { labelKey: 'playground.model.typeImage', type: 'success' },
    '3': { labelKey: 'playground.model.typeVideo', type: 'warning' },
  }

  const modelTypeLabel = (type) => {
    const first = String(type || '').split(',')[0].trim()
    const labelKey = MODEL_TYPE_TAG[first]?.labelKey
    return labelKey ? i18n.global.t(labelKey) : i18n.global.t('playground.model.other')
  }

  const modelTypeTagType = (type) => {
    const first = String(type || '').split(',')[0].trim()
    return MODEL_TYPE_TAG[first]?.type || 'default'
  }

  const filteredModelGroups = computed(() => {
    const query = modelSearchQuery.value.toLowerCase().trim()
    const typeFilter = activeModelType.value

    const factoryMap = {}
    const seen = new Set()
    for (const cat of allCategory.value) {
      if (typeFilter !== 'all' && cat.type !== typeFilter) continue
      for (const factory of cat.factories) {
        for (const model of factory.models) {
          if (query && !model.name.toLowerCase().includes(query)
              && !(model.fullName || '').toLowerCase().includes(query)
              && !(model.factory || '').toLowerCase().includes(query)) continue
          const key = model.factory || i18n.global.t('playground.model.other')
          const dedupKey = `${key}:${model.name}`
          if (seen.has(dedupKey)) continue
          seen.add(dedupKey)
          if (!factoryMap[key]) factoryMap[key] = []
          factoryMap[key].push(model)
        }
      }
    }
    return Object.entries(factoryMap).map(([factory, models]) => ({ factory, models }))
  })

  const loadSingleModel = async (modelName) => {
    if (modelsCache.value[modelName]) {
      return modelsCache.value[modelName]
    }
    // 官方直连模式：目录来自本地预设 + 用户自定义
    if (getCatalogMode() === 'official') {
      const local = getLocalModel(modelName)
      if (local) modelsCache.value[modelName] = local
      return local
    }
    try {
      let res = await getModelByName(modelName)
      if (!res) {
        res = await getModelByFullName(modelName)
      }
      if (res) {
        modelsCache.value[modelName] = res
      }
      return res
    } catch (error) {
      console.error(`Load model ${modelName} error:`, error)
      return null
    }
  }

  const loadCategoryData = async () => {
    if (getCatalogMode() === 'official') {
      allCategory.value = getLocalCategoryData()
      return
    }
    try {
      const [types, modelPageData] = await Promise.all([
        getModelTypes(),
        getModelPage({ size: 1000, current: 1, enable: true })
      ])
      const typesList = map2list(types)
      // 待开启(即将上线)模型只在模型库展示,演武场/画布/对话创作不提供调用入口
      // 按上线时间倒序(无上线时间的按创建时间),使各界面"第一个模型"即最新模型:
      // 演武场落地默认、对话创作各模式 autoPick、画布节点默认均取首位
      const allModels = (modelPageData.records || [])
        .filter(m => !(m.comingSoon && !m.enable))
        .sort((a, b) => {
          const ta = a.launchTime || ''
          const tb = b.launchTime || ''
          if (ta !== tb) return tb.localeCompare(ta)
          return String(b.createTime || '').localeCompare(String(a.createTime || ''))
        })

      const newCategories = []
      for (const type of typesList) {
        const typeModels = allModels.filter(m => String(m.type || '').split(',').map(t => t.trim()).includes(String(type.value)))
        if (typeModels.length > 0) {
          const factoryMap = {}
          typeModels.forEach(model => {
            const factory = model.factory || i18n.global.t('playground.model.other')
            if (!factoryMap[factory]) {
              factoryMap[factory] = []
            }
            factoryMap[factory].push(model)
          })

          const factories = Object.entries(factoryMap).map(([name, models]) => ({
            name,
            models
          }))

          newCategories.push({
            name: type.label,
            type: type.value,
            factories
          })
        }
      }
      allCategory.value = newCategories
    } catch (error) {
      console.error('加载分类数据失败:', error)
    }
  }

  return {
    modelNames,
    selectedModelName,
    modelsCache,
    allCategory,
    cascaderValue,
    showModelDrawer,
    modelSearchQuery,
    activeModelType,
    drawerWidth,
    modelTypeLabel,
    modelTypeTagType,
    filteredModelGroups,
    loadSingleModel,
    loadCategoryData
  }
}
