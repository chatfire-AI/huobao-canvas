<template>
  <div class="canvas-group-node">
    <div class="group-title">
      <span><svg-icon icon="tabler:category" /></span>
      <strong>{{ data.title || '分组' }}</strong>
    </div>
    <span class="group-layout">自由布局</span>
  </div>
</template>

<script setup>
defineProps({
  data: { type: Object, required: true },
})
</script>

<style scoped lang="scss">
.canvas-group-node {
  width: 100%;
  height: 100%;
  min-width: 280px;
  min-height: 180px;
  position: relative;
  box-sizing: border-box;
  border: 1.5px dashed var(--cf-border-strong);
  border-radius: 16px;
  background:
    color-mix(in srgb, var(--cf-brand) 2.5%, transparent),
    var(--cf-neutral-soft);
  color: var(--cf-text-tertiary);
  transition: border-color 0.16s ease, background 0.16s ease, box-shadow 0.16s ease;
}

.canvas-group-node:hover {
  border-color: var(--cf-brand);
  background: var(--cf-brand-soft);
  box-shadow: var(--cf-shadow-md);
}

.group-title {
  position: absolute;
  top: 10px;
  left: 12px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  max-width: calc(100% - 120px);
  padding: 4px 10px 4px 8px;
  border: 1px solid var(--cf-border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--cf-bg-elevated) 95%, transparent);
  color: var(--cf-text-secondary);
  box-shadow: var(--cf-shadow-sm);
}

.group-title span {
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--cf-brand);
}

.group-title strong {
  overflow: hidden;
  font-size: 11.5px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-layout {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--cf-bg-subtle);
  color: var(--cf-text-tertiary);
  font-size: 10.5px;
  font-weight: 750;
}
</style>
