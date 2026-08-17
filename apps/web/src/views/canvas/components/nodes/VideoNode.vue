<template>
  <div
    class="canvas-node media-node video-node"
    :class="[statusClass, { 'is-selected': selected }]"
  >
    <div class="node-outside-head">
      <span class="node-type-icon"><svg-icon icon="tabler:video" /></span>
      <span class="node-title">{{ data.title || '视频' }}</span>
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
        <p>{{ data.payload?.prompt || (data.payload?.taskId ? `任务 ${data.payload.taskId}` : '在节点下方输入视频提示') }}</p>
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
import NodeHandlePlus from '../NodeHandlePlus.vue'

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
  if (status.value === 'running') return '运行中'
  if (status.value === 'waiting') return notice || '等待恢复'
  if (status.value === 'success') return '已生成'
  if (status.value === 'unavailable') return notice || '任务已完成，结果暂不可预览'
  if (status.value === 'expired') return notice || '资源已失效'
  if (status.value === 'error') return notice || props.data.payload?.error || '运行失败'
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
