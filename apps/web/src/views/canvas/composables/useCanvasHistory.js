import { computed, ref, toRaw, watch } from 'vue'

const HISTORY_LIMIT = 50
const COALESCE_MS = 350
// setGraph 回放后 vue-flow 会回填测量值/句柄，短暂抑制 watcher 避免产生伪历史
const APPLY_SUPPRESS_MS = 450

const clonePlain = (value) => JSON.parse(JSON.stringify(toRaw(value)))

// 快照只保留语义字段：selected/dragging/handleBounds 等运行时状态不进历史
const snapshotNode = (node) => ({
  id: node.id,
  type: node.type,
  position: { x: node.position?.x || 0, y: node.position?.y || 0 },
  ...(node.parentNode ? { parentNode: node.parentNode } : {}),
  ...(node.extent ? { extent: node.extent } : {}),
  ...(node.style ? { style: clonePlain(node.style) } : {}),
  ...(node.dimensions
    ? { dimensions: { width: node.dimensions.width || 0, height: node.dimensions.height || 0 } }
    : {}),
  data: clonePlain(node.data || {}),
})

const snapshotEdge = (edge) => ({
  id: edge.id,
  source: edge.source,
  target: edge.target,
  sourceHandle: edge.sourceHandle || 'right',
  targetHandle: edge.targetHandle || 'left',
  ...(edge.data ? { data: clonePlain(edge.data) } : {}),
})

// 指纹忽略 dimensions：vue-flow 挂载/回放后会重测量回填，不算用户变更
const fingerprintOf = (snapshot) => JSON.stringify({
  nodes: snapshot.nodes.map(({ dimensions, ...rest }) => rest),
  edges: snapshot.edges,
})

/**
 * 画布撤销/重做（快照式，防抖合并连续变更）
 *
 * - watch nodes/edges 引用替换（图内全部走不可变更新，浅 watch 即可覆盖所有变更）
 * - 连续变更（拖拽、打字）400ms 内合并为一步
 * - isSystemMutation() 期间（任务运行/项目切换）静默并入基线，不产生撤销步
 */
