<template>
  <n-dropdown
    trigger="click"
    :options="options"
    @select="setLocale"
  >
    <button type="button" class="locale-switcher" :title="$t('common.language')">
      <svg-icon icon="tabler:language" />
      <span>{{ currentLocaleLabel }}</span>
    </button>
  </n-dropdown>
</template>

<script setup>
import { computed } from 'vue'
import { NDropdown } from 'naive-ui'
import { useLocale } from '@/composables/useLocale'

const { locale, setLocale, availableLocales, currentLocaleLabel } = useLocale()

const options = computed(() =>
  availableLocales.map((l) => ({ label: l.label, key: l.key }))
)
</script>

<style scoped lang="scss">
.locale-switcher {
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 10px;
  border: 1px solid var(--cf-border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--cf-bg-elevated) 88%, transparent);
  color: var(--cf-text-tertiary);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition: color 0.13s ease, border-color 0.13s ease, background 0.13s ease;

  svg { width: 15px; height: 15px; }

  &:hover {
    color: var(--cf-text-primary);
    border-color: var(--cf-border-strong);
    background: var(--cf-bg-subtle);
  }
}
</style>
