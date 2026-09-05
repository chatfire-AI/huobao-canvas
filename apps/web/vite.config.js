import { defineConfig } from "vite";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import path from "path";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import { NaiveUiResolver } from "unplugin-vue-components/resolvers";

// 推理上游：默认 ChatFire 公共 API，可用 VITE_UPSTREAM 指向任意 OpenAI 兼容网关
const upstream = process.env.VITE_UPSTREAM || "https://api.chatfire.site";

// 浏览器 fetch 会自动带 Origin（localhost），上游严格 CORS 校验非白名单 Origin 直接 403。
// changeOrigin 只改 Host 不改 Origin，需在代理层统一剥掉（等价于服务端直连语义）。
const stripOrigin = {
  configure: (proxy) =>
    proxy.on("proxyReq", (proxyReq) => proxyReq.removeHeader("origin")),
};

export default defineConfig({
  base: "/",
  plugins: [
    AutoImport({
      imports: [
        "vue",
        {
          "naive-ui": [
            "useDialog",
            "useMessage",
            "useNotification",
            "useLoadingBar",
          ],
        },
      ],
    }),
    Components({
      resolvers: [NaiveUiResolver()],
    }),
    vue(),
  ],
  css: {
    postcss: {
      plugins: [tailwindcss, autoprefixer],
    },
  },
  server: {
    host: "0.0.0.0",
    port: process.env.PORT || 8022,
    // Tauri devUrl 钉死 8021：端口被占时直接报错，禁止静默顺延（否则桌面窗口白屏）
    strictPort: true,
    proxy: {
      // 注意：/v1 前缀会吞掉 /v1beta，/v1beta 必须排在 /v1 之前
      "/v1beta": { target: upstream, changeOrigin: true, ...stripOrigin },
      "/v1": { target: upstream, changeOrigin: true, ...stripOrigin },
      // 厂商官方端点前缀
      "/volcengine": { target: upstream, changeOrigin: true, ...stripOrigin },
      "/qwen": { target: upstream, changeOrigin: true, ...stripOrigin },
      "/vidu": { target: upstream, changeOrigin: true, ...stripOrigin },
      "/minimax": { target: upstream, changeOrigin: true, ...stripOrigin },
      "/xai": { target: upstream, changeOrigin: true, ...stripOrigin },
      "/zhipu": { target: upstream, changeOrigin: true, ...stripOrigin },
      // ── 厂商官方 API 直连反代（官方直连模式，剥离 /official/{id} 前缀）──
      "/official/openai": {
        target: "https://api.openai.com", changeOrigin: true, ...stripOrigin,
        rewrite: (p) => p.replace(/^\/official\/openai/, ""),
      },
      "/official/anthropic": {
        target: "https://api.anthropic.com", changeOrigin: true, ...stripOrigin,
        rewrite: (p) => p.replace(/^\/official\/anthropic/, ""),
      },
      "/official/gemini": {
        target: "https://generativelanguage.googleapis.com", changeOrigin: true, ...stripOrigin,
        rewrite: (p) => p.replace(/^\/official\/gemini/, ""),
      },
      "/official/qwen": {
        target: "https://dashscope.aliyuncs.com", changeOrigin: true, ...stripOrigin,
        rewrite: (p) => p.replace(/^\/official\/qwen/, ""),
      },
      "/official/volcengine": {
        target: "https://ark.cn-beijing.volces.com", changeOrigin: true, ...stripOrigin,
        rewrite: (p) => p.replace(/^\/official\/volcengine/, ""),
      },
      "/official/deepseek": {
        target: "https://api.deepseek.com", changeOrigin: true, ...stripOrigin,
        rewrite: (p) => p.replace(/^\/official\/deepseek/, ""),
      },
      "/official/minimax": {
        target: "https://api.minimaxi.com", changeOrigin: true, ...stripOrigin,
        rewrite: (p) => p.replace(/^\/official\/minimax/, ""),
      },
      "/official/moonshot": {
        target: "https://api.moonshot.cn", changeOrigin: true, ...stripOrigin,
        rewrite: (p) => p.replace(/^\/official\/moonshot/, ""),
      },
      "/official/zhipu": {
        target: "https://open.bigmodel.cn", changeOrigin: true, ...stripOrigin,
        rewrite: (p) => p.replace(/^\/official\/zhipu/, ""),
      },
      "/official/xai": {
        target: "https://api.x.ai", changeOrigin: true, ...stripOrigin,
        rewrite: (p) => p.replace(/^\/official\/xai/, ""),
      },
      "/official/vidu": {
        target: "https://api.vidu.cn", changeOrigin: true, ...stripOrigin,
        rewrite: (p) => p.replace(/^\/official\/vidu/, ""),
      },
      "/official/xiaomi": {
        target: "https://api.xiaomimimo.com", changeOrigin: true, ...stripOrigin,
        rewrite: (p) => p.replace(/^\/official\/xiaomi/, ""),
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  envDir: "./",
});
