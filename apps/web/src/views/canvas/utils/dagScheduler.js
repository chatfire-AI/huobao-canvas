import { CANVAS_NODE_TYPES } from '../constants/nodeTypes.js'

/**
 * 判断节点是否为可执行模型/推理节点
 */
export function isExecutableNode(node) {
  if (!node || typeof node !== 'object') return false
  if (node.type === CANVAS_NODE_TYPES.GROUP) return false
  return true
}

/**
 * 检测图是否存在环形依赖 (Cycle Detection via DFS)
 * @param {Array} nodes
 * @param {Array} edges
 * @returns {boolean} true 表示存在环
 */
export function hasCycle(nodes, edges) {
  const adj = new Map()
  nodes.forEach((n) => adj.set(n.id, []))
  edges.forEach((e) => {
    if (adj.has(e.source) && adj.has(e.target)) {
      adj.get(e.source).push(e.target)
    }
  })

  const visited = new Map() // 0: unvisited, 1: visiting, 2: visited

  const dfs = (nodeId) => {
    visited.set(nodeId, 1)
    const neighbors = adj.get(nodeId) || []
    for (const nextId of neighbors) {
      const state = visited.get(nextId) || 0
      if (state === 1) return true // 发现后向边，存在环
      if (state === 0 && dfs(nextId)) return true
    }
    visited.set(nodeId, 2)
    return false
  }

  for (const node of nodes) {
    if ((visited.get(node.id) || 0) === 0) {
      if (dfs(node.id)) return true
    }
  }
  return false
}

/**
 * 反向回溯提取目标节点集合的所有前置上游依赖子图 (Upstream Subgraph)
 * @param {Array} nodes
 * @param {Array} edges
 * @param {string|Array<string>} targetNodeIds
 */
export function getUpstreamSubgraph(nodes, edges, targetNodeIds) {
  const targets = Array.isArray(targetNodeIds) ? targetNodeIds : [targetNodeIds]
  const targetSet = new Set(targets.filter(Boolean))
  if (targetSet.size === 0) return { nodes, edges }

  // 构建反向邻接表 target -> source
  const reverseAdj = new Map()
  nodes.forEach((n) => reverseAdj.set(n.id, []))
  edges.forEach((e) => {
    if (reverseAdj.has(e.target)) {
      reverseAdj.get(e.target).push(e.source)
    }
  })

  const includedNodeIds = new Set()
  const queue = [...targetSet]
  queue.forEach((id) => includedNodeIds.add(id))

  while (queue.length > 0) {
    const currentId = queue.shift()
    const parents = reverseAdj.get(currentId) || []
    for (const parentId of parents) {
      if (!includedNodeIds.has(parentId)) {
        includedNodeIds.add(parentId)
        queue.push(parentId)
      }
    }
  }

  const subNodes = nodes.filter((n) => includedNodeIds.has(n.id))
  const subEdges = edges.filter((e) => includedNodeIds.has(e.source) && includedNodeIds.has(e.target))
  return { nodes: subNodes, edges: subEdges }
}

/**
 * 提取起始节点集合出发的所有后置下游子图 (Downstream Subgraph)
 * @param {Array} nodes
 * @param {Array} edges
 * @param {string|Array<string>} startNodeIds
 */
export function getDownstreamSubgraph(nodes, edges, startNodeIds) {
  const starts = Array.isArray(startNodeIds) ? startNodeIds : [startNodeIds]
  const startSet = new Set(starts.filter(Boolean))
  if (startSet.size === 0) return { nodes, edges }

  // 正向邻接表 source -> target
  const adj = new Map()
  nodes.forEach((n) => adj.set(n.id, []))
  edges.forEach((e) => {
    if (adj.has(e.source)) {
      adj.get(e.source).push(e.target)
    }
  })

  const includedNodeIds = new Set()
  const queue = [...startSet]
  queue.forEach((id) => includedNodeIds.add(id))

  while (queue.length > 0) {
    const currentId = queue.shift()
    const children = adj.get(currentId) || []
    for (const childId of children) {
      if (!includedNodeIds.has(childId)) {
        includedNodeIds.add(childId)
        queue.push(childId)
      }
    }
  }

  const subNodes = nodes.filter((n) => includedNodeIds.has(n.id))
  const subEdges = edges.filter((e) => includedNodeIds.has(e.source) && includedNodeIds.has(e.target))
  return { nodes: subNodes, edges: subEdges }
}

/**
 * 构建拓扑分层执行计划 (Topological Layering)
 * 将节点按依赖深度划分为多个批次层，层内节点可并行，层间节点按序执行
 *
 * @param {Array} nodes
 * @param {Array} edges
 * @param {Object} options
 * @param {string|Array<string>} [options.targetNodeIds] - 若指定，则仅执行到这些目标节点
 * @param {string|Array<string>} [options.startNodeIds] - 若指定，则仅执行从这些节点出发的下游
 * @param {boolean} [options.executableOnly=true] - 是否自动过滤不可执行节点（如 groupNode）
 * @returns {{ layers: Array<Array<string>>, totalNodes: number, hasCycle: boolean }}
 */
export function buildWorkflowExecutionPlan(nodes = [], edges = [], options = {}) {
  let activeNodes = [...nodes]
  let activeEdges = [...edges]

  if (options.targetNodeIds) {
    const sub = getUpstreamSubgraph(activeNodes, activeEdges, options.targetNodeIds)
    activeNodes = sub.nodes
    activeEdges = sub.edges
  } else if (options.startNodeIds) {
    const sub = getDownstreamSubgraph(activeNodes, activeEdges, options.startNodeIds)
    activeNodes = sub.nodes
    activeEdges = sub.edges
  }

  // 1. 环检测
  if (hasCycle(activeNodes, activeEdges)) {
    return { layers: [], totalNodes: 0, hasCycle: true, error: '工作流中存在循环连线引用，无法执行' }
  }

  // 2. 入度与邻接表计算
  const inDegree = new Map()
  const adj = new Map()
  activeNodes.forEach((n) => {
    inDegree.set(n.id, 0)
    adj.set(n.id, [])
  })

  activeEdges.forEach((e) => {
    if (adj.has(e.source) && inDegree.has(e.target)) {
      adj.get(e.source).push(e.target)
      inDegree.set(e.target, inDegree.get(e.target) + 1)
    }
  })

  // 3. 分层拓扑排序 (Kahn's Algorithm with Layering)
  const layers = []
  let currentLayer = activeNodes
    .filter((n) => inDegree.get(n.id) === 0)
    .map((n) => n.id)

  const processed = new Set()

  while (currentLayer.length > 0) {
    const layerToExecute = options.executableOnly === false
      ? currentLayer
      : currentLayer.filter((id) => {
          const node = activeNodes.find((n) => n.id === id)
          return isExecutableNode(node)
        })

    if (layerToExecute.length > 0) {
      layers.push(layerToExecute)
    }

    currentLayer.forEach((id) => processed.add(id))

    const nextLayer = []
    for (const nodeId of currentLayer) {
      const neighbors = adj.get(nodeId) || []
      for (const nextId of neighbors) {
        inDegree.set(nextId, inDegree.get(nextId) - 1)
        if (inDegree.get(nextId) === 0 && !processed.has(nextId)) {
          nextLayer.push(nextId)
        }
      }
    }
    currentLayer = nextLayer
  }

  const totalNodes = layers.reduce((acc, l) => acc + l.length, 0)
  return {
    layers,
    totalNodes,
    hasCycle: false,
  }
}
