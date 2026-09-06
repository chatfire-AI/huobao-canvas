/**
 * 前端静态托管：FRONTEND_DIST 环境变量存在时生效（Electron 桌面端内嵌模式）。
 *
 * 非 /api 的 GET 请求先查静态文件，未命中回退 index.html（SPA history 路由）。
 * Docker/Web 部署由 nginx 托管静态产物，本路由不会挂载（FRONTEND_DIST 为空）。
 */
import { createReadStream, statSync } from 'node:fs'
import path from 'node:path'
import { HttpError } from '../http.js'

const MIME_BY_EXT = {
  html: 'text/html; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
  json: 'application/json; charset=utf-8',
  map: 'application/json; charset=utf-8',
  svg: 'image/svg+xml',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  webp: 'image/webp', gif: 'image/gif', ico: 'image/x-icon',
  mp4: 'video/mp4', webm: 'video/webm',
  mp3: 'audio/mpeg', wav: 'audio/wav',
  woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf',
  txt: 'text/plain; charset=utf-8',
  webmanifest: 'application/manifest+json',
}

const fileStat = (filePath) => statSync(filePath, { throwIfNoEntry: false })

export function staticRoutes({ frontendDist }) {
  if (!frontendDist) return []
  const root = path.resolve(frontendDist)

  return [
    {
      method: 'GET',
      // 兜底匹配一切（路由表末尾挂载，/api 路由已在前面优先命中）
      pattern: /^.*$/,
      handler(req, res, { url }) {
        const pathname = decodeURIComponent(url.pathname)
        // /api 下的未知路径仍是 JSON 404，不能回退成 index.html
        if (pathname.startsWith('/api/')) throw new HttpError(404, 'Not Found')

        let filePath = path.join(root, pathname)
        // 防路径穿越：拼接结果必须仍在 root 内
        if (!filePath.startsWith(root)) filePath = path.join(root, 'index.html')
        let stat = fileStat(filePath)
        if (stat?.isDirectory()) {
          filePath = path.join(filePath, 'index.html')
          stat = fileStat(filePath)
        }
        // SPA fallback：非文件路径（如 /settings）回退入口页
        if (!stat?.isFile()) {
          filePath = path.join(root, 'index.html')
          stat = fileStat(filePath)
        }
        if (!stat?.isFile()) throw new HttpError(404, '前端产物缺失（FRONTEND_DIST 无效）')

        const ext = path.extname(filePath).slice(1).toLowerCase()
        const isEntry = filePath === path.join(root, 'index.html')
        // vite 产物 /assets/* 带内容哈希可长缓存；入口与其他文件禁缓存保证发版即生效
        const cacheControl = !isEntry && pathname.startsWith('/assets/')
          ? 'public, max-age=2592000, immutable'
          : 'no-cache'
        res.writeHead(200, {
          'Content-Type': MIME_BY_EXT[ext] || 'application/octet-stream',
          'Content-Length': stat.size,
          'Cache-Control': cacheControl,
        })
        createReadStream(filePath).pipe(res)
      },
    },
  ]
}
