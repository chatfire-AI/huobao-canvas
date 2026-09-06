<template>
  <form class="canvas-prompt-dock" @submit.prevent="submit">
    <div class="desktop-editor">
      <div class="dock-head">
        <span class="dock-type-chip" :class="dockTypeClass">
          <svg-icon :icon="dockMeta.icon" />
        </span>
        <strong class="dock-title">{{ node?.data?.title || dockMeta.label }}</strong>
        <span class="reference-title">{{ $t('canvas.promptDock.referenceTitle') }}</span>
        <span class="reference-note">{{ $t('canvas.promptDock.referenceNote') }}</span>
        <div class="dock-head-right">
          <label v-if="canUploadAsset" class="reference-add" :class="{ 'is-disabled': running }">
            <svg-icon icon="tabler:plus" />
            {{ $t('canvas.promptDock.addReference') }}
            <input type="file" accept="image/*" :disabled="running" @change="handleFileChange" />
          </label>
          <span class="dock-hint">{{ $t('canvas.promptDock.hint') }}</span>
        </div>
      </div>

      <!-- 参考内容区:已连接的素材缩略图 -->
      <div class="reference-section">
        <div v-if="connectedInputs.length" class="reference-strip" :aria-label="$t('canvas.promptDock.referenceAria')">
          <n-popover
            v-for="(input, inputIndex) in connectedInputs"
            :key="input.id"
            trigger="click"
            placement="top"
            :z-index="2700"
            :disabled="!!input.url"
            :style="{ maxWidth: '380px' }"
          >
            <template #trigger>
              <div
                class="reference-item"
                :class="{ 'is-text-ref': !input.url }"
                :title="input.url ? input.label : $t('canvas.promptDock.clickToView', { label: input.label })"
              >
                <img v-if="input.url" :src="input.url" :alt="input.label" />
                <span v-else class="reference-fallback">
                  <svg-icon :icon="getCanvasPromptDockMeta(input.type).icon" />
                  <span>{{ input.text || input.label }}</span>
                </span>
                <span v-if="input.type !== 'textNode'" class="reference-index">{{ $t('canvas.promptDock.imageRef', { n: mediaInputIndex(inputIndex) }) }}</span>
              </div>
            </template>
            <div class="reference-pop">
              <div class="reference-pop-title">{{ input.label }}</div>
              <div class="reference-pop-text">{{ input.text || $t('canvas.promptDock.noContent') }}</div>
            </div>
          </n-popover>
        </div>
      </div>

      <div class="prompt-area">
        <div v-if="mentionOpen" class="mention-menu" role="listbox" :aria-label="$t('canvas.promptDock.mentionAria')">
          <button
            v-for="(item, index) in mentionItems"
            :key="item.id"
            type="button"
            class="mention-item"
            :class="{ 'is-active': index === mentionIndex }"
            role="option"
            :aria-selected="index === mentionIndex"
            @mousedown.prevent="pickMention(item)"
            @mouseenter="mentionIndex = index"
          >
            <span class="mention-icon" :style="mentionIconStyle(item.type)">
              <img v-if="item.thumb" :src="item.thumb" alt="" />
              <svg-icon v-else :icon="mentionIcon(item.type)" />
            </span>
            <span class="mention-label">{{ item.label }}</span>
            <span v-if="item.snippet" class="mention-snippet">{{ item.snippet }}</span>
            <span class="mention-type">{{ mentionTypeLabel(item.type) }}</span>
          </button>
          <div v-if="!mentionItems.length" class="mention-empty">{{ $t('canvas.promptDock.mentionEmpty') }}</div>
        </div>
        <textarea
          ref="promptInput"
          v-model="prompt"
          class="prompt-input"
          :placeholder="promptPlaceholder"
          :aria-label="$t('canvas.promptDock.promptAria', { label: dockMeta.label })"
          :disabled="running"
          @input="handlePromptInput"
          @keydown="handlePromptKeydown"
        />
        <div class="editor-state" aria-live="polite">
          <span v-if="node?.data?.payload?.notice" class="notice-copy">
            <svg-icon icon="tabler:info-circle" />
            {{ node.data.payload.notice }}
          </span>
          <span v-if="node?.data?.payload?.error" class="error-copy">
            <svg-icon icon="tabler:alert-circle" />
            {{ node.data.payload.error }}
          </span>
          <span v-else-if="!node?.data?.payload?.notice && (running || ['running', 'waiting'].includes(node?.data?.status))" class="waiting-copy">
            <svg-icon icon="tabler:loader-2" />
            {{ pollingTaskId ? $t('canvas.promptDock.waitingTask') : $t('canvas.promptDock.generating') }}
          </span>
        </div>
      </div>

      <div class="editor-footer">
        <div class="model-control">
          <ModelPicker
            :options="modelOptions"
            :value="selectedModel"
            :placeholder="modelSelectPlaceholder"
            :disabled="running || !modelOptions.length"
            @select="$emit('select-model', $event || '')"
          />
        </div>

        <div class="primary-controls">
          <!-- LibTV 式：一个汇总 chip，点击展开统一参数面板 -->
          <n-popover
            v-if="sizeFields.length || countField"
            trigger="click"
            placement="top-start"
            :show-arrow="false"
            :disabled="running"
            :z-index="2700"
            raw
          >
            <template #trigger>
              <button type="button" class="param-summary-chip" :disabled="running">
                <span class="param-summary-text">{{ paramsSummary }}</span>
                <svg-icon icon="tabler:chevron-up" />
              </button>
            </template>
            <div class="params-panel">
              <div v-for="field in sizeFields" :key="field.key" class="params-group">
                <div class="params-group-label">{{ field.label || field.key }}</div>
                <div
                  class="params-group-options"
                  :class="{ 'is-ratio-grid': isRatioField(field) }"
                >
                  <button
                    v-for="option in props.formatOptions(field.options || field.enum || [])"
                    :key="String(option.value)"
                    type="button"
                    class="params-option"
                    :class="{ active: String(formData[field.key]) === String(option.value) }"
                    :disabled="running"
                    @click="updateFormField(field.key, option.value)"
                  >
                    <span v-if="isRatioField(field)" class="ratio-icon" :style="ratioIconStyle(option.value)" />
                    {{ option.label }}
                  </button>
                </div>
              </div>
              <div v-if="countField" class="params-group">
                <div class="params-group-label">{{ countField.label || $t('canvas.promptDock.countLabel') }}</div>
                <div class="params-group-options">
                  <button
                    v-for="option in countOptions"
                    :key="String(option.value)"
                    type="button"
                    class="params-option"
                    :class="{ active: String(formData[countField.key]) === String(option.value) }"
                    :disabled="running"
                    @click="updateFormField(countField.key, option.value)"
                  >
                    {{ $t('canvas.promptDock.countValue', { n: option.label }) }}
                  </button>
                </div>
              </div>
            </div>
          </n-popover>
        </div>

        <div class="footer-end">
          <span v-if="node?.data?.payload?.requestMeta?.estimatedCost != null" class="cost-hint">
            {{ node.data.payload.requestMeta.estimatedCost }}
          </span>

          <button
            class="send-button"
            :class="{ 'is-loading': running }"
            type="submit"
            :disabled="!canSubmit"
            :title="running ? $t('canvas.promptDock.generatingShort') : (hasResult ? $t('canvas.promptDock.regenerateTitle') : $t('canvas.promptDock.generate'))"
            :aria-label="$t('canvas.promptDock.generate')"
          >
            <svg-icon :icon="running ? 'tabler:loader-2' : (hasResult ? 'tabler:refresh' : 'tabler:sparkles')" />
            <span>{{ running ? $t('canvas.promptDock.generatingShort') : (hasResult ? $t('canvas.promptDock.regenerate') : $t('canvas.promptDock.generate')) }}</span>
          </button>
        </div>
      </div>
    </div>

    <div class="desktop-notice">
      <svg-icon icon="tabler:device-desktop" />
      <strong>{{ $t('canvas.promptDock.desktopOnly') }}</strong>
      <span>{{ $t('canvas.promptDock.desktopWidth') }}</span>
    </div>
  </form>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ModelPicker from '@/components/ModelPicker.vue'
