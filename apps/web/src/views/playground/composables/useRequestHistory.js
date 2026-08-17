import { ref, computed } from 'vue'

const STORAGE_KEY = 'playground_request_history'
const MAX_ITEMS = 50
const MAX_RESULT_SIZE = 10 * 1024 // 10KB

export function useRequestHistory() {
  const historyList = ref(loadFromStorage())

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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(historyList.value))
    } catch (e) {
      console.error('Save history error:', e)
    }
  }

  function truncateResult(result) {
    const str = JSON.stringify(result)
    if (str.length > MAX_RESULT_SIZE) {
      return { _truncated: true, _preview: str.slice(0, MAX_RESULT_SIZE) + '...' }
    }
    return result
  }

  function addHistory({ modelName, endpoint, params, result, status, duration, tokenUsage }) {
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      timestamp: Date.now(),
      modelName,
      endpoint,
      params: JSON.parse(JSON.stringify(params)),
      result: truncateResult(result),
      status,
      duration,
      tokenUsage
    }
    historyList.value.unshift(entry)
    if (historyList.value.length > MAX_ITEMS) {
      historyList.value = historyList.value.slice(0, MAX_ITEMS)
    }
    saveToStorage()
  }

  function removeHistory(id) {
    historyList.value = historyList.value.filter(h => h.id !== id)
    saveToStorage()
  }

  function clearHistory() {
    historyList.value = []
    saveToStorage()
  }

  return {
    historyList,
    addHistory,
    removeHistory,
    clearHistory
  }
}
