<template>
  <div
    class="canvas-node text-node"
    :class="[statusClass, { 'is-selected': selected }]"
  >
    <div class="node-outside-head">
      <span class="node-type-icon"><svg-icon icon="tabler:text-caption" /></span>
      <NodeTitle :id="id" :title="data.title || $t('canvas.nodeTypes.text')" />
      <span v-if="status !== 'idle'" class="node-status-dot" aria-hidden="true"></span>
    </div>
    <div class="node-card text-card" :class="{ 'has-status': Boolean(statusText) }">
      <div class="node-card-body" @dblclick.stop="startEditing">
        <textarea
          v-if="editing"
          v-model="draft"
          class="text-editor nodrag nowheel"
          rows="5"
          :aria-label="$t('canvas.textNode.editAria')"
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
const text = computed(() => {
  const payload = props.data.payload || {}
  const value = payload.parsedResults?.[0] ?? payload.result ?? payload.prompt
  return typeof value === 'string' ? value : ''
})
const preview = computed(() => text.value || t('canvas.textNode.emptyHint'))
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
