/**
 * 对象存储桶直传（BYOS：用户自带桶，凭证仅存浏览器 localStorage）
 *
 * - vendor 's3'：S3 兼容 SigV4 预签名 PUT（AWS S3 / 火山 TOS / MinIO 等，
 *   TOS 走其 S3 兼容接口：AWS4-HMAC-SHA256 + service=s3）
 * - vendor 'cos'：腾讯云 COS 原生预签名（q-sign-algorithm=sha1，HMAC-SHA1）
 *
 * 预签名 URL 方式上传：PUT 请求只需 Content-Type，无自定义签名头，
 * 把桶 CORS 配置要求降到最低。签名用 SubtleCrypto 纯前端实现，不引 SDK。
 */

const textEncoder = new TextEncoder()

const toHex = (buffer) =>
  [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('')

const sha256Hex = async (data) =>
  toHex(await crypto.subtle.digest('SHA-256', typeof data === 'string' ? textEncoder.encode(data) : data))

const sha1Hex = async (data) =>
  toHex(await crypto.subtle.digest('SHA-1', textEncoder.encode(data)))

const hmac = async (algo, key, data) => {
  const keyBytes = typeof key === 'string' ? textEncoder.encode(key) : key
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'HMAC', hash: algo }, false, ['sign'],
  )
  return crypto.subtle.sign('HMAC', cryptoKey, textEncoder.encode(data))
}

const hmacHex = async (algo, key, data) => toHex(await hmac(algo, key, data))

/** RFC3986 严格编码（SigV4 要求，encodeURIComponent 不转义 !'()*） */
const uriEncode = (value) =>
  encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)

/** 规范化对象 key：逐段编码、保留 / 分隔 */
const encodeKey = (key) => key.split('/').map(uriEncode).join('/')

const MIME_EXT = {
  'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif',
  'video/mp4': '.mp4', 'video/webm': '.webm', 'video/quicktime': '.mov',
  'audio/mpeg': '.mp3', 'audio/wav': '.wav', 'audio/ogg': '.ogg',
  'text/plain': '.txt',
}

const normalizeEndpoint = (endpoint) =>
  String(endpoint || '').trim().replace(/^https?:\/\//, '').replace(/\/$/, '')

/** 上传后的对外访问地址：自定义域名优先，否则按桶虚拟主机域名拼接 */
export const bucketPublicUrl = (config, key) => {
  const base = String(config.publicBase || '').trim().replace(/\/$/, '')
  if (base) return `${base}/${encodeKey(key)}`
  return `https://${bucketHost(config)}/${encodeKey(key)}`
}

const bucketHost = (config) => {
  const endpoint = normalizeEndpoint(config.endpoint)
  return config.pathStyle ? endpoint : `${config.bucket}.${endpoint}`
}

const objectUri = (config, key) =>
  config.pathStyle ? `/${config.bucket}/${encodeKey(key)}` : `/${encodeKey(key)}`

const pad = (n) => String(n).padStart(2, '0')

const sigv4Dates = (date) => ({
  amzDate: `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`,
  shortDate: `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`,
})

/** S3 兼容 SigV4 预签名 PUT（AWS / TOS / MinIO，SignedHeaders 仅 host，UNSIGNED-PAYLOAD） */
const presignSigV4 = async (config, key, expires = 600) => {
  const host = bucketHost(config)
  const uri = objectUri(config, key)
  const { amzDate, shortDate } = sigv4Dates(new Date())
  const scope = `${shortDate}/${config.region}/s3/aws4_request`
  const query = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${config.accessKey}/${scope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expires),
    'X-Amz-SignedHeaders': 'host',
  }
  const canonicalQuery = Object.keys(query).sort()
    .map((name) => `${uriEncode(name)}=${uriEncode(query[name])}`)
    .join('&')
  const canonicalRequest = ['PUT', uri, canonicalQuery, `host:${host}`, '', 'host', 'UNSIGNED-PAYLOAD'].join('\n')
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, await sha256Hex(canonicalRequest)].join('\n')
  const kDate = await hmac('SHA-256', `AWS4${config.secretKey}`, shortDate)
  const kRegion = await hmac('SHA-256', kDate, config.region)
  const kService = await hmac('SHA-256', kRegion, 's3')
  const kSigning = await hmac('SHA-256', kService, 'aws4_request')
  const signature = await hmacHex('SHA-256', kSigning, stringToSign)
  return `https://${host}${uri}?${canonicalQuery}&X-Amz-Signature=${signature}`
}

/** 腾讯云 COS 原生预签名（q-sign，HMAC-SHA1，仅签 host 头） */
const presignCos = async (config, key, expires = 600) => {
  const host = bucketHost(config)
  const uri = objectUri(config, key)
  const now = Math.floor(Date.now() / 1000)
  const keyTime = `${now};${now + expires}`
  const signKey = await hmacHex('SHA-1', config.secretKey, keyTime)
  const httpString = `put\n${uri}\n\nhost=${host}\n`
  const stringToSign = `sha1\n${keyTime}\n${await sha1Hex(httpString)}\n`
  const signature = await hmacHex('SHA-1', signKey, stringToSign)
  const query = [
    'q-sign-algorithm=sha1',
    `q-ak=${uriEncode(config.accessKey)}`,
    `q-sign-time=${keyTime}`,
    `q-key-time=${keyTime}`,
    'q-header-list=host',
    'q-url-param-list=',
    `q-signature=${signature}`,
  ].join('&')
  return `https://${host}${uri}?${query}`
}

export const presignPutUrl = (config, key, expires) =>
  config.vendor === 'cos' ? presignCos(config, key, expires) : presignSigV4(config, key, expires)

/** 生成对象 key：chatfire-canvas/YYYYMMDD/<内容哈希16位>-<随机8位>.<ext> */
export const buildObjectKey = async (bytes, mimeType) => {
  const hash = (await sha256Hex(bytes)).slice(0, 16)
  const rand = crypto.getRandomValues(new Uint8Array(4))
    .reduce((acc, b) => acc + b.toString(16).padStart(2, '0'), '')
  const date = sigv4Dates(new Date()).shortDate
  const ext = MIME_EXT[mimeType] || ''
  return `chatfire-canvas/${date}/${hash}-${rand}${ext}`
}

export const base64ToBytes = (base64) => {
  const clean = String(base64).replace(/^data:[^;]+;base64,/, '').replace(/\s/g, '')
  const binary = atob(clean)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}
