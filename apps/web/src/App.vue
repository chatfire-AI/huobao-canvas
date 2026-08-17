<script setup>
import { NConfigProvider } from "naive-ui"
import { zhCN, dateZhCN } from "naive-ui"
import NaiveProvider from "@/components/common/NaiveProvider/index.vue"
import { useTheme } from "@/composables/useTheme"

const { theme, themeOverrides, isDark } = useTheme()
</script>

<template>
  <n-config-provider
    class="app-container"
    :class="{ 'dark-mode': isDark }"
    :theme="theme"
    :theme-overrides="themeOverrides"
    :locale="zhCN"
    :date-locale="dateZhCN"
  >
    <NaiveProvider>
      <router-view />
    </NaiveProvider>
  </n-config-provider>
</template>

<style scoped>
.app-container {
  height: 100vh;
  width: 100vw;
  background: var(--cf-bg-page);
  color: var(--cf-text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  overflow: hidden;
  position: relative;
}

.app-container.dark-mode {
  background: var(--cf-bg-page);
  color: var(--cf-text-primary);
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--cf-border);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--cf-border-strong);
}
</style>
