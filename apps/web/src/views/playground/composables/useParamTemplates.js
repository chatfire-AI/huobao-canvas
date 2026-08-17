import { ref } from 'vue'

const STORAGE_KEY = 'playground_param_templates'

export function useParamTemplates() {
  const templates = ref(loadFromStorage())

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(templates.value))
    } catch (e) {
      console.error('Save templates error:', e)
    }
  }

  function addTemplate({ name, modelName, endpoint, params }) {
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name,
      modelName,
      endpoint,
      params: JSON.parse(JSON.stringify(params)),
      createdAt: Date.now()
    }
    templates.value.unshift(entry)
    saveToStorage()
    return entry
  }

  function removeTemplate(id) {
    templates.value = templates.value.filter(t => t.id !== id)
    saveToStorage()
  }

  function getTemplatesForModel(modelName) {
    if (!modelName) return templates.value
    return templates.value.filter(t => t.modelName === modelName)
  }

  return {
    templates,
    addTemplate,
    removeTemplate,
    getTemplatesForModel
  }
}
