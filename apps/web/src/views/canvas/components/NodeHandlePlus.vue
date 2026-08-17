<template>
  <Handle
    class="node-handle-target-anchor"
    :class="`is-${side}`"
    :id="side"
    type="target"
    :position="position"
  />
  <Handle
    class="node-handle-plus"
    :class="`is-${side}`"
    :id="side"
    type="source"
    :position="position"
    @pointerdown="handlePointerDown"
    @mousedown="handlePointerDown"
  >
    <span class="node-handle-plus__button">
      <svg-icon icon="tabler:plus" />
    </span>
  </Handle>
</template>

<script setup>
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'

const props = defineProps({
  side: {
    type: String,
    required: true,
    validator: (value) => ['left', 'right'].includes(value),
  },
})

const emit = defineEmits(['quick-add'])

const position = computed(() => props.side === 'left' ? Position.Left : Position.Right)

let downAt = 0
let downPoint = { x: 0, y: 0 }

function handlePointerDown(event) {
  if (event.type === 'mousedown' && window.PointerEvent) return
  downAt = Date.now()
  downPoint = { x: event.clientX, y: event.clientY }

  const onUp = (upEvent) => {
    const elapsed = Date.now() - downAt
    const dx = Math.abs((upEvent.clientX || 0) - downPoint.x)
    const dy = Math.abs((upEvent.clientY || 0) - downPoint.y)
    if (elapsed < 300 && dx < 5 && dy < 5) {
      emit('quick-add', {
        side: props.side,
        screenX: upEvent.clientX,
        screenY: upEvent.clientY,
      })
    }
  }

  document.addEventListener('pointerup', onUp, { once: true })
}
</script>

<style scoped lang="scss">
// liblib 风格：常驻 ⊕ 圆钮吸附在卡片左右边缘中点
// 节点根包含卡片外标题（--node-head-h），垂直中心需向下补偿一半标题高度
.node-handle-plus,
.node-handle-target-anchor {
  width: 1px;
  min-width: 1px;
  height: 100%;
  border: 0;
  background: transparent;
  top: calc(50% + var(--node-head-h, 26px) / 2);
  transform: translateY(-50%);
}

.node-handle-plus {
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 1;
  z-index: 2;
  cursor: crosshair;
}

.node-handle-target-anchor {
  opacity: 0;
  z-index: 1;
}

.node-handle-plus.is-left,
.node-handle-target-anchor.is-left {
  left: 0;
}

.node-handle-plus.is-right,
.node-handle-target-anchor.is-right {
  right: 0;
}

// 扩大热区，方便拖拽起线/落线
.node-handle-plus::after,
.node-handle-target-anchor::after {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  width: 52px;
  height: 100%;
  transform: translateX(-50%);
  background: transparent;
}

.node-handle-plus__button {
  width: 19px;
  height: 19px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--cf-border-strong);
  border-radius: 999px;
  background: var(--cf-bg-elevated);
  color: var(--cf-text-tertiary);
  font-size: 12px;
  box-shadow: var(--cf-shadow-sm);
  transition: border-color 0.14s ease, color 0.14s ease, transform 0.14s ease, box-shadow 0.14s ease;
  pointer-events: none;
  z-index: 1;
}

.node-handle-plus:hover .node-handle-plus__button {
  border-color: var(--cf-brand);
  color: var(--cf-brand);
  transform: scale(1.18);
  box-shadow: 0 0 0 4px var(--cf-brand-soft);
}

.node-handle-plus.connecting.valid .node-handle-plus__button,
.node-handle-target-anchor.connecting.valid + .node-handle-plus .node-handle-plus__button {
  border-color: var(--cf-brand);
  background: var(--cf-brand);
  color: var(--cf-text-on-brand);
  transform: scale(1.18);
  box-shadow: 0 0 0 4px var(--cf-brand-soft);
}

.node-handle-plus.connecting:not(.valid) .node-handle-plus__button,
.node-handle-target-anchor.connecting:not(.valid) + .node-handle-plus .node-handle-plus__button {
  border-color: var(--cf-error);
  color: var(--cf-error);
}
</style>
