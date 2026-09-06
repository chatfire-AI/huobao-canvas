<template>
  <n-popover
    v-model:show="open"
    trigger="click"
    placement="top-start"
    :show-arrow="false"
    :disabled="disabled"
    :z-index="2700"
    raw
  >
    <template #trigger>
      <button
        type="button"
        class="model-trigger"
        :class="{ 'is-open': open, 'is-empty': !current }"
        :disabled="disabled"
      >
        <img
          v-if="currentIcon"
          :src="currentIcon"
          class="model-trigger-icon"
          alt=""
          @error="(e) => { e.target.style.display = 'none' }"
        />
        <span class="model-trigger-name">{{ current?.modelName || placeholder }}</span>
        <svg-icon icon="tabler:chevron-down" class="model-trigger-chevron" />
      </button>
    </template>

    <div class="model-picker" @keydown.esc="open = false">
      <div class="model-picker-search">
        <svg-icon icon="tabler:search" />
        <input
          ref="searchInput"
          v-model="query"
          type="text"
          :placeholder="$t('canvas.modelPicker.searchPlaceholder')"
          spellcheck="false"
        />
      </div>
      <div class="model-picker-list">
        <template v-for="group in filteredGroups" :key="group.factory">
          <div class="model-picker-group">
            <span class="group-name">{{ group.factoryLabel }}</span>
            <span class="group-count">{{ group.items.length }}</span>
          </div>
          <button
            v-for="item in group.items"
            :key="item.value"
            type="button"
            class="model-option"
            :class="{ 'is-active': item.value === value }"
            :disabled="item.disabled"
            :title="item.label"
            @click="pick(item)"
          >
            <img
              v-if="item.iconUrl"
              :src="item.iconUrl"
              class="model-option-icon"
              alt=""
              @error="(e) => { e.target.style.display = 'none' }"
            />
            <span v-else class="model-option-icon is-fallback">{{ (item.modelName || '?').slice(0, 1) }}</span>
            <span class="model-option-name">{{ item.modelName }}</span>
            <svg-icon v-if="item.value === value" icon="tabler:check" class="model-option-check" />
          </button>
        </template>
        <div v-if="!filteredGroups.length" class="model-picker-empty">{{ $t('canvas.modelPicker.noMatch') }}</div>
      </div>
    </div>
  </n-popover>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { i18n } from '@/locales'
import { resolveModelIcon } from '@/utils/tools'
import { useTheme } from '@/composables/useTheme'

const { t } = useI18n()

const { isDark } = useTheme()
// 图标主题变体跟随明暗切换（computed 内引用，响应式重算）
const iconTheme = computed(() => (isDark.value ? 'dark' : 'light'))

const props = defineProps({
  options: { type: Array, default: () => [] },
  value: { type: String, default: '' },
  placeholder: { type: String, default: () => i18n.global.t('canvas.modelPicker.selectModel') },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['select'])

const open = ref(false)
const query = ref('')
const searchInput = ref(null)

const FACTORY_LABELS = {
  claude: 'Claude', deepseek: 'DeepSeek', gemini: 'Gemini', minimax: 'MiniMax',
  moonshot: 'Moonshot', openai: 'OpenAI', qwen: 'Qwen', vidu: 'Vidu',
  volcengine: 'Volcengine', xai: 'xAI', zhipu: 'Zhipu', google: 'Google',
}

const factoryLabel = (code) => {
  const key = String(code || '').trim().toLowerCase()
  return FACTORY_LABELS[key] || (code ? String(code) : t('canvas.modelPicker.otherFactory'))
}

// 归一化选项并保留原始顺序(上游已按上线时间倒序)
const items = computed(() => props.options.map((option) => ({
  ...option,
  iconUrl: option.icon ? resolveModelIcon(option.icon, iconTheme.value) : '',
  factoryKey: String(option.factory || '').trim().toLowerCase() || 'other',
})))

const current = computed(() => items.value.find((item) => item.value === props.value) || null)
const currentIcon = computed(() => current.value?.iconUrl || '')

// 按厂商分组,组顺序跟随首个出现的模型(即最新模型的厂商在前)
const groups = computed(() => {
  const map = new Map()
  for (const item of items.value) {
    if (!map.has(item.factoryKey)) {
      map.set(item.factoryKey, { factory: item.factoryKey, factoryLabel: factoryLabel(item.factory), items: [] })
    }
    map.get(item.factoryKey).items.push(item)
  }
  return [...map.values()]
})

const filteredGroups = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return groups.value
  return groups.value
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        String(item.modelName || '').toLowerCase().includes(q)
        || String(item.label || '').toLowerCase().includes(q)
        || group.factoryLabel.toLowerCase().includes(q)
        || group.factory.includes(q)),
    }))
    .filter((group) => group.items.length > 0)
})

