import { computed, ref, watch } from "vue";
import { darkTheme } from "naive-ui";

const STORAGE_KEY = "chatfire-theme";

function getInitialDark() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "dark") return true;
  if (saved === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// 共享的响应式主题状态（模块级单例，所有 useTheme() 调用共享）
const isDark = ref(getInitialDark());

function applyDarkClass(dark) {
  document.documentElement.classList.toggle("dark", dark);
}

watch(isDark, applyDarkClass, { immediate: true });

export function useTheme() {
  const theme = computed(() => {
    return isDark.value ? darkTheme : null;
  });

  const themeOverrides = computed(() => {
    // 表格统一融入页面背景：把 naive 注入到行内 style 的颜色在源头设为透明
    const dataTable = {
      tdColor: "transparent",
      thColor: "transparent",
      tdColorHover: "var(--cf-bg-subtle)",
      borderColor: "var(--cf-border)",
      thTextColor: "var(--cf-text-tertiary)",
      tdTextColor: "var(--cf-text-primary)",
    };
    return isDark.value
      ? {
          common: {
            primaryColor: "#ffb076",
            primaryColorHover: "#ffc194",
            primaryColorPressed: "#f5934e",
            successColor: "#4ade80",
            warningColor: "#fbbf24",
            errorColor: "#f87171",
            infoColor: "#60a5fa",
          },
          DataTable: dataTable,
        }
      : {
          common: {
            primaryColor: "#f97316",
            primaryColorHover: "#ea580c",
            primaryColorPressed: "#c2410c",
            successColor: "#16a34a",
            warningColor: "#d97706",
            errorColor: "#dc2626",
            infoColor: "#2563eb",
          },
          DataTable: dataTable,
        };
  });

  const toggleTheme = () => {
    isDark.value = !isDark.value;
    localStorage.setItem(STORAGE_KEY, isDark.value ? "dark" : "light");
    applyDarkClass(isDark.value);
  };

  return { theme, themeOverrides, isDark, toggleTheme };
}
