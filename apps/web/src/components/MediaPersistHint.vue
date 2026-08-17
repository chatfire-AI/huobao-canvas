<template>
  <p class="media-persist-hint">
    <svg-icon icon="tabler:cloud-check" />
    <span>素材已转存云端 · 保留 {{ MEDIA_EXPIRE_DAYS }} 天，请及时下载保存</span>
  </p>
</template>

<script setup>
import { MEDIA_EXPIRE_DAYS } from '@/composables/useMediaStorage'
</script>

<style scoped>
.media-persist-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 4px 2px 0;
  font-size: 12px;
  color: var(--cf-text-tertiary, #8a8f99);
}
</style>
