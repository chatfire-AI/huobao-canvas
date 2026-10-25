/**
 * 结果文件路由：Veo 鉴权视频 / base64 结果落盘后的静态访问 + 用户上传落盘。
 * 同源经 nginx /api/ 反代；文件名白名单校验防路径穿越。
 */
import { createReadStream, statSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { HttpError, readJson, sendJson } from '../http.js'

const MIME_BY_EXT = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
  gif: 'image/gif', mp4: 'video/mp4', webm: 'video/webm', mp3: 'audio/mpeg',
  wav: 'audio/wav', bin: 'application/octet-stream',
}

// 上传仅接受媒体类型；扩展名以服务端认定的为准，忽略客户端文件名
const UPLOAD_EXT_BY_MIME = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif',
  'video/mp4': 'mp4', 'video/webm': 'webm', 'audio/mpeg': 'mp3', 'audio/wav': 'wav',
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
    {
      // 用户上传（画布粘贴/拖入/PromptDock 素材）：base64 dataUrl 落盘，返回持久 URL
      method: 'POST',
      pattern: /^\/api\/files\/?$/,
      async handler(req, res) {
        const body = await readJson(req)
        const match = /^data:([^;,]+);base64,(.+)$/s.exec(String(body?.dataUrl || ''))
        if (!match) throw new HttpError(400, 'dataUrl 格式不合法')
        const ext = UPLOAD_EXT_BY_MIME[match[1].toLowerCase()]
        if (!ext) throw new HttpError(415, `不支持的文件类型：${match[1]}`)
        const buffer = Buffer.from(match[2], 'base64')
        if (!buffer.length) throw new HttpError(400, '文件内容为空')
        const name = `upload_${Date.now()}_${randomUUID().slice(0, 8)}.${ext}`
        writeFileSync(path.join(engine.filesDir, name), buffer)
        sendJson(res, 200, { url: `/api/files/${name}`, size: buffer.length, mime: match[1] })
      },
    },
  ]
}