import { CANVAS_NODE_TYPES, NODE_MODEL_TYPE_MAP, getCanvasPromptDockMeta } from '../constants/nodeTypes'
import { partitionCanvasFields } from '../utils/editorFields'

const { t } = useI18n()

const props = defineProps({
  node: { type: Object, default: null },
  connectedInputs: { type: Array, default: () => [] },
  mentionableNodes: { type: Array, default: () => [] },
  modelOptions: { type: Array, default: () => [] },
  selectedModel: { type: String, default: '' },
  selectedApiKey: { type: String, default: '' },
  schemaFields: { type: Array, default: () => [] },
  formData: { type: Object, default: () => ({}) },
  formatOptions: { type: Function, required: true },
  running: { type: Boolean, default: false },
  pollingTaskId: { type: String, default: '' },
})

const emit = defineEmits([
  'submit',
  'select-model',
  'update-prompt',
  'update-form-data',
  'asset-upload',
])

const prompt = ref('')
const dockMeta = computed(() => getCanvasPromptDockMeta(props.node?.type))
// 节点已有成功结果:按钮切换为「重新生成」(点击后由画布复制副本节点到下方执行,不覆盖原结果)
const hasResult = computed(() => props.node?.data?.status === 'success'
  && Boolean(props.node?.data?.payload?.parsedResults?.length || props.node?.data?.payload?.url))
