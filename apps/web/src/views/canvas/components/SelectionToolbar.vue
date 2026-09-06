<template>
  <div v-if="visible" class="selection-toolbar" :style="style">
    <span>{{ $t('canvas.toolbar.nodeCount', { n: count }) }}</span>
    <button type="button" @click="$emit('duplicate')">
      <svg-icon icon="tabler:copy" />
      {{ $t('common.copy') }}
    </button>
    <button v-if="canGroup" type="button" @click="$emit('group')">
      <svg-icon icon="tabler:category" />
      {{ $t('canvas.selection.group') }}
    </button>
    <template v-if="isSingleGroup">
      <button type="button" @click="$emit('ungroup')">
        <svg-icon icon="tabler:category-minus" />
        {{ $t('canvas.selection.ungroup') }}
      </button>
      <button type="button" @click="$emit('layout-horizontal')">
        <svg-icon icon="tabler:layout-columns" />
        {{ $t('canvas.selection.layoutHorizontal') }}
      </button>
      <button type="button" @click="$emit('layout-vertical')">
        <svg-icon icon="tabler:layout-rows" />
        {{ $t('canvas.selection.layoutVertical') }}
      </button>
    </template>
    <button type="button" @click="$emit('delete')">
      <svg-icon icon="tabler:trash" />
      {{ $t('common.delete') }}
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { CANVAS_NODE_TYPES } from '../constants/nodeTypes'
import { useSelectionRect } from '../composables/useSelectionRect'

const props = defineProps({
  nodes: { type: Array, default: () => [] },
})

defineEmits(['duplicate', 'group', 'ungroup', 'layout-horizontal', 'layout-vertical', 'delete'])

const count = computed(() => props.nodes.length)
const canGroup = computed(() => count.value >= 2 && props.nodes.every((node) => (
  node.type !== CANVAS_NODE_TYPES.GROUP && !node.parentNode
)))
const isSingleGroup = computed(() => (
  count.value === 1 && props.nodes[0]?.type === CANVAS_NODE_TYPES.GROUP
))
const visible = computed(() => count.value >= 2 || isSingleGroup.value)

// 屏幕坐标包围盒：拖拽/平移/缩放实时跟随
const rect = useSelectionRect(() => props.nodes)
const style = computed(() => {
  if (!rect.value) return { left: '-9999px', top: '-9999px' }
  return {
    left: `${(rect.value.left + rect.value.right) / 2}px`,
    top: `${Math.max(12, rect.value.top - 46)}px`,
  }
})
</script>

<style scoped lang="scss">
.selection-toolbar {
  position: fixed;
  z-index: 2600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 38px;
  padding: 4px 5px 4px 12px;
  border: 1px solid var(--cf-border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--cf-bg-elevated) 95%, transparent);
  box-shadow: var(--cf-shadow-lg);
  color: var(--cf-text-primary);
  transform: translateX(-50%);
}

span {
  color: var(--cf-text-tertiary);
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

button {
  height: 28px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 11px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--cf-text-secondary);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition: background 0.13s ease, color 0.13s ease;

  &:hover {
    background: var(--cf-brand-soft);
    color: var(--cf-brand);
  }

  &:last-child {
    color: var(--cf-error);

    &:hover {
      background: var(--cf-error-soft);
      color: var(--cf-error);
    }
  }
}
</style>
