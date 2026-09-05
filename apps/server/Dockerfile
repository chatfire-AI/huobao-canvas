# 画布存储 + 运行引擎：零依赖，Node 内置 node:sqlite / fetch（需 >= 22.13）
# 运行引擎直接 import apps/web 的纯函数模块（providers 配置 / 协议适配器），
# 因此 build context 为仓库根目录，按相同相对路径 COPY 闭包。
FROM node:24-alpine
WORKDIR /app
COPY apps/server/server.js apps/server/engine.js apps/server/
COPY apps/web/src/config/providers/ apps/web/src/config/providers/
COPY apps/web/src/utils/apiKeySession.js apps/web/src/utils/inputTransform.js apps/web/src/utils/
COPY apps/web/src/views/playground/protocols/ apps/web/src/views/playground/protocols/
COPY apps/web/src/views/playground/utils/endpointPath.js apps/web/src/views/playground/utils/chatProtocol.js apps/web/src/views/playground/utils/mergeEndpointSchema.js apps/web/src/views/playground/utils/
ENV PORT=16812
ENV DATA_DIR=/data
EXPOSE 16812
CMD ["node", "apps/server/server.js"]
