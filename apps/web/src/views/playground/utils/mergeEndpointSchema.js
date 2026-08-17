/**
 * 端点 schema 合并（纯函数，便于 Node 侧行为测试）
 *
 * 优先级：epSchema(端点级覆盖) > globalSchema(模型级，gw_model.model_schema 迁移数据)
 *         > templateSchema(后端按模型类型注入的端点模板) > 内置默认
 *
 * 关键不变量：空 input 数组视为"未声明"，继续向下回退。
 * 后端 enrichEndpointsSchemaJson 会给每个端点注入模板 schemaJson，
 * Chat 系模板的 input 恰为 []——若按 `??` 判空，空数组会吞掉模型级字段，
 * 使聊天模型整体退化到 DEFAULT_CHAT_PARAMS（temperature 复活，
 * fable-5 / sonnet-5 等禁采样模型被上游 400）。
 */

// 取第一个非空字段数组；全为空时返回 []
const pickFields = (...candidates) =>
  candidates.find((c) => Array.isArray(c) && c.length > 0) || []

// 取第一个已声明（非 null/undefined）的值；全未声明时返回 null
const pickValue = (...candidates) =>
  candidates.find((c) => c !== undefined && c !== null) ?? null

export function mergeEndpointSchema({
  epSchema, templateSchema, templateRequestType, globalSchema, defaultChatConfig,
}) {
  return {
    input: pickFields(epSchema?.input, globalSchema?.input, templateSchema?.input),
    inputTransform: pickValue(epSchema?.inputTransform, globalSchema?.inputTransform, templateSchema?.inputTransform),
    requestType: epSchema?.requestType ?? globalSchema?.requestType
      ?? templateSchema?.requestType ?? templateRequestType ?? 'json',
    asyncMode: epSchema?.asyncMode ?? globalSchema?.asyncMode ?? templateSchema?.asyncMode ?? 'auto',
    chatConfig: {
      ...defaultChatConfig,
      ...(templateSchema?.chatConfig || {}),
      ...(globalSchema?.chatConfig || {}),
      ...(epSchema?.chatConfig || {}),
    },
    output: pickValue(epSchema?.output, globalSchema?.output, templateSchema?.output),
    inputBindings: pickValue(epSchema?.inputBindings, globalSchema?.inputBindings, templateSchema?.inputBindings),
    videoModes: pickValue(epSchema?.videoModes, globalSchema?.videoModes, templateSchema?.videoModes),
  }
}
