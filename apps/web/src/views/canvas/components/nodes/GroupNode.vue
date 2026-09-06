<template>
  <div class="canvas-group-node">
    <div class="group-title">
      <span><svg-icon icon="tabler:category" /></span>
      <strong>{{ data.title || '分组' }}</strong>
    </div>
    <span class="group-layout">自由布局</span>
    <!-- 分组级连接桩：从组内所有节点批量连线 -->
    <Handle
      id="left"
      type="target"
      :position="Position.Left"
      class="group-handle group-handle-left"
    />
    <Handle
      id="right"
      type="source"
      :position="Position.Right"
      class="group-handle group-handle-right"
    />
  </div>
</template>

<script setup>
import { Handle, Position } from '@vue-flow/core'

defineProps({
  data: { type: Object, required: true },
})
</script>

<style scoped lang="scss">
.canvas-group-node {
  width: 100%;
  height: 100%;
  min-width: 280px;
  min-height: 180px;
  position: relative;
  box-sizing: border-box;
  border: 1.5px dashed var(--cf-border-strong);
  border-radius: 16px;
  background:
    color-mix(in srgb, var(--cf-brand) 2.5%, transparent),
    var(--cf-neutral-soft);
  color: var(--cf-text-tertiary);
  transition: border-color 0.16s ease, background 0.16s ease, box-shadow 0.16s ease;
}

.canvas-group-node:hover {
  border-color: var(--cf-brand);
  background: var(--cf-brand-soft);
  box-shadow: var(--cf-shadow-md);
}

.group-title {
  position: absolute;
  top: 10px;
  left: 12px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  max-width: calc(100% - 120px);
  padding: 4px 10px 4px 8px;
  border: 1px solid var(--cf-border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--cf-bg-elevated) 95%, transparent);
  color: var(--cf-text-secondary);
  box-shadow: var(--cf-shadow-sm);
}

.group-title span {
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--cf-brand);
}

.group-title strong {
  overflow: hidden;
  font-size: 11.5px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-layout {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--cf-bg-subtle);
  color: var(--cf-text-tertiary);
  font-size: 10.5px;
  font-weight: 750;
}

// ── 分组连接桩：吸附在左右边缘中点，悬停时可见 ──
.group-handle {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--cf-border-strong);
  border-radius: 999px;
  background: var(--cf-bg-elevated);
  box-shadow: var(--cf-shadow-sm);
  opacity: 0;
  transition: opacity 0.15s ease, border-color 0.14s ease, transform 0.14s ease;
  cursor: crosshair;
  z-index: 5;

  &::after {
    content: '+';
    font-size: 12px;
    color: var(--cf-text-tertiary);
    line-height: 1;
  }

  &:hover {
    border-color: var(--cf-brand);
    transform: scale(1.2);
    opacity: 1;

    &::after {
      color: var(--cf-brand);
    }
  }
}

.canvas-group-node:hover .group-handle {
  opacity: 1;
}

.group-handle-left {
  left: -10px;
  top: 50%;
  transform: translateY(-50%);
}

.group-handle-right {
  right: -10px;
  top: 50%;
  transform: translateY(-50%);
}

.group-handle-right:hover {
  transform: translateY(-50%) scale(1.2);
}

.group-handle-left:hover {
  transform: translateY(-50%) scale(1.2);
}
</style>
