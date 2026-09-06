<template>
  <Teleport to="body">
    <div
      class="connection-drop-menu"
      :style="menuStyle"
      @click.stop
      @pointerdown.stop
    >
      <div class="menu-title">{{ title }}</div>
      <button
        v-for="item in items"
        :key="item.type"
        class="menu-item"
        type="button"
        @click="$emit('select', item.type)"
      >
        <span class="menu-icon" :style="iconStyle(item.type)"><svg-icon :icon="item.icon" /></span>
        <span>
          <strong>{{ item.label }}</strong>
          <em>{{ item.description }}</em>
        </span>
      </button>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { CANVAS_NODE_TYPES } from '../constants/nodeTypes.js'
import { getCanvasNodeMeta, getConnectableNodeTypes } from '../utils/connectionRules.js'

const { t } = useI18n()

// 与节点卡片一致的类型标识色
const TYPE_ACCENTS = {
  [CANVAS_NODE_TYPES.TEXT]: '#3b82f6',
  [CANVAS_NODE_TYPES.IMAGE]: '#8b5cf6',
  [CANVAS_NODE_TYPES.VIDEO]: 'var(--cf-brand)',
  [CANVAS_NODE_TYPES.GROUP]: 'var(--cf-text-tertiary)',
}

function iconStyle(type) {
  const accent = TYPE_ACCENTS[type] || 'var(--cf-brand)'
  return {
    color: accent,
    background: `color-mix(in srgb, ${accent} 13%, transparent)`,
  }
}

const props = defineProps({
  screenX: { type: Number, required: true },
  screenY: { type: Number, required: true },
  sourceType: { type: String, default: '' },
  // 选框句柄批量拉线：选区内所有节点类型（与 sourceType 互斥，优先）
  sourceTypes: { type: Array, default: () => [] },
  side: { type: String, default: 'right' },
})

const emit = defineEmits(['select', 'close'])

const items = computed(() => {
  if (props.sourceTypes.length) {
    const union = new Set()
    for (const type of props.sourceTypes) {
      for (const connectable of getConnectableNodeTypes(type, props.side)) union.add(connectable)
    }
    return [...union].map(getCanvasNodeMeta)
  }
  return getConnectableNodeTypes(props.sourceType, props.side).map(getCanvasNodeMeta)
})

const title = computed(() => {
  if (props.sourceTypes.length) {
    return props.side === 'left' ? t('canvas.dropMenu.addInput') : t('canvas.dropMenu.useSelected')
  }
  if (!props.sourceType) return t('canvas.dropMenu.addNode')
  return props.side === 'left' ? t('canvas.dropMenu.addInput') : t('canvas.dropMenu.useNode')
})

const menuStyle = computed(() => {
  const width = 236
  const height = Math.min(360, 50 + items.value.length * 58)
  const left = Math.min(props.screenX, window.innerWidth - width - 12)
  const top = Math.min(props.screenY, window.innerHeight - height - 12)

  return {
    left: `${Math.max(12, left)}px`,
    top: `${Math.max(12, top)}px`,
  }
})

function handleKeydown(event) {
  if (event.key === 'Escape') emit('close')
}

function handleDocumentPointerDown() {
  emit('close')
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  document.addEventListener('pointerdown', handleDocumentPointerDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
})
</script>

<style scoped lang="scss">
.connection-drop-menu {
  position: fixed;
  z-index: 3000;
  width: 240px;
  padding: 8px;
  border: 1px solid var(--cf-border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--cf-bg-elevated) 92%, transparent);
  backdrop-filter: blur(16px) saturate(1.3);
  box-shadow: var(--cf-shadow-lg);
}

.menu-title {
  padding: 7px 9px 8px;
  color: var(--cf-text-tertiary);
  font-size: 12px;
  font-weight: 850;
}

.menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--cf-text-primary);
  text-align: left;
  cursor: pointer;
  transition: background 0.14s ease, border-color 0.14s ease;

  &:hover {
    background: var(--cf-brand-soft);
    border-color: var(--cf-brand-soft-strong);
  }

  span:last-child {
    min-width: 0;
  }

  strong,
  em {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    font-size: 13px;
    font-weight: 900;
  }

  em {
    margin-top: 2px;
    color: var(--cf-text-tertiary);
    font-size: 11px;
    font-style: normal;
  }
}

.menu-icon {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 9px;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--cf-border) 80%, transparent);
}
</style>
