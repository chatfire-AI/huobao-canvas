<template>
  <g class="canvas-edge" :class="{ 'is-selected': selected, 'is-active': isActive }">
    <path
      class="canvas-edge-hit"
      :d="path"
      fill="none"
    />
    <path
      class="canvas-edge-line"
      :d="path"
      fill="none"
    />
  </g>
</template>

<script setup>
import { computed } from 'vue'
import { getBezierPath, useVueFlow } from '@vue-flow/core'

const props = defineProps({
  id: { type: String, default: '' },
  source: { type: String, default: '' },
  target: { type: String, default: '' },
  sourceX: { type: Number, required: true },
  sourceY: { type: Number, required: true },
  targetX: { type: Number, required: true },
  targetY: { type: Number, required: true },
  sourcePosition: { type: String, required: true },
  targetPosition: { type: String, required: true },
  markerEnd: { type: String, default: '' },
  selected: { type: Boolean, default: false },
})

const path = computed(() => getBezierPath(props)[0])

const { findNode } = useVueFlow()
// 目标节点正在运行/等待时，连线显示流动动画，直观表达数据正在流转
const isActive = computed(() => {
  const status = findNode(props.target)?.data?.status
  return status === 'running' || status === 'waiting'
})
</script>

<style scoped lang="scss">
.canvas-edge-hit {
  stroke: transparent;
  stroke-width: 18;
  pointer-events: stroke;
  cursor: pointer;
}

// 现代工作台风格：细中性色贝塞尔曲线，无箭头；选中/流转时点亮品牌色
.canvas-edge-line {
  stroke: var(--cf-border-strong);
  stroke-width: 1.75;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0.8;
  pointer-events: none;
  transition: stroke 0.14s ease, opacity 0.14s ease, stroke-width 0.14s ease;
}

.canvas-edge:hover .canvas-edge-line {
  stroke: var(--cf-text-tertiary);
  opacity: 1;
}

.canvas-edge.is-selected .canvas-edge-line {
  stroke: var(--cf-brand);
  stroke-width: 2.25;
  opacity: 1;
}

.canvas-edge.is-active .canvas-edge-line {
  stroke: var(--cf-brand);
  stroke-width: 2;
  opacity: 0.95;
  stroke-dasharray: 7 5;
  animation: canvas-edge-flow 0.7s linear infinite;
}

@keyframes canvas-edge-flow {
  to {
    stroke-dashoffset: -12;
  }
}
</style>
