import { ref } from 'vue'

// MiniMap 显隐：用户显式选择持久化；未显式选择时大画布（>150 节点）默认收起
const STORAGE_KEY = 'huobao.canvas.minimap'
const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null

export const minimapUserSet = ref(stored !== null)
export const minimapVisible = ref(stored !== '0')

export function toggleMinimap() {
  minimapUserSet.value = true
  minimapVisible.value = !minimapVisible.value
  try {
    localStorage.setItem(STORAGE_KEY, minimapVisible.value ? '1' : '0')
  } catch {}
}
