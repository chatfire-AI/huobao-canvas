<template>
  <div
    class="canvas-node text-node"
    :class="[statusClass, { 'is-selected': selected }]"
  >
    <div class="node-outside-head">
      <span class="node-type-icon"><svg-icon icon="tabler:text-caption" /></span>
      <NodeTitle :id="id" :title="data.title || '文本'" />
      <span v-if="status !== 'idle'" class="node-status-dot" aria-hidden="true"></span>
    </div>
    <div class="node-card text-card" :class="{ 'has-status': Boolean(statusText) }">
      <div class="node-card-body" @dblclick.stop="startEditing">
        <textarea
          v-if="editing"
          v-model="draft"
          class="text-editor nodrag nowheel"
          rows="5"
          aria-label="编辑文本节点"
          autofocus
          @mousedown.stop
          @blur="saveEdit"
        />
        <p v-else class="text-content">{{ preview }}</p>
      </div>
      <span v-if="statusText" class="node-status-pill">{{ statusText }}</span>
    </div>
    <NodeHandlePlus side="left" @quick-add="handleQuickAdd" />
    <NodeHandlePlus side="right" @quick-add="handleQuickAdd" />
  </div>
</template>

<script setup>
import { computed, inject, ref } from 'vue'
import NodeHandlePlus from '../NodeHandlePlus.vue'
import NodeTitle from './NodeTitle.vue'

const props = defineProps({
  id: { type: String, required: true },
  data: { type: Object, required: true },
  selected: { type: Boolean, default: false },
})

const status = computed(() => props.data.status || 'idle')
const statusClass = computed(() => `is-${status.value}`)
const text = computed(() => {
  const payload = props.data.payload || {}
  const value = payload.parsedResults?.[0] ?? payload.result ?? payload.prompt
  return typeof value === 'string' ? value : ''
})
const preview = computed(() => text.value || '在节点下方输入文本提示')
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
const updateNodePayload = inject('canvasUpdateNodePayload', null)
const editing = ref(false)
const draft = ref('')

function startEditing() {
  draft.value = text.value
  editing.value = true
}

function saveEdit() {
  updateNodePayload?.(props.id, {
    prompt: draft.value,
    result: draft.value,
    parsedResults: [],
  })
  editing.value = false
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
