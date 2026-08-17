FROM node:20-alpine
WORKDIR /app
COPY package.json server.js ./
ENV PORT=16811
ENV DATA_DIR=/data
VOLUME /data
EXPOSE 16811
CMD ["node", "server.js"]
