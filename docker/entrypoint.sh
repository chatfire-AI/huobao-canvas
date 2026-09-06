#!/bin/sh
# 容器入口：按环境变量生成前端运行时配置（浏览器加载 /config.js 注入 window.__APP_CONFIG__），
# 然后启动一体化服务端（静态托管 + /api + 反代）。
set -e

# API_BASE_URL 默认空串 = 同源：/api、/v1、/official/* 全部由内嵌服务端直出或反代
cat > /app/frontend-dist/config.js <<EOF
window.__APP_CONFIG__ = {
  apiBaseUrl: "${API_BASE_URL:-}"
};
EOF

exec node server.mjs