// placeholder 只保留引导语，快捷键说明统一由头部 hint 展示，避免重复
const promptPlaceholder = computed(() => (
  String(dockMeta.value.placeholder || '').split(/，|,/)[0] || t('canvas.promptDock.placeholderFallback')
))
const dockTypeClass = computed(() => ({
  [CANVAS_NODE_TYPES.TEXT]: 'is-text',
  [CANVAS_NODE_TYPES.IMAGE]: 'is-image',
  [CANVAS_NODE_TYPES.VIDEO]: 'is-video',
}[props.node?.type] || ''))
const partitionedFields = computed(() => partitionCanvasFields(props.schemaFields, NODE_MODEL_TYPE_MAP[props.node?.type]))
const countField = computed(() => partitionedFields.value.primary.find((field) => (
  ['n', 'count', 'image_count'].includes(field.key)
)) || null)
const sizeFields = computed(() => partitionedFields.value.primary.filter((field) => field !== countField.value))
const countOptions = computed(() => {
  const field = countField.value
  if (!field) return []
  const configured = props.formatOptions(field.options || field.enum || [])
  if (configured.length) return configured.slice(0, 3)
  const min = Math.max(1, Number(field.min) || 1)
  const max = Math.max(min, Math.min(3, Number(field.max) || 3))
  return Array.from({ length: max - min + 1 }, (_, index) => {
    const value = min + index
    return { label: String(value), value }
  })
})
// 单个参数的当前值文案
const fieldValueLabel = (field) => {
  const value = props.formData[field.key]
  if (value === undefined || value === null || value === '') return t('canvas.promptDock.defaultValue')
  const options = props.formatOptions(field.options || field.enum || [])
  const matched = options.find((option) => String(option.value) === String(value))
  return matched?.label ?? value
}

// LibTV 式汇总：所有主栏参数当前值用 " · " 连接
const paramsSummary = computed(() => {
  const parts = sizeFields.value.map((field) => fieldValueLabel(field))
  if (countField.value) {
    const countVal = props.formData[countField.value.key]
    if (countVal != null && countVal !== '') parts.push(t('canvas.promptDock.countValue', { n: countVal }))
  }
  return parts.filter(Boolean).join(' · ') || t('canvas.promptDock.paramsSummary')
})

// 比例类字段：面板中用网格+矩形图标展示
const RATIO_FIELD_KEYS = new Set(['ratio', 'aspect_ratio', 'aspectRatio'])
const isRatioField = (field) => RATIO_FIELD_KEYS.has(field.key)

