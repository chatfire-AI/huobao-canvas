<template>
  <div v-if="visible" class="selection-toolbar" :style="style">
    <span>{{ count }} 个节点</span>
    <button type="button" @click="$emit('duplicate')">
      <svg-icon icon="tabler:copy" />
      复制
    </button>
    <button v-if="canGroup" type="button" @click="$emit('group')">
      <svg-icon icon="tabler:category" />
      分组
    </button>
    <template v-if="isSingleGroup">
      <button type="button" @click="$emit('ungroup')">
        <svg-icon icon="tabler:category-minus" />
        解组
      </button>
      <button type="button" @click="$emit('layout-horizontal')">
        <svg-icon icon="tabler:layout-columns" />
        横向布局
      </button>
      <button type="button" @click="$emit('layout-vertical')">
        <svg-icon icon="tabler:layout-rows" />
        纵向布局
      </button>
    </template>
    <button type="button" @click="$emit('delete')">
      <svg-icon icon="tabler:trash" />
      删除
    </button>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { CANVAS_NODE_TYPES } from '../constants/nodeTypes'

const props = defineProps({
  nodes: { type: Array, default: () => [] },
  dragTick: { type: Number, default: 0 },
})

defineEmits(['duplicate', 'group', 'ungroup', 'layout-horizontal', 'layout-vertical', 'delete'])

const style = ref({ left: '-9999px', top: '-9999px' })
const count = computed(() => props.nodes.length)
const canGroup = computed(() => count.value >= 2 && props.nodes.every((node) => (
  node.type !== CANVAS_NODE_TYPES.GROUP && !node.parentNode
)))
const isSingleGroup = computed(() => (
  count.value === 1 && props.nodes[0]?.type === CANVAS_NODE_TYPES.GROUP
))
const visible = computed(() => count.value >= 2 || isSingleGroup.value)

function updatePosition() {
  if (!visible.value) return

  const rects = props.nodes
    .map((node) => document.querySelector(`.vue-flow__node[data-id="${node.id}"]`)?.getBoundingClientRect())
    .filter(Boolean)
  if (!rects.length) return

  const left = Math.min(...rects.map((rect) => rect.left))
  const right = Math.max(...rects.map((rect) => rect.right))
  const top = Math.min(...rects.map((rect) => rect.top))
  style.value = {
    left: `${left + (right - left) / 2}px`,
    top: `${Math.max(12, top - 46)}px`,
  }
}

watch(() => [props.nodes.map((node) => node.id).join(','), props.dragTick], async () => {
  await nextTick()
  updatePosition()
})

onMounted(updatePosition)
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
  border-radius: 11px;
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
  padding: 0 9px;
  border: 0;
  border-radius: 8px;
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
