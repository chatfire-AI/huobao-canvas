#!/bin/sh
# 容器启动时生成运行时配置（浏览器加载 /config.js 注入 window.__APP_CONFIG__）
# API_BASE_URL 默认空串 = 同源，由 nginx 反代到 UPSTREAM
set -e
cat > /usr/share/nginx/html/config.js <<EOF
window.__APP_CONFIG__ = {
  apiBaseUrl: "${API_BASE_URL:-}",
  storageProvider: "${STORAGE_PROVIDER:-none}",
  storageUploadUrl: "${STORAGE_UPLOAD_URL:-/storage/upload}",
  cloudMediaDomain: "${CLOUD_MEDIA_DOMAIN:-}"
};
EOF
