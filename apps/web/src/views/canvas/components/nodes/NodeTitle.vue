<template>
  <input
    v-if="editing"
    ref="inputRef"
    v-model="draft"
    class="node-title-input nodrag nowheel"
    maxlength="50"
    @mousedown.stop
    @dblclick.stop
    @keydown.enter.prevent="commit"
    @keydown.esc.prevent="cancel"
    @blur="commit"
  />
  <span
    v-else
    class="node-title"
    :title="$t('canvas.nodeTitle.renameHint', { title })"
    @dblclick.stop="startEdit"
  >{{ title }}</span>
</template>

<script setup>
import { inject, nextTick, ref } from 'vue'
import { i18n } from '@/locales'

// 节点名称：双击重命名（Enter/失焦提交，Esc 取消）；
// 身份靠节点 UUID，名称只是展示标签，允许自由修改、不做唯一校验
const props = defineProps({
  id: { type: String, required: true },
  title: { type: String, default: () => i18n.global.t('canvas.nodeTypes.node') },
})

const updateNodeTitle = inject('canvasUpdateNodeTitle', null)

const editing = ref(false)
const draft = ref('')
const inputRef = ref(null)

function startEdit() {
  draft.value = props.title
  editing.value = true
  nextTick(() => {
    inputRef.value?.focus()
    inputRef.value?.select()
  })
}

function commit() {
  if (!editing.value) return
  const name = draft.value.trim()
  // 空名视为放弃修改，保留原标题（系统生成名兜底）
  if (name && name !== props.title) updateNodeTitle?.(props.id, name)
  editing.value = false
}

function cancel() {
  editing.value = false
}
</script>

<style scoped lang="scss">
.node-title-input {
  min-width: 0;
  width: 120px;
  height: 20px;
  padding: 0 6px;
  border: 1px solid var(--cf-brand);
  border-radius: 6px;
  outline: none;
  background: var(--cf-bg-surface);
  color: var(--cf-text-primary);
  font-size: 12px;
  font-weight: 800;
}
</style>
