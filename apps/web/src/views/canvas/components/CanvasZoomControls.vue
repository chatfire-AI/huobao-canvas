<template>
  <div class="zoom-controls">
    <button type="button" class="zoom-btn" title="缩小" @click="zoomOut()">
      <svg-icon icon="tabler:minus" />
    </button>
    <button type="button" class="zoom-value" title="重置为 100%" @click="zoomTo(1)">
      {{ zoomPercent }}%
    </button>
    <button type="button" class="zoom-btn" title="放大" @click="zoomIn()">
      <svg-icon icon="tabler:plus" />
    </button>
    <span class="zoom-divider" aria-hidden="true"></span>
    <button type="button" class="zoom-btn" title="适配画布" @click="fitView({ padding: 0.2, duration: 300 })">
      <svg-icon icon="tabler:focus-centered" />
    </button>
    <button
      type="button"
      class="zoom-btn"
      :class="{ 'is-locked': locked }"
      :title="locked ? '解锁画布（恢复拖动/缩放）' : '锁定画布（禁止拖动/缩放）'"
      @click="toggleLock"
    >
      <svg-icon :icon="locked ? 'tabler:lock' : 'tabler:lock-open'" />
    </button>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useVueFlow } from '@vue-flow/core'

const { viewport, zoomIn, zoomOut, zoomTo, fitView, setInteractive } = useVueFlow()

const locked = ref(false)

const zoomPercent = computed(() => Math.round((viewport.value?.zoom ?? 1) * 100))

const toggleLock = () => {
  locked.value = !locked.value
  setInteractive(!locked.value)
}
</script>

<style scoped lang="scss">
.zoom-controls {
  position: absolute;
  left: 12px;
  bottom: 12px;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border: 1px solid var(--cf-border);
  border-radius: 10px;
  background: color-mix(in srgb, var(--cf-bg-elevated) 88%, transparent);
  backdrop-filter: blur(12px) saturate(1.3);
  box-shadow: var(--cf-shadow-lg, 0 8px 24px rgba(0, 0, 0, 0.28));
}

.zoom-btn,
.zoom-value {
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--cf-text-secondary);
  font: inherit;
  cursor: pointer;
  transition: background 0.13s ease, color 0.13s ease;

  &:hover {
    background: var(--cf-bg-subtle);
    color: var(--cf-text-primary);
  }
}

.zoom-btn {
  width: 26px;

  svg {
    width: 14px;
    height: 14px;
  }

  &.is-locked {
    color: var(--cf-brand);
    background: var(--cf-brand-soft);
  }
}

.zoom-value {
  min-width: 44px;
  padding: 0 6px;
  font-size: 11px;
  font-weight: 750;
  font-variant-numeric: tabular-nums;
}

.zoom-divider {
  width: 1px;
  height: 14px;
  margin: 0 2px;
  background: var(--cf-border);
}
</style>
