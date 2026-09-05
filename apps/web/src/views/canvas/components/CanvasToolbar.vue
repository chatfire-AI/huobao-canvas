<template>
  <div class="canvas-toolbar">
    <div class="toolbar-cluster">
      <img src="/icons/huobao.png" class="brand-icon" alt="火宝画布" title="火宝画布" />
      <div ref="switcherRef" class="project-switcher">
        <button
          type="button"
          class="project-trigger"
          :class="{ open: projectPanelVisible }"
          :disabled="controlsLocked"
          @click="projectPanelVisible = !projectPanelVisible"
        >
          <span class="project-trigger-main">
            <svg-icon icon="tabler:layout-dashboard" />
            {{ currentProjectLabel }}
          </span>
          <span class="project-trigger-meta">{{ currentProjectMeta }}</span>
          <svg-icon icon="tabler:chevron-down" class="trigger-chevron" />
        </button>

        <div v-if="projectPanelVisible" class="project-panel">
          <div class="project-panel-head">
            <strong>画布列表</strong>
            <span>{{ projectOptions.length }}/50</span>
          </div>
          <div class="project-list">
            <div
              v-for="item in projectOptions"
              :key="item.value"
              class="project-option"
              :class="{ active: item.value === projectId }"
              @click="handleSelectProject(item.value)"
            >
              <span class="project-option-main">
                <input
                  v-if="renamingId === item.value"
                  ref="renameInputRef"
                  v-model="renamingValue"
                  class="project-rename-input"
                  maxlength="50"
                  @keyup.enter="commitRename"
                  @keyup.esc="renamingId = ''"
                  @blur="commitRename"
                  @click.stop
                />
                <template v-else>
                  <span class="project-name">
                    {{ item.label }}
                    <span v-if="item.value === projectId" class="current-badge">当前</span>
                  </span>
                  <span class="project-meta">{{ formatProjectMeta(item) }}</span>
                </template>
              </span>
              <span class="project-option-actions" @click.stop>
                <button
                  type="button"
                  class="project-action-btn"
                  title="重命名"
                  :disabled="controlsLocked"
                  @click="startRename(item)"
                >
                  <svg-icon icon="tabler:pencil" />
                </button>
                <button
                  v-if="projectOptions.length > 1"
                  type="button"
                  class="project-action-btn danger"
                  title="删除"
                  :disabled="controlsLocked"
                  @click="$emit('delete-project', item.value)"
                >
                  <svg-icon icon="tabler:trash" />
                </button>
              </span>
            </div>
          </div>
          <button
            type="button"
            class="project-new-btn"
            :disabled="controlsLocked"
            @click="handleCreateProject"
          >
            <svg-icon icon="tabler:plus" />
            <span>新建画布</span>
          </button>
        </div>
      </div>

      <button
        type="button"
        class="project-create-button"
        title="新建画布"
        :disabled="controlsLocked"
        @click="$emit('create-project')"
      >
        <svg-icon icon="tabler:plus" />
        新建
      </button>
    </div>

    <div class="toolbar-actions">
      <button type="button" title="自动布局" @click="$emit('auto-layout')">
        <svg-icon icon="tabler:hierarchy-2" />
        <span>自动布局</span>
      </button>
      <button type="button" title="适配画布" @click="$emit('fit-canvas')">
        <svg-icon icon="tabler:focus-centered" />
        <span>适配画布</span>
      </button>
      <span class="action-divider" aria-hidden="true"></span>
      <button type="button" class="danger-action" title="清空画布" @click="$emit('clear-canvas')">
        <svg-icon icon="tabler:eraser" />
        <span>清空</span>
      </button>
      <button
        type="button"
        class="danger-action"
        title="删除画布"
        :disabled="!projectId"
        @click="$emit('delete-project')"
      >
        <svg-icon icon="tabler:trash" />
        <span>删除</span>
      </button>
    </div>

    <div class="toolbar-right">
      <span class="save-state" :class="saveState" :title="storageError || saveLabel">
        <span class="save-state-dot" aria-hidden="true"></span>
        {{ saveLabel }}
      </span>
      <div class="api-key-control" v-if="showApiKeyControl">
        <span>API Key</span>
        <n-select
          class="api-key-select"
          :value="selectedApiKey"
          :options="apiKeyOptions"
          :loading="apiKeyLoading"
          :disabled="controlsLocked"
          size="small"
          placeholder="选择 API Key"
          filterable
          clearable
          @update:value="$emit('select-api-key', $event || '')"
        />
        <button
          type="button"
          class="api-key-manage"
          title="管理 API Key（新增 / 删除）"
          :disabled="controlsLocked"
          @click="$emit('manage-api-keys')"
        >
          <svg-icon icon="tabler:key" />
        </button>
      </div>
      <button
        type="button"
        class="tips-toggle"
        :title="isDark ? '切换到浅色主题' : '切换到暗色主题'"
        @click="toggleTheme"
      >
        <svg-icon :icon="isDark ? 'tabler:sun' : 'tabler:moon'" />
      </button>
      <button
        type="button"
        class="settings-entry"
        title="设置（厂商 / 模型 / 存储）"
        @click="$emit('open-settings')"
      >
        <svg-icon icon="tabler:settings" />
        <span>设置</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useTheme } from '@/composables/useTheme'

