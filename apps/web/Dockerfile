# 构建阶段
FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install
COPY . .
RUN pnpm build

# 运行阶段：nginx 静态服务 + 上游反代（浏览器同源访问，规避 CORS）
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY proxy_common.conf /etc/nginx/proxy_common.conf
COPY 30-app-config.sh /docker-entrypoint.d/30-app-config.sh
RUN chmod +x /docker-entrypoint.d/30-app-config.sh
# UPSTREAM 在容器启动时由 envsubst 注入（见 docker-compose）
ENV UPSTREAM=https://api.firemux.com
ENV CANVAS_SERVER=http://server:16812
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
