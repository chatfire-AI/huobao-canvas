<template>
  <!-- 透明加宽路径：提供点击命中区域 -->
  <path :d="pathD" fill="none" stroke="transparent" stroke-width="20"
    class="vue-flow__edge-interaction" />

  <!-- 基础连线 -->
  <path :d="pathD" fill="none"
    class="glow-edge-base" :class="{ 'glow-edge-selected': selected }"
    :marker-end="markerEnd" />

  <defs v-if="shouldGlow">
    <linearGradient
      :id="gradientId"
      gradientUnits="userSpaceOnUse"
      :x1="sourceX"
      :y1="sourceY"
      :x2="targetX"
      :y2="targetY"
    >
      <stop offset="0%" stop-color="#ea580c" stop-opacity="0.02" />
      <stop offset="25%" stop-color="#f97316" stop-opacity="0.08" />
      <stop offset="55%" stop-color="#fb923c" stop-opacity="0.28" />
      <stop offset="80%" stop-color="#fdba74" stop-opacity="0.68" />
      <stop offset="100%" stop-color="#ffedd5" stop-opacity="1" />
    </linearGradient>
  </defs>

  <!-- 单段渐变流光：pathLength 保证整条边始终只有一个光段 -->
  <path v-if="shouldGlow" :d="pathD" fill="none"
    pathLength="100"
    :stroke="`url(#${gradientId})`"
    class="glow-edge-flow" />
</template>

<script setup>
import { computed, inject, ref } from 'vue'
import { getBezierPath } from '@vue-flow/core'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  id: String,
  source: String,
  target: String,
  sourceX: Number,
  sourceY: Number,
  targetX: Number,
  targetY: Number,
  sourcePosition: String,
  targetPosition: String,
  markerEnd: String,
  selected: Boolean,
})

// 由 index.vue 通过 provide 注入
const pulsingEdgeIds = inject('canvasPulsingEdges', ref(new Set()))
const shouldGlow = computed(() => pulsingEdgeIds.value.has(props.id))

const gradientId = computed(() =>
  `glow-edge-gradient-${String(props.id ?? '').replace(/[^a-zA-Z0-9_-]/g, '_')}`,
)

const pathD = computed(() => {
  const [d] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
    sourcePosition: props.sourcePosition,
    targetPosition: props.targetPosition,
  })
  return d
})
</script>

<style>
.glow-edge-base {
  stroke: var(--cf-border-strong);
  stroke-width: 1.4;
  stroke-linecap: round;
  vector-effect: non-scaling-stroke;
  transition: stroke 0.2s;
}

.vue-flow__edge:hover .glow-edge-base {
  stroke: var(--cf-text-tertiary);
}

.glow-edge-selected {
  stroke: var(--cf-brand) !important;
}

.glow-edge-flow {
  fill: none;
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-dasharray: 40 60;
  pointer-events: none;
  vector-effect: non-scaling-stroke;
  animation: glow-edge-flow 3s linear infinite;
}

@keyframes glow-edge-flow {
  to { stroke-dashoffset: -100; }
}

@media (prefers-reduced-motion: reduce) {
  .glow-edge-flow {
    animation: none;
    stroke-dasharray: none;
    opacity: 0.28;
  }
}
</style>
