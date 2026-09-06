<template>
  <div
    class="canvas-node media-node video-node"
    :class="[statusClass, { 'is-selected': selected }]"
  >
    <div class="node-outside-head">
      <span class="node-type-icon"><svg-icon icon="tabler:video" /></span>
      <NodeTitle :id="id" :title="data.title || $t('canvas.nodeTypes.video')" />
      <span v-if="status !== 'idle'" class="node-status-dot" aria-hidden="true"></span>
    </div>
    <div class="node-card media-card is-video" :class="{ 'has-media': showMedia }">
      <video
        v-if="showMedia"
        class="node-media-fill"
        :src="videoUrl"
        controls
        controlslist="nofullscreen"
        disablepictureinpicture
        preload="metadata"
        @mousedown.stop
        @dblclick.stop.prevent="handlePreview"
      />
      <div v-else class="node-media-empty">
        <span class="empty-icon"><svg-icon icon="tabler:video" /></span>
        <p>{{ data.payload?.prompt || (data.payload?.taskId ? $t('canvas.videoNode.taskLabel', { id: data.payload.taskId }) : $t('canvas.videoNode.emptyHint')) }}</p>
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
const statusClass = computed(() => `is-${status.value}`)
const videoUrl = computed(() => {
  const payload = props.data.payload || {}
  const first = payload.parsedResults?.[0]
  if (typeof first === 'string') return first
  return first?.url || first?.video_url || first?.output_url || payload.url || ''
})
const showMedia = computed(() => Boolean(videoUrl.value) && !['unavailable', 'expired'].includes(status.value))
const modelName = computed(() => props.data.payload?.modelName || '')
const statusText = computed(() => {
  const notice = props.data.payload?.notice
  if (status.value === 'running') return t('canvas.nodeStatus.running')
  if (status.value === 'waiting') return notice || t('canvas.nodeStatus.waiting')
  if (status.value === 'success') return t('canvas.nodeStatus.success')
  if (status.value === 'unavailable') return notice || t('canvas.nodeStatus.unavailable')
  if (status.value === 'expired') return notice || t('canvas.nodeStatus.expired')
  if (status.value === 'error') return notice || props.data.payload?.error || t('canvas.nodeStatus.error')
  return ''
})

const quickAdd = inject('canvasQuickAdd', null)
const openPreview = inject('canvasPreview', null)

// 双击视频放大播放
function handlePreview() {
  if (videoUrl.value) openPreview?.({ url: videoUrl.value, type: 'video' })
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
