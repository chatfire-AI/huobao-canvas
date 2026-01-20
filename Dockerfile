# 使用本地已构建的 dist（先运行 pnpm build）
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY dist /usr/share/nginx/html/huobao-canvas

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
