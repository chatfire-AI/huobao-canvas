/**
 * 结果文件路由：Veo 鉴权视频 / base64 结果落盘后的静态访问。
 * 同源经 nginx /api/ 反代；文件名白名单校验防路径穿越。
 */
import { createReadStream, statSync } from 'node:fs'
import path from 'node:path'
import { HttpError } from '../http.js'

const MIME_BY_EXT = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
  gif: 'image/gif', mp4: 'video/mp4', webm: 'video/webm', mp3: 'audio/mpeg',
  wav: 'audio/wav', bin: 'application/octet-stream',
}

export function filesRoutes({ engine }) {
  return [
    {
      method: 'GET',
      pattern: /^\/api\/files\/([A-Za-z0-9._-]+)$/,
      async handler(req, res, { params: [name] }) {
        const filePath = path.join(engine.filesDir, name)
        if (!filePath.startsWith(engine.filesDir) || !statSync(filePath, { throwIfNoEntry: false })?.isFile()) {
          throw new HttpError(404, '文件不存在')
        }
        const ext = path.extname(name).slice(1).toLowerCase()
        res.writeHead(200, {
          'Content-Type': MIME_BY_EXT[ext] || 'application/octet-stream',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=604800',
        })
        createReadStream(filePath).pipe(res)
      },
    },
  ]
}
