/**
 * 设置路由：API Key / baseUrl 覆盖 / 网关地址（整块 JSON 存取，前端镜像写入）
 */
import { sendJson, readJson, HttpError } from '../http.js'

export function settingsRoutes({ statements: q, transaction }) {
  return [
    {
      method: 'GET',
      pattern: /^\/api\/settings$/,
      async handler(req, res) {
        const settings = Object.fromEntries(q.listSettings.all().map((row) => {
          try { return [row.name, JSON.parse(row.value)] } catch { return [row.name, row.value] }
        }))
        sendJson(res, 200, settings)
      },
    },
    {
      method: 'PUT',
      pattern: /^\/api\/settings$/,
      async handler(req, res) {
        const body = await readJson(req)
        if (typeof body !== 'object' || body === null || Array.isArray(body)) {
          throw new HttpError(400, 'settings 必须是 { name: value } 对象')
        }
        transaction(() => {
          for (const [name, value] of Object.entries(body)) {
            if (name) q.putSetting.run(String(name), JSON.stringify(value ?? ''))
          }
        })
        sendJson(res, 200, { ok: true })
      },
    },
  ]
}