// 比例值 → 矩形图标尺寸（如 "16:9" → 宽矩形）
const ratioIconStyle = (value) => {
  const str = String(value || '')
  const match = str.match(/(\d+)\s*[:：]\s*(\d+)/)
  if (!match) return { width: '16px', height: '16px' }
  const [, w, h] = match.map(Number)
  const ratio = w / h
  if (ratio >= 1) {
    return { width: '18px', height: `${Math.max(6, Math.round(18 / ratio))}px` }
  }
  return { width: `${Math.max(6, Math.round(18 * ratio))}px`, height: '18px' }
}
const hasNodeImage = computed(() => {
  const payload = props.node?.data?.payload || {}
  return Boolean(payload.url || payload.parsedResults?.length)
})
const canUploadAsset = computed(() => props.node?.type === CANVAS_NODE_TYPES.IMAGE && !hasNodeImage.value)
const modelSelectPlaceholder = computed(() => (
  props.modelOptions.length ? dockMeta.value.modelPlaceholder : t('canvas.promptDock.noModel', { label: dockMeta.value.label })
))
// 有结果时允许空输入直接「重新生成」(沿用节点已有提示词)
const canSubmit = computed(() => (prompt.value.trim().length > 0 || hasResult.value) && !props.running)

// ── @ 引用节点：输入 @ 弹出已连接的媒体素材（图1/图2…），选中插入「图N」位置标记 ──
const promptInput = ref(null)
const mentionOpen = ref(false)
const mentionIndex = ref(0)
const mentionStart = ref(-1)
const mentionQuery = ref('')

watch(
  [
    () => props.node?.id,
    () => props.node?.data?.payload?.prompt,
  ],
  ([, value]) => {
    const next = value || ''
    // 仅当外部值与本地产值不同才同步（输入过程中的回写不应关闭 @ 引用菜单）
    if (next !== prompt.value) {
      prompt.value = next
      mentionOpen.value = false
    }
  },
  { immediate: true },
)

const mentionItems = computed(() => {
  const query = mentionQuery.value.trim().toLowerCase()
  return props.mentionableNodes
    .filter((item) => !query || item.label.toLowerCase().includes(query))
    .slice(0, 8)
})

const MENTION_TYPE_META = {
  [CANVAS_NODE_TYPES.TEXT]: { icon: 'tabler:text-caption', labelKey: 'canvas.nodeTypes.text' },
  [CANVAS_NODE_TYPES.IMAGE]: { icon: 'tabler:photo', labelKey: 'canvas.nodeTypes.image' },
  [CANVAS_NODE_TYPES.VIDEO]: { icon: 'tabler:video', labelKey: 'canvas.nodeTypes.video' },
}

const mentionIcon = (type) => MENTION_TYPE_META[type]?.icon || 'tabler:circle'
const mentionTypeLabel = (type) => t(MENTION_TYPE_META[type]?.labelKey || 'canvas.nodeTypes.node')
// 媒体参考序号:只数图片/视频节点(与请求 images[] 注入顺序一致)
const mediaInputIndex = (index) =>
  (props.connectedInputs || []).slice(0, index + 1).filter((input) => input.type !== 'textNode').length
const mentionIconStyle = () => ({
  color: 'var(--cf-text-tertiary)',
  background: 'var(--cf-bg-subtle)',
})

function handlePromptInput(event) {
  const el = event.target
  emit('update-prompt', el.value)
  const caret = el.selectionStart ?? el.value.length
  const beforeCaret = el.value.slice(0, caret)
  const at = beforeCaret.lastIndexOf('@')
  // @ 后未换行且未超出光标即视为正在输入引用；支持按节点名继续过滤
  if (at >= 0 && !beforeCaret.slice(at + 1).includes('\n') && props.mentionableNodes.length) {
    mentionStart.value = at
    mentionQuery.value = beforeCaret.slice(at + 1)
    mentionIndex.value = 0
    mentionOpen.value = true
  } else {
    mentionOpen.value = false
  }
}

function pickMention(item) {  if (!item) return
  const el = promptInput.value
  const caret = el?.selectionStart ?? prompt.value.length
  // @ 引用替换为「图N」位置标记(即梦式):N = 该素材在已连接媒体参考中的序号
  // (与「参考内容」条上的 图1/图2… 一致),模型可理解"图1/图2"指代关系
  const token = t('canvas.promptDock.imageRef', { n: item.mediaIndex || 1 })
  const before = prompt.value.slice(0, mentionStart.value)
  const after = prompt.value.slice(caret)
  const cleaned = before + `${token} ` + after
  prompt.value = cleaned
  emit('update-prompt', cleaned)
  mentionOpen.value = false
  nextTick(() => {
    if (!el) return
    el.focus()
    const pos = before.length + token.length + 1
    el.setSelectionRange(pos, pos)
  })
}