export function useCanvasHistory({ nodes, edges, setGraph, isSystemMutation = () => false }) {
  const past = ref([])
  const future = ref([])
  const canUndo = computed(() => past.value.length > 0)
  const canRedo = computed(() => future.value.length > 0)

  let baselineSnapshot = null
  let baselineFingerprint = ''
  let baselineRefs = null
  let coalesceTimer = 0
  let suppressUntil = 0
  let interacting = false

  const takeSnapshot = () => {
    const snapshot = {
      nodes: toRaw(nodes.value).map(snapshotNode),
      edges: toRaw(edges.value).map(snapshotEdge),
    }
    return { snapshot, fingerprint: fingerprintOf(snapshot) }
  }

  const takeRefs = () => ({
    nodes: toRaw(nodes.value).map((node) => ({
      id: node.id,
      type: node.type,
      x: node.position?.x || 0,
      y: node.position?.y || 0,
      parentNode: node.parentNode || '',
      extent: node.extent || '',
      style: node.style,
      data: node.data,
    })),
    edges: toRaw(edges.value).map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle || 'right',
      targetHandle: edge.targetHandle || 'left',
      data: edge.data,
    })),
  })

  // 轻量比对：图内全部走不可变更新，data/style 引用未变即无语义变更。
  // 命中时跳过一次全图 clone + stringify（选中切换/尺寸回填等高频噪音）
  const isSemanticNoop = () => {
    if (!baselineRefs) return false
    const current = takeRefs()
    const { nodes: bn, edges: be } = baselineRefs
    if (current.nodes.length !== bn.length || current.edges.length !== be.length) return false
    for (let i = 0; i < bn.length; i++) {
      const a = current.nodes[i]
      const b = bn[i]
      if (a.id !== b.id || a.type !== b.type || a.x !== b.x || a.y !== b.y
        || a.parentNode !== b.parentNode || a.extent !== b.extent
        || a.style !== b.style || a.data !== b.data) return false
    }
    for (let i = 0; i < be.length; i++) {
      const a = current.edges[i]
      const b = be[i]
      if (a.id !== b.id || a.source !== b.source || a.target !== b.target
        || a.sourceHandle !== b.sourceHandle || a.targetHandle !== b.targetHandle
        || a.data !== b.data) return false
    }
    return true
  }

  const syncBaseline = (snapshot, fingerprint) => {
    baselineSnapshot = snapshot
    baselineFingerprint = fingerprint
    baselineRefs = takeRefs()
  }

  /** 以当前图为新基线并清空历史（切换/新建/删除画布后调用） */
  const reset = () => {
    clearTimeout(coalesceTimer)
    coalesceTimer = 0
    const { snapshot, fingerprint } = takeSnapshot()
    syncBaseline(snapshot, fingerprint)
    past.value = []
    future.value = []
  }

  /** 把防抖期内的未结算变更立即落成一步历史 */
  const settle = () => {
    if (!coalesceTimer) return
    clearTimeout(coalesceTimer)
    coalesceTimer = 0
    if (isSemanticNoop()) return // 纯选中/尺寸回填等噪音变更（引用级快检）
    // 快照只在结算时做一次：拖拽期间 watcher 每帧触发，仅重置计时器
    const { snapshot, fingerprint } = takeSnapshot()
    if (fingerprint === baselineFingerprint) return
    past.value.push(baselineSnapshot)
    if (past.value.length > HISTORY_LIMIT) past.value.shift()
    syncBaseline(snapshot, fingerprint)
    future.value = []
  }

  // 系统变更（任务运行/项目切换）：防抖后只同步基线，不产生撤销步
  const settleSystem = () => {
    if (!coalesceTimer) return
    clearTimeout(coalesceTimer)
    coalesceTimer = 0
    if (isSemanticNoop()) return
    const { snapshot, fingerprint } = takeSnapshot()
    syncBaseline(snapshot, fingerprint)
  }

  const schedule = () => {
    clearTimeout(coalesceTimer)
    coalesceTimer = setTimeout(isSystemMutation() ? settleSystem : settle, COALESCE_MS)
  }

  /**
   * 拖拽等连续交互期间置 true：watcher 不再每帧重建计时器，
   * 也不会在拖拽中途结算出中间态历史；交互结束自动重新调度一次结算
   */
  const setInteracting = (flag) => {
    const next = Boolean(flag)
    if (next === interacting) return
    interacting = next
    if (next) {
      clearTimeout(coalesceTimer)
      coalesceTimer = 0
    } else if (!isSemanticNoop()) {
      schedule()
    }
  }

  watch([nodes, edges], () => {
    if (interacting) return
    if (Date.now() < suppressUntil) {
      clearTimeout(coalesceTimer)
      coalesceTimer = setTimeout(settleSystem, COALESCE_MS)
      return
    }
    schedule()
  })

  const applySnapshot = (snapshot) => {
    suppressUntil = Date.now() + APPLY_SUPPRESS_MS
    clearTimeout(coalesceTimer)
    coalesceTimer = 0
    // 回放前深拷贝：历史条目不可被后续编辑原地污染
    setGraph(clonePlain({ nodes: snapshot.nodes, edges: snapshot.edges }))
    const { snapshot: current, fingerprint } = takeSnapshot()
    syncBaseline(current, fingerprint)
  }

  const undo = () => {
    settle()
    const prev = past.value.pop()
    if (!prev) return false
    future.value.unshift(baselineSnapshot)
    if (future.value.length > HISTORY_LIMIT) future.value.pop()
    applySnapshot(prev)
    return true
  }

  const redo = () => {
    settle()
    const next = future.value.shift()
    if (!next) return false
    past.value.push(baselineSnapshot)
    if (past.value.length > HISTORY_LIMIT) past.value.shift()
    applySnapshot(next)
    return true
  }

  return { canUndo, canRedo, undo, redo, reset, setInteracting }
}
