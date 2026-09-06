<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { validateApiKey } from '@/utils/apiKeySession'
import { getGatewayBaseUrl } from '@/config'

const { t } = useI18n()

const props = defineProps({
  show: { type: Boolean, default: false },
  keys: { type: Array, default: () => [] }, // [{ key, name }]
})
const emit = defineEmits(['update:show', 'save', 'delete'])

const visible = computed({
  get: () => props.show,
  set: (v) => emit('update:show', v),
})

const newKey = ref('')
const newName = ref('')
const validating = ref(false)

watch(visible, (v) => {
  if (v) {
    newKey.value = ''
    newName.value = ''
  }
})

const mask = (key) => {
  const value = String(key || '')
  if (value.length <= 12) return `${value.slice(0, 4)}****`
  return `${value.slice(0, 6)}********${value.slice(-4)}`
}

const handleSave = async () => {
  const key = newKey.value.trim()
  if (!key) {
    window.$message?.warning(t('settings.apiKeys.enterKey'))
    return
  }
  validating.value = true
  try {
    // 用 /v1/models 探测有效性；网络失败不阻断保存（可能是跨域/端点未配置）
    const base = getGatewayBaseUrl() || window.location.origin
    const ok = await validateApiKey(key, base)
    if (!ok) {
      window.$message?.warning(t('settings.apiKeys.validationFailed'))
    } else {
      window.$message?.success(t('settings.apiKeys.saved'))
    }
    emit('save', { key, name: newName.value.trim() })
    newKey.value = ''
    newName.value = ''
  } finally {
    validating.value = false
  }
}
</script>

<template>
  <n-modal
    v-model:show="visible"
    preset="card"
    :title="$t('settings.apiKeys.title')"
    style="width: 520px"
    :bordered="false"
  >
    <div class="api-key-manager">
      <p class="hint">
        {{ $t('settings.providers.keyHint') }}
        {{ $t('settings.apiKeys.hintEndpoint') }}
      </p>
      <div class="add-form">
        <n-input
          v-model:value="newKey"
          placeholder="sk-..."
          type="password"
          show-password-on="click"
          @keyup.enter="handleSave"
        />
        <n-input v-model:value="newName" :placeholder="$t('settings.apiKeys.namePlaceholder')" class="name-input" />
        <n-button type="primary" :loading="validating" @click="handleSave">{{ $t('settings.apiKeys.validateAndSave') }}</n-button>
      </div>
      <n-empty v-if="!keys.length" :description="$t('settings.apiKeys.empty')" style="margin: 24px 0" />
      <div v-else class="key-list">
        <div v-for="item in keys" :key="item.key" class="key-item">
          <span class="key-name">{{ item.name || 'API Key' }}</span>
          <span class="key-value">{{ mask(item.key) }}</span>
          <n-button text type="error" size="small" @click="emit('delete', item.key)">{{ $t('common.delete') }}</n-button>
        </div>
      </div>
    </div>
  </n-modal>
</template>

<style scoped>
.api-key-manager .hint {
  margin: 0 0 16px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--cf-text-tertiary, #999);
}
.add-form {
  display: flex;
  gap: 8px;
}
.add-form .name-input {
  max-width: 130px;
}
.key-list {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.key-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border: 1px solid var(--cf-border, #eee);
  border-radius: 8px;
}
.key-name {
  flex: 1;
  font-size: 13px;
}
.key-value {
  font-family: monospace;
  font-size: 12px;
  color: var(--cf-text-tertiary, #999);
}
</style>
