import { ref, toRaw, watch } from 'vue'
import { sanitizeCanvasGraph } from '../utils/graphSerialization.js'

/**
 * Agent 桥：浏览器画布页 ↔ 服务端 /api/agent 通道。
 *
 * - SSE 长连接接收 op 批次（外部 AI 经 MCP/HTTP 发起的工具调用）
 * - 应用 op 到画布（复用 graph composables，整批合并为一步撤销）
 * - 图变更节流推送快照到服务端（agent 的"眼睛"）
 * - 确认模式：localStorage 'huobao.canvas.agentApprove' = 'manual' 时逐批弹窗确认
 */
const STATE_PUSH_DELAY = 800
const APPROVE_MODE_KEY = 'huobao.canvas.agentApprove'

export function useAgentBridge({
  nodes,
  edges,
  viewport,
  projectId,
  selectedNodeId,
  addNode,
  getNodeById,
  updateNodeData,
  deleteNodeById,
  deleteEdgeById,
  onConnect,
  setViewport,
  selectNode,
  clearSelection,
  runNode,
  history,
}) {
  let eventSource = null
  let pushTimer = 0
  let stopped = false
  let unwatch = null
  const connected = ref(false) // SSE 通道状态（引导界面指示灯用）

  // ── op 应用 ──
  const applyOp = (op) => {
    switch (op?.op) {
      case 'add_node': {
        const node = addNode(op.type, op.position || undefined, op.data ? { data: op.data } : {})
        return { ok: true, nodeId: node?.id }
      }
      case 'update_node': {
        if (!getNodeById(op.id)) return { ok: false, error: `节点不存在：${op.id}` }
        updateNodeData(op.id, op.data || {}, { userMutation: true })
        return { ok: true }
      }
      case 'delete_node': {
        return deleteNodeById(op.id)
          ? { ok: true }
          : { ok: false, error: `节点不存在：${op.id}` }
      }
      case 'connect_nodes': {
        const source = getNodeById(op.source)
        const target = getNodeById(op.target)
        if (!source || !target) return { ok: false, error: 'source/target 节点不存在' }
        const edge = onConnect({ source: op.source, target: op.target, sourceHandle: 'right', targetHandle: 'left' })
        return edge ? { ok: true, edgeId: edge.id } : { ok: false, error: '连线被规则拒绝' }
      }
      case 'disconnect': {
        return deleteEdgeById(op.edgeId)
          ? { ok: true }
          : { ok: false, error: `连线不存在：${op.edgeId}` }
      }
      case 'select_nodes': {
        clearSelection()
        const ids = (op.ids || []).filter((id) => getNodeById(id))
        if (ids.length) selectNode(ids[ids.length - 1])
        return { ok: true, selected: ids }
      }
      case 'set_viewport': {
        const current = viewport.value || { x: 0, y: 0, zoom: 1 }
        setViewport({
          x: typeof op.x === 'number' ? op.x : current.x,
          y: typeof op.y === 'number' ? op.y : current.y,
          zoom: typeof op.zoom === 'number' ? op.zoom : current.zoom,
        })
        return { ok: true }
      }
      case 'run_generation': {
        const node = getNodeById(op.nodeId)
        if (!node) return { ok: false, error: `节点不存在：${op.nodeId}` }
        // 异步触发，不等生成完成（生成进度照常走 runs 队列，agent 可轮询快照观察）
        Promise.resolve(runNode(node)).catch(() => {})
        return { ok: true }
      }
      default:
        return { ok: false, error: `未知 op：${op?.op}` }
    }
  }

  const confirmOps = (tool, ops) => new Promise((resolve) => {
    const summary = ops.map((op) => `${op.op}${op.id || op.nodeId ? ` ${op.id || op.nodeId}` : ''}${op.type ? ` ${op.type}` : ''}`).join('\n')
    if (!window.$dialog) return resolve(true)
    window.$dialog.warning({
      title: `Agent 请求执行：${tool}`,
      content: summary,
      positiveText: '执行',
      negativeText: '拒绝',
      onPositiveClick: () => resolve(true),
      onNegativeClick: () => resolve(false),
      onClose: () => resolve(false),
    })
  })

  const handleOpsMessage = async (payload) => {
    const { requestId, tool, ops } = payload
    let applied = null
    let error = null
    try {
      const manual = (() => { try { return localStorage.getItem(APPROVE_MODE_KEY) === 'manual' } catch { return false } })()
      if (manual && !await confirmOps(tool, ops)) {
        error = '用户拒绝执行'
      } else {
        history?.setInteracting?.(true) // 整批 op 合并为一步撤销
        try {
          applied = ops.map((op) => ({ op: op.op, ...applyOp(op) }))
        } finally {
          history?.setInteracting?.(false)
        }
      }
    } catch (e) {
      error = e?.message || '执行失败'
    }
    try {
      await fetch('/api/agent/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, applied, error }),
      })
    } catch { /* 服务端不可达时静默——调用方会看到超时 */ }
  }

  // ── 快照推送 ──
  const pushState = async () => {
    if (stopped) return
    try {
      const graph = sanitizeCanvasGraph({
        nodes: toRaw(nodes.value),
        edges: toRaw(edges.value),
        viewport: toRaw(viewport.value || { x: 0, y: 0, zoom: 1 }),
      })
      await fetch('/api/agent/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...graph,
          selectedNodeId: selectedNodeId.value || '',
          projectId: projectId.value || '',
        }),
      })
    } catch { /* 服务端不可达时静默重试（依赖下次变更触发） */ }
  }

  const schedulePush = () => {
    clearTimeout(pushTimer)
    pushTimer = setTimeout(pushState, STATE_PUSH_DELAY)
  }

  const start = () => {
    if (eventSource || stopped) return
    eventSource = new EventSource('/api/agent/events')
    eventSource.onopen = () => { connected.value = true }
    eventSource.onerror = () => { connected.value = false } // EventSource 自动重连，onopen 恢复
    eventSource.onmessage = (event) => {
      let payload = null
      try { payload = JSON.parse(event.data) } catch { return }
      if (payload?.type === 'ops' && payload.requestId && Array.isArray(payload.ops)) {
        void handleOpsMessage(payload)
      }
    }
    unwatch = watch([nodes, edges, () => viewport.value, () => selectedNodeId.value], schedulePush)
    schedulePush() // 启动即推一版，agent 立即可读
  }

  const stop = () => {
    stopped = true
    connected.value = false
    clearTimeout(pushTimer)
    unwatch?.()
    eventSource?.close()
    eventSource = null
  }

  return { start, stop, connected }
}
