import { computed, ref, watch } from "vue";
import { darkTheme } from "naive-ui";

const STORAGE_KEY = "chatfire-theme";

function getInitialDark() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "dark") return true;
  if (saved === "light") return false;
  // 默认暗色（不再跟随系统；用户显式切换后按 localStorage）
  return true;
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
            // 浮层/表面/文本对齐 slate 蓝灰暗色令牌（variables.scss html.dark，
            // 与 gateway/drama 同源）
            bodyColor: "#0b0f16",
            cardColor: "#131a24",
            modalColor: "#131a24",
            popoverColor: "#182230",
            inputColor: "rgba(148, 163, 184, .08)",
            actionColor: "rgba(148, 163, 184, .08)",
            hoverColor: "rgba(148, 163, 184, .14)",
            borderColor: "rgba(148, 163, 184, .14)",
            dividerColor: "rgba(148, 163, 184, .14)",
            textColor1: "#f1f5f9",
            textColor2: "rgba(226, 232, 240, .65)",
            textColor3: "#8b94a3",
            fontWeight: "400",
            fontWeightStrong: "600",
          },
          Card: {
            borderRadius: "14px",
          },
          Dropdown: {
            color: "#182230",
            optionColorHover: "rgba(255, 176, 118, .14)",
            borderRadius: "10px",
            padding: "6px",
          },
          Dialog: {
            borderRadius: "16px",
            titleFontSize: "16px",
            titleFontWeight: "800",
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
            fontWeight: "400",
            fontWeightStrong: "600",
          },
          Card: {
            borderRadius: "14px",
          },
          Dropdown: {
            optionColorHover: "rgba(249, 115, 22, .1)",
            borderRadius: "10px",
            padding: "6px",
          },
          Dialog: {
            borderRadius: "16px",
            titleFontSize: "16px",
            titleFontWeight: "800",
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
