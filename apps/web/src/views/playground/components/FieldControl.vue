<template>
  <div class="field-control" :class="{ compact }">
    <label v-if="showLabel" class="field-label">
      <span>{{ field.label || field.key }}</span>
      <span v-if="field.required" class="required-mark">是</span>
      <span v-if="field.key" class="field-key">{{ field.key }}</span>
    </label>

    <n-input
      v-if="controlType === 'textarea'"
      :value="value"
      type="textarea"
      :rows="compact ? 3 : 5"
      :placeholder="field.placeholder || field.description || `请输入${field.label || field.key}`"
      :disabled="disabled"
      @update:value="updateValue"
    />

    <n-input-number
      v-else-if="controlType === 'number' || controlType === 'slider'"
      :value="value"
      :min="field.min"
      :max="field.max"
      :step="field.step || 1"
      :placeholder="field.placeholder"
      :disabled="disabled"
      class="number-input"
      @update:value="updateValue"
    />

    <div v-else-if="controlType === 'switch'" class="boolean-control">
      <button class="chip-option" :class="{ active: value === true }" type="button" :disabled="disabled" @click="updateValue(true)">true</button>
      <button class="chip-option" :class="{ active: value === false }" type="button" :disabled="disabled" @click="updateValue(false)">false</button>
    </div>

    <div v-else-if="usesChipOptions" class="chip-options">
      <button
        v-for="opt in normalizedOptions"
        :key="String(opt.value)"
        class="chip-option"
        :class="{ active: isOptionActive(opt.value) }"
        type="button"
        :disabled="disabled"
        @click="toggleOption(opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>

    <n-select
      v-else-if="controlType === 'select'"
      :value="value"
      :options="normalizedOptions"
      :placeholder="field.placeholder || `请选择${field.label || field.key}`"
      :disabled="disabled"
      clearable
      @update:value="updateValue"
    />

    <div v-else-if="controlType === 'image'" class="image-control">
      <n-input
        :value="imageTextValue"
        :placeholder="field.placeholder || '图片 URL 或上传后的地址'"
        :disabled="disabled"
        @update:value="updateValue"
      />
      <n-upload
        :max="1"
        list-type="image-card"
        :default-file-list="getImageFileList(field.key)"
        accept="image/*"
        :disabled="disabled"
        @change="(data) => $emit('image-upload', field.key, data)"
      >
        <div class="upload-trigger">
          <svg-icon icon="tabler:photo-plus" />
        </div>
      </n-upload>
    </div>

    <div v-else-if="controlType === 'images'" class="upload-control image-list-control">
      <n-upload
        multiple
        :max="field.max || 9"
        list-type="image-card"
        :default-file-list="getImagesFileList(field.key)"
        accept="image/*"
        :disabled="disabled"
        @change="(data) => $emit('images-upload', field.key, data)"
      >
        <div class="upload-trigger">
          <svg-icon icon="tabler:plus" />
        </div>
      </n-upload>
    </div>

    <div v-else-if="controlType === 'file'" class="upload-control file-control">
      <n-upload
        :max="field.limit || field.max || 1"
        :accept="field.accept"
        :disabled="disabled"
        @change="(data) => $emit('file-upload', field.key, data)"
      >
        <n-upload-dragger>
          <div class="file-drop">
            <svg-icon icon="tabler:cloud-upload" />
            <span>{{ field.placeholder || '选择文件' }}</span>
          </div>
        </n-upload-dragger>
      </n-upload>
    </div>

    <n-input
      v-else
      :value="value"
      :placeholder="field.placeholder || field.description || `请输入${field.label || field.key}`"
      :disabled="disabled"
      @update:value="updateValue"
    />

    <p v-if="field.description && !compact" class="field-desc">{{ field.description }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  field: { type: Object, required: true },
  value: { default: undefined },
  compact: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  showLabel: { type: Boolean, default: true },
  formatOptions: { type: Function, default: null },
  getImageFileList: { type: Function, default: () => [] },
  getImagesFileList: { type: Function, default: () => [] },
})

const emit = defineEmits(['update:value', 'image-upload', 'images-upload', 'file-upload'])

const controlType = computed(() => {
  const type = String(props.field.type || props.field.ui || 'text').toLowerCase()
  if (['textarea', 'longtext', 'json'].includes(type)) return 'textarea'
  if (['integer', 'number', 'float', 'slider'].includes(type)) return type === 'slider' ? 'slider' : 'number'
  if (['boolean', 'bool', 'switch'].includes(type)) return 'switch'
  if (['select', 'enum', 'dropdown'].includes(type)) return 'select'
  if (['radio'].includes(type)) return 'radio'
  if (['checkbox', 'multiselect'].includes(type)) return 'checkbox'
  if (['image'].includes(type)) return 'image'
  if (['images'].includes(type)) return 'images'
  if (['file', 'audio', 'video'].includes(type)) return 'file'
  return 'text'
})

