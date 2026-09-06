<template>
  <div
    v-if="node"
    class="canvas-node-toolbar"
    :style="style"
    :aria-busy="running || undefined"
  >
    <button v-if="supportsMedia && resultUrl" type="button" @click="openPreview">
      <svg-icon icon="tabler:external-link" />
      {{ $t('canvas.nodeToolbar.preview') }}
    </button>
    <a
      v-if="supportsMedia"
      :class="{ 'is-disabled': !resultUrl }"
      :href="resultUrl || undefined"
      :download="downloadName"
      :aria-disabled="!resultUrl"
      :tabindex="resultUrl ? 0 : -1"
      target="_blank"
      rel="noopener noreferrer"
      @click="handleDownload"
    >
      <svg-icon icon="tabler:download" />
      {{ $t('common.download') }}
    </a>
    <button class="delete-action" type="button" @click="emit('delete')">
      <svg-icon icon="tabler:trash" />
      {{ $t('common.delete') }}
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { CANVAS_NODE_TYPES } from '../constants/nodeTypes'

const props = defineProps({
  node: { type: Object, default: null },
  style: { type: Object, default: () => ({}) },
  running: { type: Boolean, default: false },
})

const emit = defineEmits(['preview', 'download', 'delete'])
const mediaTypes = new Set([
  CANVAS_NODE_TYPES.IMAGE,
  CANVAS_NODE_TYPES.VIDEO,
])

const supportsMedia = computed(() => mediaTypes.has(props.node?.type))
const resultUrl = computed(() => {
  if (['unavailable', 'expired'].includes(props.node?.data?.status)) return ''
  const payload = props.node?.data?.payload || {}
  const first = payload.parsedResults?.[0]
  const value = payload.parsedResults?.length
    ? (typeof first === 'string'
        ? first
        : first?.url || first?.image_url || first?.video_url || first?.audio_url || first?.output_url)
    : payload.url
  if (typeof value !== 'string' || !value.trim()) return ''

  try {
    const url = new URL(value, window.location.origin)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
})
const downloadName = computed(() => props.node?.data?.payload?.name || props.node?.data?.title || 'canvas-result')

function openPreview() {
  if (!resultUrl.value) return
  window.open(resultUrl.value, '_blank', 'noopener,noreferrer')
  emit('preview', resultUrl.value)
}

function handleDownload(event) {
  if (!resultUrl.value) {
    event.preventDefault()
    return
  }
  emit('download', resultUrl.value)
}
</script>

<style scoped lang="scss">
.canvas-node-toolbar {
  position: fixed;
  z-index: 2600;
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 4px 5px;
  border: 1px solid var(--cf-border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--cf-bg-elevated) 95%, transparent);
  box-shadow: var(--cf-shadow-lg);
  transform: translateX(-50%);
  transition: opacity 0.14s ease, border-color 0.14s ease;
}

button,
a {
  height: 29px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  box-sizing: border-box;
  padding: 0 11px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--cf-text-secondary);
  font: inherit;
  font-size: 12px;
  font-weight: 750;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.13s ease, color 0.13s ease;
}

button:hover,
a:hover {
  background: var(--cf-bg-subtle);
  color: var(--cf-text-primary);
}

a.is-disabled {
  color: var(--cf-text-tertiary);
  cursor: not-allowed;
}

a.is-disabled:hover {
  background: transparent;
  color: var(--cf-text-tertiary);
}

.delete-action {
  color: var(--cf-error);
}

.delete-action:hover {
  background: var(--cf-error-soft);
  color: var(--cf-error);
}
</style>
