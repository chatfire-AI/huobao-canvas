<script setup>
import { defineComponent, h } from "vue"
import {
  NDialogProvider,
  NLoadingBarProvider,
  NMessageProvider,
  NNotificationProvider,
  useDialog,
  useLoadingBar,
  useMessage,
  useNotification,
} from "naive-ui"

function registerNaiveTools() {
  const w = window
  w.$loadingBar = useLoadingBar()
  w.$dialog = useDialog()
  w.$message = useMessage()
  w.$notification = useNotification()
}

const NaiveProviderContent = defineComponent({
  name: "NaiveProviderContent",
  setup() {
    registerNaiveTools()
  },
  render() {
    return h("div")
  },
})
</script>

<template>
  <NLoadingBarProvider>
    <NDialogProvider>
      <!-- 消息/通知层级需高于登录弹窗遮罩（z-index: 9999）及其内的滑块验证弹窗（10001） -->
      <NNotificationProvider :container-style="{ zIndex: 10002 }">
        <NMessageProvider :container-style="{ zIndex: 10002 }">
          <slot />
          <NaiveProviderContent />
        </NMessageProvider>
      </NNotificationProvider>
    </NDialogProvider>
  </NLoadingBarProvider>
</template>
