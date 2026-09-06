# syntax=docker/dockerfile:1

# ===== 构建阶段：vite 前端产物 + esbuild 服务端单文件 bundle =====
FROM node:22-alpine AS build
WORKDIR /build
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

# 前端：锁文件单独成层（加速重建），依赖装在 apps/web/node_modules
COPY apps/web/package.json apps/web/pnpm-lock.yaml apps/web/
RUN pnpm -C apps/web install --frozen-lockfile
COPY apps/web/ apps/web/
RUN pnpm -C apps/web build

# 服务端：零 npm 依赖（node:sqlite / 内置 fetch），esbuild 单文件 bundle
# （复用桌面端 build/server.mjs 打包脚本）。engine.js 对 apps/web/src 的反向
# import（providers / 协议适配器 / locales）全部内联；locales 依赖的 vue-i18n
# 由上面 apps/web/node_modules 就近解析，运行时零 node_modules
COPY apps/desktop/package.json apps/desktop/pnpm-lock.yaml apps/desktop/
RUN pnpm -C apps/desktop install --frozen-lockfile
COPY apps/desktop/scripts/ apps/desktop/scripts/
COPY apps/server/src/ apps/server/src/
RUN node apps/desktop/scripts/build-server.mjs

# ===== 运行时：单进程一体化（静态托管 + /api + 网关/厂商反代，同桌面端内嵌模式）=====
FROM node:24-alpine
ARG HUOBAO_VERSION=dev
# UPSTREAM：推理网关默认地址（engine.js 网关兜底）；API_BASE_URL：浏览器侧基地址，
# 默认空串 = 同源（config.js 由 entrypoint 按此生成）
ENV NODE_ENV=production \
    HUOBAO_VERSION=${HUOBAO_VERSION} \
    PORT=16812 \
    DATA_DIR=/app/data \
    FRONTEND_DIST=/app/frontend-dist \
    UPSTREAM=https://api.firemux.com \
    API_BASE_URL=

WORKDIR /app
COPY --from=build /build/apps/desktop/build/server.mjs ./server.mjs
COPY --from=build /build/apps/web/dist ./frontend-dist
COPY docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh && mkdir -p /app/data

# 数据卷：SQLite（画布/设置镜像/运行队列）+ 生成的结果文件
VOLUME ["/app/data"]
EXPOSE 16812

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||16812)+'/api/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["./entrypoint.sh"]
