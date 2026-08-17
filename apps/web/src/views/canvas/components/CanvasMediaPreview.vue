<template>
  <teleport to="body">
    <transition name="preview-fade">
      <div
        v-if="url"
        class="media-preview-mask"
        @click="close"
        @keydown.esc="close"
      >
        <button type="button" class="preview-close" title="关闭 (Esc)" @click.stop="close">
          <svg-icon icon="tabler:x" />
        </button>
        <img
          v-if="type === 'image'"
          class="preview-media"
          :src="url"
          alt="预览"
          @click.stop
        />
        <video
          v-else-if="type === 'video'"
          class="preview-media"
          :src="url"
          controls
          controlslist="nofullscreen"
          disablepictureinpicture
          autoplay
          @click.stop
          @dblclick.stop.prevent
        />
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { onBeforeUnmount, watch } from 'vue'

const props = defineProps({
  url: { type: String, default: '' },
  type: { type: String, default: 'image' }, // image | video
})
const emit = defineEmits(['close'])

const close = () => emit('close')

const onKeydown = (event) => {
  if (event.key === 'Escape') close()
}

watch(() => props.url, (value) => {
  if (value) document.addEventListener('keydown', onKeydown)
  else document.removeEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<style scoped lang="scss">
.media-preview-mask {
  position: fixed;
  inset: 0;
  z-index: 4000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(8, 10, 14, 0.82);
  backdrop-filter: blur(10px);
  cursor: zoom-out;
}

.preview-media {
  max-width: 92vw;
  max-height: 88vh;
  border-radius: 12px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
  cursor: default;
  object-fit: contain;
}

.preview-close {
  position: absolute;
  top: 18px;
  right: 18px;
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  transition: background 0.14s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.16);
  }
}

.preview-fade-enter-active,
.preview-fade-leave-active {
  transition: opacity 0.18s ease;
}
.preview-fade-enter-from,
.preview-fade-leave-to {
  opacity: 0;
}
</style>
