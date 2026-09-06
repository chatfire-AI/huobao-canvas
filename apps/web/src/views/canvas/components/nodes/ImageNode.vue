<template>
  <div
    class="canvas-node media-node image-node"
    :class="[statusClass, { 'is-selected': selected }]"
  >
    <div class="node-outside-head">
      <span class="node-type-icon"><svg-icon icon="tabler:photo" /></span>
      <NodeTitle :id="id" :title="data.title || $t('canvas.nodeTypes.image')" />
      <span v-if="displayStatus !== 'idle'" class="node-status-dot" aria-hidden="true"></span>
    </div>
    <div class="node-card media-card" :class="{ 'has-media': showMedia }">
      <img
        v-if="showMedia"
        class="node-media-fill"
        :src="imageUrl"
        :alt="data.title || $t('canvas.imageNode.resultAlt')"
        draggable="false"
        @dblclick.stop="handlePreview"
      />
      <div v-else class="node-media-empty">
        <span class="empty-icon"><svg-icon icon="tabler:photo" /></span>
        <p>{{ data.payload?.prompt || $t('canvas.imageNode.emptyHint') }}</p>
      </div>
      <div v-if="modelName || statusText" class="node-overlay-bottom">
        <span v-if="modelName" class="node-model-pill">{{ modelName }}</span>
        <span v-if="statusText" class="node-status-pill">{{ statusText }}</span>
      </div>
    </div>
    <NodeHandlePlus side="left" @quick-add="handleQuickAdd" />
    <NodeHandlePlus side="right" @quick-add="handleQuickAdd" />
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import NodeHandlePlus from '../NodeHandlePlus.vue'
import NodeTitle from './NodeTitle.vue'

const { t } = useI18n()

const props = defineProps({
  id: { type: String, required: true },
  data: { type: Object, required: true },
  selected: { type: Boolean, default: false },
})

const status = computed(() => props.data.status || 'idle')
const imageUrl = computed(() => {
  const payload = props.data.payload || {}
  const first = payload.parsedResults?.[0]
  if (typeof first === 'string') return first
  if (first?.b64_json) return `data:image/png;base64,${first.b64_json}`
  return first?.url || first?.image_url || payload.url || ''
})
const isLocalImageUnavailable = computed(() => (
  props.data.payload?.sourceType === 'local' && !imageUrl.value
))
const displayStatus = computed(() => {
  return isLocalImageUnavailable.value ? 'expired' : status.value
})
const statusClass = computed(() => `is-${displayStatus.value}`)
const showMedia = computed(() => Boolean(imageUrl.value) && !['unavailable', 'expired'].includes(displayStatus.value))
const modelName = computed(() => props.data.payload?.modelName || '')
const statusText = computed(() => {
  const notice = props.data.payload?.notice
  if (isLocalImageUnavailable.value) return t('canvas.imageNode.localExpired')
  if (displayStatus.value === 'running') return t('canvas.nodeStatus.running')
  if (displayStatus.value === 'waiting') return notice || t('canvas.nodeStatus.waiting')
  if (displayStatus.value === 'success') return t('canvas.nodeStatus.success')
  if (displayStatus.value === 'unavailable') return notice || t('canvas.nodeStatus.unavailable')
  if (displayStatus.value === 'expired') return notice || t('canvas.nodeStatus.expired')
  if (displayStatus.value === 'error') return notice || props.data.payload?.error || t('canvas.nodeStatus.error')
  return ''
})

const quickAdd = inject('canvasQuickAdd', null)
const openPreview = inject('canvasPreview', null)

// 双击图片放大预览
function handlePreview() {
  if (imageUrl.value) openPreview?.({ url: imageUrl.value, type: 'image' })
}

function handleQuickAdd(event) {
  quickAdd?.({
    ...event,
    nodeId: props.id,
  })
}
</script>

<style scoped lang="scss">
@import './node-shared.scss';
</style>