const { isDark, toggleTheme } = useTheme()

const props = defineProps({
  projectId: { type: String, default: '' },
  projectName: { type: String, default: '默认画布' },
  projectOptions: { type: Array, default: () => [] },
  apiKeyOptions: { type: Array, default: () => [] },
  selectedApiKey: { type: String, default: '' },
  apiKeyLoading: { type: Boolean, default: false },
  saveState: { type: String, default: 'idle' },
  storageError: { type: String, default: '' },
  controlsLocked: { type: Boolean, default: false },
  showApiKeyControl: { type: Boolean, default: true },
})

const emit = defineEmits([
  'select-project',
  'create-project',
  'select-api-key',
  'manage-api-keys',
  'open-settings',
  'auto-layout',
  'fit-canvas',
  'clear-canvas',
  'delete-project',
  'rename-project',
])

const renamingId = ref('')
const renamingValue = ref('')
const renameInputRef = ref(null)

// ── 画布列表面板（本地渲染，不 teleport）──
const projectPanelVisible = ref(false)
const switcherRef = ref(null)

function handleDocumentClick(event) {
  if (switcherRef.value && !switcherRef.value.contains(event.target)) {
    projectPanelVisible.value = false
  }
}

watch(projectPanelVisible, (visible) => {
  if (visible) document.addEventListener('mousedown', handleDocumentClick)
  else document.removeEventListener('mousedown', handleDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleDocumentClick)
})

function handleSelectProject(value) {
  if (props.controlsLocked || renamingId.value) return
  projectPanelVisible.value = false
  emit('select-project', value)
}

function handleCreateProject() {
  projectPanelVisible.value = false
  emit('create-project')
}

function startRename(item) {
  renamingId.value = item.value
  renamingValue.value = item.label.replace(' · 未保存', '')
  nextTick(() => {
    const input = Array.isArray(renameInputRef.value) ? renameInputRef.value[0] : renameInputRef.value
    input?.focus()
    input?.select()
  })
}

function commitRename() {
  const name = String(renamingValue.value || '').trim()
  if (renamingId.value && name) {
    emit('rename-project', { id: renamingId.value, name })
  }
  renamingId.value = ''
  renamingValue.value = ''
}

const saveLabel = computed(() => {
  if (props.controlsLocked) return '任务信息保存中'
  if (props.saveState === 'error' && props.storageError) return `保存失败：${props.storageError}`
  const map = {
    idle: '本地画布',
    saving: '保存中',
    saved: '已自动保存',
    error: '保存失败',
  }
  return map[props.saveState] || '本地画布'
})

const currentProject = computed(() => (
  props.projectOptions.find((item) => item.value === props.projectId) || {
    label: props.projectName || '默认画布',
    nodeCount: 0,
  }
))

const currentProjectLabel = computed(() => currentProject.value.label || '默认画布')
const currentProjectMeta = computed(() => `${currentProject.value.nodeCount || 0} 个节点`)