function handlePromptKeydown(event) {
  if (mentionOpen.value) {
    const count = mentionItems.value.length
    if (event.key === 'ArrowDown' && count) {
      event.preventDefault()
      mentionIndex.value = (mentionIndex.value + 1) % count
      return
    }
    if (event.key === 'ArrowUp' && count) {
      event.preventDefault()
      mentionIndex.value = (mentionIndex.value - 1 + count) % count
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      event.stopPropagation()
      const item = mentionItems.value[mentionIndex.value]
      if (item) pickMention(item)
      else mentionOpen.value = false
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      mentionOpen.value = false
      return
    }
  }
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    submit()
  }
}

function updateFormField(key, value) {
  if (props.running) return
  emit('update-form-data', {
    ...props.formData,
    [key]: value,
  })
}

function handleFileChange(event) {
  if (props.running) return
  const file = event.target.files?.[0]
  if (file) emit('asset-upload', file)
  event.target.value = ''
}

function getImageFileList(key) {
  const value = props.formData[key]
  if (!value || value instanceof File) return []
  return [{ id: key, name: 'image', status: 'finished', url: Array.isArray(value) ? value[0] : value }]
}

function getImagesFileList(key) {
  const urls = props.formData[key]
  if (!urls || !Array.isArray(urls)) return []
  return urls.filter((url) => typeof url === 'string').map((url, index) => ({
    id: `${key}_${index}`,
    name: `image_${index}`,
    status: 'finished',
    url,
  }))
}

function submit() {
  // 重新生成允许空输入:回退到节点已保存的提示词
  const value = prompt.value.trim()
    || (hasResult.value ? String(props.node?.data?.payload?.prompt || '').trim() : '')
  if (!value || props.running) return

  emit('submit', {
    prompt: value,
    modelName: props.selectedModel,
    params: { ...props.formData },
    shouldRun: Boolean(props.selectedModel && props.selectedApiKey),
  })
}
</script>

<style scoped lang="scss">
// ── 提示词码头：底部居中悬浮命令条 ──
.canvas-prompt-dock {
  position: absolute;
  z-index: 8;
  width: min(720px, calc(100% - 300px));
  min-height: 184px; // dock-head(~40) + textarea(90) + footer(~50) + padding(24)
  box-sizing: border-box;
  margin: 0;
  padding: 12px 14px;
  border: 1px solid var(--cf-border);
  border-radius: 16px;
  background: color-mix(in srgb, var(--cf-bg-elevated) 95%, transparent);
  box-shadow: var(--cf-shadow-lg);
  color: var(--cf-text-primary);
  transform: translateX(-50%);
}

// 本组件内所有可聚焦元素都不要全局的 2px 品牌色描边（App.vue :focus）
.canvas-prompt-dock :focus,
.canvas-prompt-dock :focus-visible {
  outline: none !important;
  box-shadow: none !important;
}

.desktop-editor {
  min-height: 158px; // 比外层 min-height 少 26px（上下 padding + border）
  display: flex;
  flex-direction: column;
}

// ── 弹窗头：节点类型 + 标题 ──
.dock-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--cf-border);
}

.dock-type-chip {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 8px;
  font-size: 14px;
  background: var(--cf-bg-subtle);
  color: var(--cf-text-tertiary);
}

