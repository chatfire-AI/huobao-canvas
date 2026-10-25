/**
 * Agent 工具协议定义（前后端/MCP 三方共享的纯数据 + 纯函数，零依赖）。
 *
 * 链路：外部 AI（MCP/HTTP）→ POST /api/agent/tools { tool, args }
 *   → compileToolToOps 编译为 op 批次 → SSE 推给浏览器画布页执行 → 回执。
 * 画布状态主权在浏览器：服务端只缓存浏览器推送的快照，不直接改图。
 *
 * op 集（浏览器端 useAgentBridge 应用）：
 *   add_node { type, position?, data? }            创建节点（内置类型或 plugin:* 类型）
 *   update_node { id, data? }                      浅合并 data（payload 再浅合并一层）
 *   delete_node { id }                             删除节点及其连线
 *   connect_nodes { source, target }               连线（经画布连线规则校验）
 *   disconnect { edgeId }                          断开一条连线
 *   select_nodes { ids }                           选中节点（空数组=清除选择）
 *   set_viewport { x?, y?, zoom? }                 设置视口
 *   run_generation { nodeId }                      触发该节点的生成流程
 */

export const AGENT_PROTOCOL_VERSION = 1

const NODE_TYPES = ['textNode', 'imageNode', 'videoNode', 'groupNode']

export const AGENT_TOOLS = [
  {
    name: 'canvas_get_state',
    description: '获取当前画布快照（节点/连线/选区/视口）。节点 data.payload 内含提示词、模型、生成结果等。',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'canvas_create_node',
    description: `在画布上创建节点。type 为 ${NODE_TYPES.join('/')}。`,
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: `节点类型：${NODE_TYPES.join(' | ')}` },
        position: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' } }, description: '省略则自动错开摆放' },
        data: { type: 'object', description: '节点 data（title/payload 等），省略用类型默认值' },
      },
      required: ['type'],
      additionalProperties: false,
    },
  },
  {
    name: 'canvas_update_node',
    description: '更新节点 data（浅合并；payload 字段再浅合并一层）。常用于写入提示词 payload.prompt、选择模型 payload.modelName。',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: '节点 id' },
        data: { type: 'object', description: '要合并进 data 的字段' },
      },
      required: ['id', 'data'],
      additionalProperties: false,
    },
  },
  {
    name: 'canvas_delete_node',
    description: '删除节点及其连线。',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    name: 'canvas_connect',
    description: '连接两个节点（source 输出 → target 输入），需通过画布类型连线规则（如 textNode→imageNode）。',
    inputSchema: {
      type: 'object',
      properties: {
        source: { type: 'string', description: '上游节点 id' },
        target: { type: 'string', description: '下游节点 id' },
      },
      required: ['source', 'target'],
      additionalProperties: false,
    },
  },
  {
    name: 'canvas_disconnect',
    description: '断开一条连线（edgeId 形如 source→target，见 canvas_get_state 返回）。',
    inputSchema: {
      type: 'object',
      properties: { edgeId: { type: 'string' } },
      required: ['edgeId'],
      additionalProperties: false,
    },
  },
  {
    name: 'canvas_select',
    description: '选中节点（单选取最后一个 id；空数组清除选择）。',
    inputSchema: {
      type: 'object',
      properties: { ids: { type: 'array', items: { type: 'string' } } },
      required: ['ids'],
      additionalProperties: false,
    },
  },
  {
    name: 'canvas_set_viewport',
    description: '设置画布视口（平移 x/y 与缩放 zoom，均可省略）。',
    inputSchema: {
      type: 'object',
      properties: { x: { type: 'number' }, y: { type: 'number' }, zoom: { type: 'number', minimum: 0.2, maximum: 2 } },
      additionalProperties: false,
    },
  },
  {
    name: 'canvas_run_generation',
    description: '触发指定节点的生成流程（等价于在 Prompt Dock 点击运行）。节点需已配置模型与提示词。',
    inputSchema: {
      type: 'object',
      properties: { nodeId: { type: 'string' } },
      required: ['nodeId'],
      additionalProperties: false,
    },
  },
]

const toolByName = new Map(AGENT_TOOLS.map((tool) => [tool.name, tool]))

export const getAgentTool = (name) => toolByName.get(name) || null

const isPlainObject = (value) => value && typeof value === 'object' && !Array.isArray(value)

/** 工具调用 → op 批次；参数不合法抛 Error（message 面向调用方） */
export function compileToolToOps(tool, args = {}) {
  if (!isPlainObject(args)) throw new Error('args 必须是对象')
  switch (tool) {
    case 'canvas_create_node': {
      if (typeof args.type !== 'string' || !args.type) throw new Error('type 不能为空')
      const op = { op: 'add_node', type: args.type }
      if (isPlainObject(args.position)) {
        const { x, y } = args.position
        if (typeof x === 'number' && typeof y === 'number') op.position = { x, y }
      }
      if (isPlainObject(args.data)) op.data = args.data
      return [op]
    }
    case 'canvas_update_node': {
      if (!args.id) throw new Error('id 不能为空')
      if (!isPlainObject(args.data)) throw new Error('data 必须是对象')
      return [{ op: 'update_node', id: args.id, data: args.data }]
    }
    case 'canvas_delete_node': {
      if (!args.id) throw new Error('id 不能为空')
      return [{ op: 'delete_node', id: args.id }]
    }
    case 'canvas_connect': {
      if (!args.source || !args.target) throw new Error('source/target 不能为空')
      return [{ op: 'connect_nodes', source: args.source, target: args.target }]
    }
    case 'canvas_disconnect': {
      if (!args.edgeId) throw new Error('edgeId 不能为空')
      return [{ op: 'disconnect', edgeId: args.edgeId }]
    }
    case 'canvas_select': {
      if (!Array.isArray(args.ids)) throw new Error('ids 必须是数组')
      return [{ op: 'select_nodes', ids: args.ids.filter((id) => typeof id === 'string') }]
    }
    case 'canvas_set_viewport': {
      const op = { op: 'set_viewport' }
      for (const key of ['x', 'y', 'zoom']) {
        if (typeof args[key] === 'number' && Number.isFinite(args[key])) op[key] = args[key]
      }
      return [op]
    }
    case 'canvas_run_generation': {
      if (!args.nodeId) throw new Error('nodeId 不能为空')
      return [{ op: 'run_generation', nodeId: args.nodeId }]
    }
    default:
      throw new Error(`未知工具：${tool}`)
  }
}