function formatDate(value) {
  if (!value) return '未保存'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '未保存'
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatProjectMeta(item) {
  return `${item.nodeCount || 0} 个节点 · ${formatDate(item.updatedAt)}`
}
</script>

<style scoped lang="scss">
// ── 现代工作台顶部栏：玻璃拟态 + 统一 32px 控件 ──
.canvas-toolbar {
  position: relative;
  z-index: 6;
  height: 54px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  border-bottom: 1px solid var(--cf-border);
  background: color-mix(in srgb, var(--cf-bg-surface) 95%, transparent);
}

.toolbar-cluster,
.toolbar-actions,
.toolbar-right,
.api-key-control {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-actions {
  flex-shrink: 0;
}

.brand-icon {
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  user-select: none;
  -webkit-user-drag: none;
}

.toolbar-right {
  margin-left: auto;
  flex-shrink: 0;
  gap: 12px;
}

// ── 设置入口：图标 + 文字，品牌色高亮（区别于纯图标的提示开关） ──
.settings-entry {
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  border: 1px solid var(--cf-brand-soft-strong);
  border-radius: 9px;
  background: var(--cf-brand-soft);
  color: var(--cf-brand);
  font-size: 12px;
  font-weight: 850;
  cursor: pointer;
  transition: border-color 0.14s ease, background 0.14s ease;

  svg { width: 15px; height: 15px; }

  &:hover {
    border-color: var(--cf-brand);
    background: var(--cf-brand-soft-strong);
  }
}

// ── 图标按钮（主题切换等） ──
.tips-toggle {
  position: relative;
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid var(--cf-border);
  border-radius: 9px;
  background: color-mix(in srgb, var(--cf-bg-elevated) 88%, transparent);
  color: var(--cf-text-tertiary);
  cursor: pointer;
  transition: color 0.13s ease, border-color 0.13s ease, background 0.13s ease;

  svg { width: 15px; height: 15px; }

  &:hover {
    color: var(--cf-text-primary);
    border-color: var(--cf-border-strong);
  }
  &.is-active {
    color: var(--cf-brand);
    border-color: color-mix(in srgb, var(--cf-brand) 45%, transparent);
    background: var(--cf-brand-soft);
  }
}

// ── 项目切换 ──
.project-trigger {
  width: 238px;
  justify-content: space-between;
  padding: 0 10px;
  border-radius: 10px;
  border-color: var(--cf-border);
  background: color-mix(in srgb, var(--cf-bg-elevated) 88%, transparent);
  transition: border-color 0.14s ease, box-shadow 0.14s ease;

  &:hover:not(:disabled) {
    border-color: var(--cf-border-strong);
  }
}

.project-trigger-main {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  overflow: hidden;
  color: var(--cf-text-primary);
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;

  svg {
    flex-shrink: 0;
    color: var(--cf-brand);
  }
}

.project-trigger-meta {
  margin-left: auto;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--cf-bg-subtle);
  color: var(--cf-text-tertiary);
  font-size: 11px;
  font-weight: 750;
  white-space: nowrap;
}

.project-create-button {
  flex-shrink: 0;
  border-radius: 10px;
  border-color: var(--cf-brand-soft-strong);
  background: var(--cf-brand-soft);
  color: var(--cf-brand);

  &:hover {
    border-color: var(--cf-brand);
    background: var(--cf-brand-soft-strong);
    color: var(--cf-brand);
  }
}

// ── 通用按钮 ──
button {
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  border: 1px solid var(--cf-border);
  border-radius: 9px;
  background: var(--cf-bg-elevated);
  color: var(--cf-text-secondary);
  font-size: 12px;
  font-weight: 850;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.42;
  }
}

// ── 动作区：图标 + 文字按钮 ──
.toolbar-actions button {
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 9px;
  border-color: transparent;
  border-radius: 9px;
  background: transparent;
  color: var(--cf-text-tertiary);
  font-size: 12px;
  font-weight: 750;
  transition: background 0.14s ease, color 0.14s ease;

  svg {
    width: 15px;
    height: 15px;
    flex-shrink: 0;
  }

  &:hover:not(:disabled) {
    background: var(--cf-bg-subtle);
    color: var(--cf-text-primary);
  }
}

.toolbar-actions .danger-action:hover:not(:disabled) {
  background: var(--cf-error-soft);
  color: var(--cf-error);
}