.dock-title {
  min-width: 0;
  overflow: hidden;
  color: var(--cf-text-primary);
  font-size: 13px;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dock-hint {
  flex-shrink: 0;
  color: var(--cf-text-tertiary);
  font-size: 10.5px;
}

.dock-head-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

// ── 参考内容区(缩略图条) ──
.reference-section {
  padding: 4px 0 2px;
}

.reference-title {
  flex-shrink: 0;
  color: var(--cf-text-secondary);
  font-size: 11px;
  font-weight: 700;
}

.reference-note {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  color: var(--cf-text-tertiary);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reference-add {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 8px;
  border: 1px solid var(--cf-border-strong);
  border-radius: 7px;
  background: var(--cf-bg-subtle);
  color: var(--cf-text-secondary);
  font-size: 11px;
  font-weight: 750;
  cursor: pointer;
  transition: border-color 0.14s ease, color 0.14s ease;

  svg {
    width: 13px;
    height: 13px;
  }

  &:hover {
    border-color: var(--cf-brand);
    color: var(--cf-brand);
  }

  &.is-disabled {
    opacity: 0.45;
    pointer-events: none;
  }

  input {
    display: none;
  }
}

.reference-strip {
  min-height: 36px;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding-top: 4px;
  overflow-x: auto;
  scrollbar-width: none;
}

.reference-strip::-webkit-scrollbar,
.primary-controls::-webkit-scrollbar {
  display: none;
}

.reference-item {
  position: relative;
  width: 48px;
  height: 36px;
  flex: 0 0 48px;
  overflow: hidden;
  border: 1px solid var(--cf-border);
  border-radius: 9px;
  background: var(--cf-bg-subtle);
}

// 「图N」序号徽标:与提示词中的图N 标记、请求 images[] 顺序一致
.reference-index {
  position: absolute;
  left: 2px;
  bottom: 2px;
  padding: 0 4px;
  border-radius: 5px;
  background: rgba(10, 12, 16, 0.72);
  color: #fff;
  font-size: 9.5px;
  font-weight: 700;
  line-height: 1.5;
}

.reference-item img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

// 文本类引用：可点击弹出全文
.reference-item.is-text-ref {
  cursor: pointer;
  transition: border-color 0.15s ease;

  &:hover {
    border-color: var(--cf-brand);
  }
}

.reference-pop {
  .reference-pop-title {
    margin-bottom: 6px;
    font-size: 12px;
    font-weight: 600;
    color: var(--cf-text-secondary);
  }

  .reference-pop-text {
    max-height: 260px;
    overflow: auto;
    font-size: 12.5px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
  }
}

.reference-fallback {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  padding: 7px;
  color: var(--cf-text-tertiary);

  svg {
    width: 16px;
    height: 16px;
  }

  span {
    display: -webkit-box;
    overflow: hidden;
    font-size: 9.5px;
    line-height: 1.3;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }
}

.prompt-area {
  min-height: 0;
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 6px 0 2px;
}

// ── @ 引用节点菜单 ──
.mention-menu {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 0;
  z-index: 2700;
  min-width: 240px;
  max-width: 100%;
  max-height: 264px;
  overflow-y: auto;
  padding: 6px;
  border: 1px solid var(--cf-border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--cf-bg-elevated) 97%, transparent);
  box-shadow: var(--cf-shadow-lg);
}

.mention-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 9px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--cf-text-primary);
  text-align: left;
  cursor: pointer;

  &.is-active {
    background: var(--cf-bg-subtle);
  }
}

.mention-icon {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.mention-snippet {
  flex-shrink: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--cf-text-tertiary);
  font-size: 11px;
}

.mention-label {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  font-size: 12.5px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mention-type {
  flex-shrink: 0;
  color: var(--cf-text-tertiary);
  font-size: 11px;
}

.mention-empty {
  padding: 12px;
  color: var(--cf-text-tertiary);
  font-size: 12px;
  text-align: center;
}

.prompt-input {
  width: 100%;
  min-height: 90px; // 4行 × 22.5px(14.5px × 1.55)
  flex: 1;
  box-sizing: border-box;
  padding: 0;
  border: 0;
  outline: 0;
  resize: none;
  background: transparent;
  color: var(--cf-text-primary);
  font: inherit;
  font-size: 14.5px;
  line-height: 1.55;
  caret-color: var(--cf-brand);
}

.prompt-input:focus,
.prompt-input:focus-visible {
  outline: none !important;
  box-shadow: none !important;
}

.prompt-input::placeholder {
  color: var(--cf-text-tertiary);
}

.prompt-input:disabled {
  color: var(--cf-text-tertiary);
  cursor: not-allowed;
}

.editor-state {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 20px;
  flex-wrap: wrap;
}

.notice-copy,
.error-copy,
.waiting-copy {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 700;
}

.notice-copy {
  color: var(--cf-warning);
}

.error-copy {
  color: var(--cf-error);
}

.waiting-copy {
  color: var(--cf-text-tertiary);

  svg {
    animation: dock-spin 0.9s linear infinite;
  }
}

@keyframes dock-spin {
  to {
    transform: rotate(360deg);
  }
}

// ── 底部工具行 ──
.editor-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--cf-border);
}

