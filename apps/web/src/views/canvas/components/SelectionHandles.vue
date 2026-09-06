<template>
  <template v-if="visible">
    <button
      v-for="side in ['left', 'right']"
      :key="side"
      type="button"
      class="selection-handle"
      :class="[`is-${side}`, { 'is-active': dragState?.side === side }]"
      :style="handleStyles[side]"
      :title="side === 'right' ? '从选区拉线：所有兼容的选中节点一起连出' : '拉线进选区：源节点连到所有兼容的选中节点'"
      @pointerdown="startDrag(side, $event)"
    >
      <svg-icon icon="tabler:plus" />
    </button>
    <svg v-if="dragState" class="selection-drag-overlay" aria-hidden="true">
      <path :d="dragPath" fill="none" :class="{ 'is-valid': dragState.valid }" />
    </svg>
  </template>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { useSelectionRect } from '../composables/useSelectionRect'

const props = defineProps({
  nodes: { type: Array, default: () => [] },
  // (side, targetNodeId) => boolean：当前选区以该方向连到目标节点是否可行
  canConnect: { type: Function, default: null },
})

const emit = defineEmits(['connect', 'connect-blank'])

// 屏幕坐标包围盒：拖拽/平移/缩放实时跟随
const rect = useSelectionRect(() => props.nodes)
const visible = computed(() => props.nodes.length >= 2 && Boolean(rect.value))

const HANDLE_OFFSET = 28

const handleStyles = computed(() => {
  if (!rect.value) return {}
  const midY = (rect.value.top + rect.value.bottom) / 2
  return {
    left: { left: `${rect.value.left - HANDLE_OFFSET}px`, top: `${midY}px` },
    right: { left: `${rect.value.right + HANDLE_OFFSET}px`, top: `${midY}px` },
  }
})

// ── 从选框句柄拉线 ──
const dragState = ref(null)

function hitNodeId(clientX, clientY, { includeSelected = false } = {}) {
  const selectedIds = new Set(props.nodes.map((node) => node.id))
  const hit = document
    .elementsFromPoint(clientX, clientY)
    .find((el) => el.closest?.('.vue-flow__node'))
    ?.closest('.vue-flow__node')
  const id = hit?.dataset?.id || hit?.getAttribute('data-id') || ''
  if (!id) return ''
  return includeSelected || !selectedIds.has(id) ? id : ''
}

function startDrag(side, event) {
  if (event.button !== 0 || !rect.value) return
  event.preventDefault()
  event.stopPropagation()
  const anchorX = side === 'left' ? rect.value.left - HANDLE_OFFSET : rect.value.right + HANDLE_OFFSET
  const anchorY = (rect.value.top + rect.value.bottom) / 2
  dragState.value = { side, anchorX, anchorY, x: event.clientX, y: event.clientY, valid: false }
  window.addEventListener('pointermove', onDragMove)
  window.addEventListener('pointerup', onDragEnd, { once: true })
}

function onDragMove(event) {
  if (!dragState.value) return
  const hitId = hitNodeId(event.clientX, event.clientY)
  dragState.value = {
    ...dragState.value,
    x: event.clientX,
    y: event.clientY,
    valid: Boolean(hitId && props.canConnect?.(dragState.value.side, hitId)),
  }
}

function onDragEnd(event) {
  window.removeEventListener('pointermove', onDragMove)
  const state = dragState.value
  dragState.value = null
  if (!state) return
  const hitId = hitNodeId(event.clientX, event.clientY)
  if (hitId && props.canConnect?.(state.side, hitId)) {
    emit('connect', { side: state.side, targetNodeId: hitId })
    return
  }
  // 落在真正的空白处（非任何节点）：打开节点选择菜单，新建节点并批量连接
  if (!hitNodeId(event.clientX, event.clientY, { includeSelected: true })) {
    emit('connect-blank', { side: state.side, screenX: event.clientX, screenY: event.clientY })
  }
}

const dragPath = computed(() => {
  const state = dragState.value
  if (!state) return ''
  const dir = state.side === 'right' ? 1 : -1
  const dx = Math.max(40, Math.abs(state.x - state.anchorX) * 0.5)
  return `M ${state.anchorX} ${state.anchorY} C ${state.anchorX + dx * dir} ${state.anchorY}, ${state.x - dx * dir} ${state.y}, ${state.x} ${state.y}`
})

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onDragMove)
})
</script>

<style scoped lang="scss">
.selection-handle {
  position: fixed;
  z-index: 2550;
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid var(--cf-border-strong);
  border-radius: 999px;
  background: var(--cf-bg-elevated);
  color: var(--cf-text-tertiary);
  font-size: 13px;
  box-shadow: var(--cf-shadow-md);
  cursor: crosshair;
  transform: translate(-50%, -50%);
  transition: border-color 0.14s ease, color 0.14s ease, box-shadow 0.14s ease, background 0.14s ease;

  &:hover,
  &.is-active {
    border-color: var(--cf-brand);
    color: var(--cf-brand);
    box-shadow: 0 0 0 4px var(--cf-brand-soft);
  }

  &.is-active {
    background: var(--cf-brand);
    color: var(--cf-text-on-brand);
  }
}

.selection-drag-overlay {
  position: fixed;
  inset: 0;
  z-index: 2549;
  width: 100vw;
  height: 100vh;
  pointer-events: none;

  path {
    stroke: var(--cf-edge-stroke, var(--cf-border-strong));
    stroke-width: 2;
    stroke-dasharray: 6 4;

    &.is-valid {
      stroke: var(--cf-brand);
    }
  }
}
</style>
