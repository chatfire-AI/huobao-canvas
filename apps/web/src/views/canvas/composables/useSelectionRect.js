import { computed } from 'vue'
import { useVueFlow } from '@vue-flow/core'

/**
 * 选区包围盒（屏幕坐标）：直接读 vue-flow store 的 computedPosition，
 * 拖拽 / 平移 / 缩放全程实时跟随——不做 DOM 测量，拖拽中不会掉队。
 * @param {() => Array} getNodes 选中节点列表（至少含 id）
 */
export function useSelectionRect(getNodes) {
  const { viewport, findNode } = useVueFlow()

  return computed(() => {
    const list = typeof getNodes === 'function' ? getNodes() : getNodes?.value
    if (!list?.length) return null
    const paneRect = document.querySelector('.vue-flow__pane')?.getBoundingClientRect()
    if (!paneRect) return null

    const { x: vx, y: vy, zoom } = viewport.value
    let left = Infinity
    let top = Infinity
    let right = -Infinity
    let bottom = -Infinity
    for (const item of list) {
      const node = findNode(item.id)
      if (!node) continue
      const pos = node.computedPosition || node.position || { x: 0, y: 0 }
      const width = node.dimensions?.width || 0
      const height = node.dimensions?.height || 0
      left = Math.min(left, pos.x)
      top = Math.min(top, pos.y)
      right = Math.max(right, pos.x + width)
      bottom = Math.max(bottom, pos.y + height)
    }
    if (!Number.isFinite(left)) return null
    return {
      left: paneRect.left + left * zoom + vx,
      top: paneRect.top + top * zoom + vy,
      right: paneRect.left + right * zoom + vx,
      bottom: paneRect.top + bottom * zoom + vy,
    }
  })
}