.model-control {
  min-width: 0;
  flex: 0 1 250px;
}

.primary-controls {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
}

// ── LibTV 式：汇总 chip + 统一参数面板 ──
.param-summary-chip {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 30px;
  padding: 0 10px;
  box-sizing: border-box;
  border: 1px solid var(--cf-border);
  border-radius: 9px;
  background: var(--cf-bg-subtle);
  color: var(--cf-text-primary);
  font: inherit;
  font-size: 11.5px;
  font-weight: 750;
  white-space: nowrap;
  cursor: pointer;
  transition: border-color 0.14s ease, background 0.14s ease;

  svg {
    width: 12px;
    height: 12px;
    color: var(--cf-text-tertiary);
  }

  &:hover:not(:disabled) {
    border-color: var(--cf-border-strong);
    background: var(--cf-bg-elevated);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
}

.param-summary-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

// 参数面板：分组 + 选项按钮
.params-panel {
  min-width: 280px;
  max-width: 360px;
  max-height: 400px;
  overflow-y: auto;
  padding: 14px;
  border: 1px solid var(--cf-border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--cf-bg-elevated) 97%, transparent);
  box-shadow: var(--cf-shadow-lg);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.params-group-label {
  margin-bottom: 8px;
  color: var(--cf-text-secondary);
  font-size: 12px;
  font-weight: 700;
}

.params-group-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;

  &.is-ratio-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 6px;
  }
}

.params-option {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 52px;
  height: 32px;
  padding: 4px 10px;
  box-sizing: border-box;
  border: 1px solid var(--cf-border);
  border-radius: 9px;
  background: var(--cf-bg-subtle);
  color: var(--cf-text-secondary);
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition: border-color 0.13s ease, color 0.13s ease, background 0.13s ease;

  // 比例字段：图标在上文字在下
  .is-ratio-grid & {
    flex-direction: column;
    height: 44px;
    padding: 4px 6px;
  }

  &:hover:not(:disabled) {
    border-color: var(--cf-border-strong);
    color: var(--cf-text-primary);
  }

  &.active {
    border-color: var(--cf-brand);
    background: color-mix(in srgb, var(--cf-brand) 12%, transparent);
    color: var(--cf-brand);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
}

.ratio-icon {
  display: block;
  border: 1.5px solid currentColor;
  border-radius: 2px;
  opacity: 0.7;
}

.footer-end {
  margin-left: auto;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.cost-hint {
  color: var(--cf-text-tertiary);
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.send-button {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 34px;
  min-width: 76px;
  padding: 0 16px;
  border: 0;
  border-radius: 11px;
  background: linear-gradient(135deg, var(--cf-brand) 0%, var(--cf-brand-hover) 100%);
  color: var(--cf-text-on-brand);
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 14px color-mix(in srgb, var(--cf-brand) 42%, transparent);
  transition: transform 0.14s ease, box-shadow 0.14s ease, filter 0.14s ease;

  svg {
    width: 15px;
    height: 15px;
  }

  .waiting-copy & svg,
  &.is-loading svg {
    animation: dock-spin 0.9s linear infinite;
  }
}

.send-button:hover:not(:disabled) {
  filter: brightness(1.05);
  box-shadow: 0 6px 18px color-mix(in srgb, var(--cf-brand) 52%, transparent);
  transform: translateY(-1px);
}

.send-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
  box-shadow: none;
}

// ── 桌面端提示 ──
.desktop-notice {
  display: none;
  align-items: center;
  gap: 8px;
  padding: 14px;
  border: 1px dashed var(--cf-border-strong);
  border-radius: 12px;
  color: var(--cf-text-tertiary);
  font-size: 12px;

  strong {
    color: var(--cf-text-primary);
    font-weight: 800;
  }

  span {
    margin-left: auto;
    font-size: 11px;
  }
}

// 模型选项（下拉列表内）
:deep(.cf-model-option) {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

:deep(.cf-model-option-icon) {
  flex-shrink: 0;
  border-radius: 4px;
}

:deep(.cf-model-option-name) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 1100px) {
  .canvas-prompt-dock {
    width: calc(100% - 24px);
  }

  .desktop-notice {
    display: flex;
  }

  .desktop-editor {
    display: none;
  }
}
</style>