watch(open, async (show) => {
  if (show) {
    query.value = ''
    await nextTick()
    searchInput.value?.focus()
  }
})

const pick = (item) => {
  if (item.disabled) return
  emit('select', item.value)
  open.value = false
}
</script>

<style scoped lang="scss">
.model-trigger {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  max-width: 100%;
  height: 32px;
  padding: 0 10px;
  box-sizing: border-box;
  border: 1px solid var(--cf-border);
  border-radius: 9px;
  background: var(--cf-bg-subtle);
  color: var(--cf-text-primary);
  font: inherit;
  font-size: 12px;
  font-weight: 750;
  cursor: pointer;
  transition: border-color 0.14s ease, background 0.14s ease;

  &:hover:not(:disabled), &.is-open {
    border-color: var(--cf-border-strong);
  }
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  &.is-empty .model-trigger-name {
    color: var(--cf-text-tertiary, #8a8f99);
    font-weight: 500;
  }
}
.model-trigger-icon {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  flex-shrink: 0;
}
.model-trigger-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.model-trigger-chevron {
  margin-left: auto;
  flex-shrink: 0;
  width: 13px;
  height: 13px;
  color: var(--cf-text-secondary);
  transition: transform 0.16s ease;
}
.is-open .model-trigger-chevron {
  transform: rotate(180deg);
}

.model-picker {
  width: 264px;
  border: 1px solid var(--cf-border);
  border-radius: 12px;
  background: var(--cf-bg-elevated, rgba(24, 26, 32, 0.96));
  backdrop-filter: blur(16px);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.35);
  overflow: hidden;
}
.model-picker-search {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--cf-border);
  color: var(--cf-text-secondary);

  input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    color: var(--cf-text-primary);
    font: inherit;
    font-size: 12px;

    &::placeholder {
      color: var(--cf-text-tertiary, #8a8f99);
    }
  }
}
.model-picker-list {
  max-height: 300px;
  overflow-y: auto;
  padding: 4px;

  &::-webkit-scrollbar { width: 5px; }
  &::-webkit-scrollbar-thumb { background: var(--cf-border-strong); border-radius: 3px; }
}
.model-picker-group {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 8px 3px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--cf-text-tertiary, #8a8f99);
  text-transform: uppercase;

  .group-count {
    font-weight: 500;
    opacity: 0.7;
  }
}
.model-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--cf-text-primary);
  font: inherit;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s ease;

  &:hover:not(:disabled) {
    background: var(--cf-bg-hover, rgba(255, 255, 255, 0.06));
  }
  &.is-active {
    background: var(--cf-brand-soft, rgba(80, 140, 255, 0.14));
  }
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}
.model-option-icon {
  width: 18px;
  height: 18px;
  border-radius: 5px;
  flex-shrink: 0;

  &.is-fallback {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--cf-bg-subtle);
    color: var(--cf-text-secondary);
    font-size: 11px;
    font-weight: 700;
  }
}
.model-option-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.model-option-check {
  margin-left: auto;
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  color: var(--cf-brand, #6c9bff);
}
.model-picker-empty {
  padding: 18px 0;
  text-align: center;
  font-size: 12px;
  color: var(--cf-text-tertiary, #8a8f99);
}
</style>
