/**
 * chatfire-canvas 可选媒体转存服务（零依赖 Node HTTP 服务）
 *
 * 端点：
 *   POST /upload   { data, mimeType } base64 直传（≤30MB）
 *                  { url }           服务端下载厂商临时链接再转存（≤100MB，带 SSRF 防护）
 *                  响应 { code: 200, data: { url, expireDays } }
 *   GET  /files/<name>  静态访问已存文件
 *
 * 环境变量：
 *   PORT          默认 16811
 *   DATA_DIR      默认 ./data
 *   PUBLIC_BASE   对外访问前缀，默认 http://localhost:PORT（反代时设为外部地址，如 https://your-host/storage）
 *   EXPIRE_DAYS   提示用保留天数（本服务不主动清理），默认 7
 */
import http from 'node:http'
import { createWriteStream } from 'node:fs'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { createHash, randomUUID } from 'node:crypto'
import { extname, join, resolve } from 'node:path'
import { lookup as dnsLookup } from 'node:dns/promises'
import net from 'node:net'

const PORT = Number(process.env.PORT || 16811)
const DATA_DIR = resolve(process.env.DATA_DIR || './data')
const PUBLIC_BASE = (process.env.PUBLIC_BASE || `http://localhost:${PORT}`).replace(/\/$/, '')
const EXPIRE_DAYS = Number(process.env.EXPIRE_DAYS || 7)

const MAX_BASE64_BYTES = 30 * 1024 * 1024
const MAX_DOWNLOAD_BYTES = 100 * 1024 * 1024
const MAX_BODY_BYTES = MAX_BASE64_BYTES * 2 // base64 体积膨胀约 4/3，留足余量

const ALLOWED_MIME = /^(image|video|audio)\/[a-zA-Z0-9.+-]+$/
const MIME_EXT = {
  'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif',
  'video/mp4': '.mp4', 'video/webm': '.webm', 'video/quicktime': '.mov',
  'audio/mpeg': '.mp3', 'audio/wav': '.wav', 'audio/ogg': '.ogg',
}

await mkdir(DATA_DIR, { recursive: true })

const json = (res, status, body) => {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  })
  res.end(payload)
}

const fail = (res, status, message) => json(res, status, { code: status, message })

/** SSRF 防护：禁止内网/回环/保留地址 */
const isPrivateIp = (ip) => {
  if (net.isIPv6(ip)) {
    return ip === '::1' || ip.toLowerCase().startsWith('fc') || ip.toLowerCase().startsWith('fd')
      || ip.toLowerCase().startsWith('fe80')
  }
  const parts = ip.split('.').map(Number)
  return parts[0] === 10 || parts[0] === 127 || parts[0] === 0
    || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
    || (parts[0] === 192 && parts[1] === 168)
    || (parts[0] === 169 && parts[1] === 254)
}

const assertPublicUrl = async (rawUrl) => {
  let parsed
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new Error('非法 URL')
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('仅支持 http/https URL')
  const hostname = parsed.hostname
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) throw new Error('不允许访问内网地址')
    return parsed
  }
  const { address } = await dnsLookup(hostname)
  if (isPrivateIp(address)) throw new Error('不允许访问内网地址')
  return parsed
}

const saveBuffer = async (buffer, mimeType) => {
  const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 16)
  const ext = MIME_EXT[mimeType] || extname(new URL(`http://x/${mimeType}`).pathname) || ''
  const name = `${hash}-${randomUUID().slice(0, 8)}${ext}`
  await writeFile(join(DATA_DIR, name), buffer)
  return name
}

const handleUpload = async (req, res) => {
  let raw = ''
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) return fail(res, 413, '请求体过大')
    raw += chunk
  }
  let body
  try {
    body = JSON.parse(raw)
  } catch {
    return fail(res, 400, '请求体需为 JSON')
  }

  // base64 直传
  if (typeof body?.data === 'string' && body.data.trim()) {
    const mimeType = String(body.mimeType || 'image/png')
    if (!ALLOWED_MIME.test(mimeType)) return fail(res, 400, '仅允许 image/video/audio 类型')
    const base64 = body.data.replace(/^data:[^;]+;base64,/, '').replace(/\s/g, '')
    const buffer = Buffer.from(base64, 'base64')
    if (buffer.length > MAX_BASE64_BYTES) return fail(res, 413, '文件超过 30MB 限制')
    const name = await saveBuffer(buffer, mimeType)
    return json(res, 200, { code: 200, data: { url: `${PUBLIC_BASE}/files/${name}`, expireDays: EXPIRE_DAYS } })
  }

  // URL 转存
  if (typeof body?.url === 'string' && body.url.trim()) {
    let parsed
    try {
      parsed = await assertPublicUrl(body.url.trim())
    } catch (error) {
      return fail(res, 400, error.message)
    }
    const upstream = await fetch(parsed, { redirect: 'follow', signal: AbortSignal.timeout(60_000) })
    if (!upstream.ok) return fail(res, 502, `下载失败(${upstream.status})`)
    const mimeType = (upstream.headers.get('content-type') || '').split(';')[0].trim()
    if (!ALLOWED_MIME.test(mimeType)) return fail(res, 400, `不允许的内容类型: ${mimeType || '未知'}`)
    const chunks = []
    let downloaded = 0
    for await (const chunk of upstream.body) {
      downloaded += chunk.length
      if (downloaded > MAX_DOWNLOAD_BYTES) return fail(res, 413, '文件超过 100MB 限制')
      chunks.push(chunk)
    }
    const name = await saveBuffer(Buffer.concat(chunks), mimeType)
    return json(res, 200, { code: 200, data: { url: `${PUBLIC_BASE}/files/${name}`, expireDays: EXPIRE_DAYS } })
  }

  return fail(res, 400, '缺少 data 或 url 参数')
}

const FILE_NAME_PATTERN = /^[a-zA-Z0-9.-]+$/

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  if (req.method === 'OPTIONS') return json(res, 200, {})
  if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, { code: 200, data: 'ok' })
  if (req.method === 'POST' && url.pathname === '/upload') {
    try {
      return await handleUpload(req, res)
    } catch (error) {
      console.error('upload error:', error)
      return fail(res, 500, '转存失败')
    }
  }
  if (req.method === 'GET' && url.pathname.startsWith('/files/')) {
    const name = url.pathname.slice('/files/'.length)
    if (!FILE_NAME_PATTERN.test(name) || name.includes('..')) return fail(res, 400, '非法文件名')
    const filePath = join(DATA_DIR, name)
    try {
      const info = await stat(filePath)
      if (!info.isFile()) return fail(res, 404, '文件不存在')
      const content = await readFile(filePath)
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': content.length,
        'Access-Control-Allow-Origin': '*',
      })
      return res.end(content)
    } catch {
      return fail(res, 404, '文件不存在')
    }
  }
  return fail(res, 404, 'Not Found')
})

server.listen(PORT, () => {
  console.log(`storage service listening on :${PORT}, data dir: ${DATA_DIR}`)
})