const normalizeOption = (opt) => {
  if (typeof opt === 'string' || typeof opt === 'number' || typeof opt === 'boolean') {
    return { label: String(opt), value: opt }
  }
  if (!opt || typeof opt !== 'object') {
    return { label: String(opt ?? ''), value: opt }
  }
  const value = opt.value ?? opt.key ?? opt.name ?? opt.label
  return {
    label: opt.label ?? opt.name ?? String(value),
    value,
  }
}

const normalizedOptions = computed(() => {
  const options = props.field.options || props.field.enum || []
  const formatted = props.formatOptions ? props.formatOptions(options) : options
  return Array.isArray(formatted) ? formatted.map(normalizeOption) : []
})

const usesChipOptions = computed(() => {
  return ['select', 'radio', 'checkbox'].includes(controlType.value) && normalizedOptions.value.length > 0 && normalizedOptions.value.length <= 6
})

const imageTextValue = computed(() => {
  if (typeof props.value === 'string') return props.value
  return ''
})

function updateValue(nextValue) {
  if (props.disabled) return
  emit('update:value', nextValue)
}

function isOptionActive(optionValue) {
  if (Array.isArray(props.value)) return props.value.includes(optionValue)
  return props.value === optionValue
}

function toggleOption(optionValue) {
  if (props.disabled) return
  if (controlType.value === 'checkbox') {
    const current = Array.isArray(props.value) ? props.value : []
    const next = current.includes(optionValue)
      ? current.filter((item) => item !== optionValue)
      : [...current, optionValue]
    updateValue(next)
    return
  }
  updateValue(optionValue)
}
</script>

<style lang="scss" scoped>
.field-control {
  min-width: 0;
}

.field-label {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 6px;
  color: var(--cf-text-secondary);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
}

.required-mark {
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--pg-accent-soft);
  color: var(--pg-accent);
  font-size: 10px;
  font-weight: 650;
}

.field-key {
  margin-left: auto;
  color: var(--cf-text-tertiary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
}

.field-desc {
  margin: 6px 0 0;
  color: var(--cf-text-tertiary);
  font-size: 11px;
  line-height: 1.45;
}

.number-input {
  width: 100%;
}

.chip-options,
.boolean-control {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip-option {
  min-height: 28px;
  max-width: 100%;
  padding: 4px 11px;
  border: 1px solid var(--cf-border);
  border-radius: 8px;
  background: var(--cf-bg-surface);
  color: var(--cf-text-secondary);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s, color 0.15s;

  &:hover:not(:disabled) {
    border-color: var(--pg-accent);
    color: var(--pg-accent);
  }

  &.active {
    border-color: var(--pg-accent);
    background: var(--pg-accent-soft);
    color: var(--pg-accent);
  }
}

.chip-option:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.upload-trigger,
.file-drop {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--cf-text-tertiary);
}

.upload-trigger {
  width: 72px;
  height: 72px;
}

.file-drop {
  padding: 18px;
  font-size: 12px;
}

/* ── 上传控件：统一虚线框 + 蓝色悬停（直接覆盖 Naive 触发器，避免双层边框） ── */
.image-control,
.image-list-control {
  :deep(.n-upload-trigger) {
    border: 1px dashed var(--cf-border-strong) !important;
    border-radius: 8px !important;
    transition: border-color 0.15s, color 0.15s, background-color 0.15s;

    &:hover {
      border-color: var(--pg-accent) !important;
      color: var(--pg-accent);
      background: var(--pg-accent-soft);
    }
  }
}

.file-control {
  :deep(.n-upload-dragger) {
    border: 1px dashed var(--cf-border-strong) !important;
    border-radius: 8px !important;
    transition: border-color 0.15s, color 0.15s;

    &:hover {
      border-color: var(--pg-accent) !important;
      color: var(--pg-accent);
    }
  }
}

/* ── 统一输入控件外观 + 蓝色聚焦态 ── */
:deep(.n-input),
:deep(.n-input-number),
:deep(.n-base-selection) {
  --n-border-radius: 8px !important;
  --n-border: 1px solid var(--cf-border) !important;
  --n-border-hover: 1px solid var(--cf-border-strong) !important;
  --n-border-focus: 1px solid var(--cf-border-strong) !important;
  --n-box-shadow-focus: 0 0 0 3px var(--cf-neutral-soft) !important;
}

:deep(.n-input .n-input__border),
:deep(.n-input .n-input__state-border),
:deep(.n-input-number .n-input__border),
:deep(.n-input-number .n-input__state-border) {
  border-color: var(--cf-border) !important;
}

:deep(.n-input-wrapper),
:deep(.n-base-selection),
:deep(.n-input-number .n-input-wrapper) {
  background: var(--cf-bg-surface) !important;
}
</style>