.action-divider {
  width: 1px;
  height: 16px;
  background: var(--cf-border);
}

// ── 保存状态 chip ──
.save-state {
  max-width: 200px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--cf-bg-subtle);
  color: var(--cf-text-tertiary);
  font-size: 11.5px;
  font-weight: 750;
  white-space: nowrap;
}

.save-state-dot {
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  border-radius: 999px;
  background: var(--cf-border-strong);
}

.save-state.saving .save-state-dot {
  background: var(--cf-warning);
  animation: save-pulse 1s ease-in-out infinite;
}

.save-state.saved {
  color: var(--cf-success);

  .save-state-dot {
    background: var(--cf-success);
  }
}

.save-state.error {
  color: var(--cf-error);

  .save-state-dot {
    background: var(--cf-error);
  }
}

@keyframes save-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}

// ── API Key ──
.api-key-control {
  gap: 7px;

  span {
    color: var(--cf-text-tertiary);
    font-size: 11.5px;
    font-weight: 750;
    white-space: nowrap;
  }
}

.api-key-select {
  width: 224px;
}

.api-key-manage {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--cf-text-tertiary);
  cursor: pointer;

  &:hover {
    background: var(--cf-bg-subtle);
    color: var(--cf-text-primary);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

// ── 项目列表下拉面板 ──
.project-switcher {
  position: relative;
  flex-shrink: 0;
}

.project-trigger.open {
  border-color: var(--cf-brand);
  box-shadow: 0 0 0 3px var(--cf-brand-soft);

  .trigger-chevron {
    transform: rotate(180deg);
  }
}

.trigger-chevron {
  color: var(--cf-text-tertiary);
  transition: transform 0.16s ease;
}

.project-panel {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 3000;
  width: 316px;
  padding: 8px;
  border: 1px solid var(--cf-border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--cf-bg-elevated) 97%, transparent);
  box-shadow: var(--cf-shadow-lg);
}

.project-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px 10px;
  color: var(--cf-text-tertiary);
  font-size: 11px;

  strong {
    color: var(--cf-text-primary);
    font-size: 12.5px;
    font-weight: 850;
  }
}

.project-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 320px;
  overflow-y: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.project-option {
  width: 100%;
  min-height: 50px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border: 1px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.13s ease, border-color 0.13s ease;

  &:hover {
    background: var(--cf-bg-subtle);
  }

  &.active {
    border-color: var(--cf-brand-soft-strong);
    background: var(--cf-brand-soft);
  }
}

.project-option-main {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.project-name {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  color: var(--cf-text-primary);
  font-size: 13px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.current-badge {
  flex-shrink: 0;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--cf-brand-soft);
  color: var(--cf-brand);
  font-size: 10.5px;
  font-weight: 800;
}

.project-meta {
  overflow: hidden;
  color: var(--cf-text-tertiary);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-option-actions {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.13s ease;
}

.project-option:hover .project-option-actions {
  opacity: 1;
}

.project-action-btn {
  width: 26px;
  height: 26px;
  min-height: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--cf-text-tertiary);
  font-size: 14px;

  &:hover:not(:disabled) {
    background: var(--cf-bg-subtle);
    color: var(--cf-text-primary);
  }

  &.danger:hover:not(:disabled) {
    background: var(--cf-error-soft);
    color: var(--cf-error);
  }
}

.project-rename-input {
  width: 100%;
  height: 28px;
  padding: 0 8px;
  border: 1px solid var(--cf-brand);
  border-radius: 7px;
  outline: none;
  background: var(--cf-bg-surface);
  color: var(--cf-text-primary);
  font-size: 13px;
  font-weight: 750;
}

.project-new-btn {
  width: 100%;
  min-height: 34px;
  margin-top: 8px;
  justify-content: center;
  gap: 6px;
  border-style: dashed;
  border-color: var(--cf-border-strong);
  border-radius: 10px;
  background: transparent;
  color: var(--cf-text-secondary);
  font-size: 12px;
  font-weight: 800;

  &:hover:not(:disabled) {
    border-color: var(--cf-brand);
    background: var(--cf-brand-soft);
    color: var(--cf-brand);
  }
}
</style>