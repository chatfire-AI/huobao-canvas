<script setup>
import { computed, useAttrs } from "vue";
import { Icon } from "@iconify/vue";

const props = defineProps({
  icon: String,
  disabled: Boolean,
});

const attrs = useAttrs();

const bindAttrs = computed(() => {
  return {
    style: attrs.style || "",
    class: attrs.class || "",
  };
});
</script>

<template>
  <Icon class="svg-icon" :class="[disabled]"  :icon="icon || ''" v-bind="bindAttrs" />
</template>
<style lang="scss" scoped>
.svg-icon {
  cursor: pointer;
  border-radius: 5px;

  // &.has-hover:hover {
  //   color: #3c3c3c;
  // }
  &:hover {
    color: var(--cf-text-secondary);
  }
  &.disabled {
    cursor: not-allowed;
    color: var(--cf-text-tertiary) !important;
  }
}

</style>
