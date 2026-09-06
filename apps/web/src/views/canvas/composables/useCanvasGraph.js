import { computed, nextTick, ref, shallowRef, toRaw } from 'vue'
import { useVueFlow } from '@vue-flow/core'
import {
  ACTIVE_CANVAS_NODE_TYPES,
  CANVAS_NODE_TYPES,
  NODE_STATUS,
  getNodeDefaults,
} from '../constants/nodeTypes.js'
import { isConnectionAllowed } from '../utils/connectionRules.js'
import { computeGroupBounds, computeLayeredLayout } from '../utils/graphLayout.js'
import { sanitizeCanvasGraph } from '../utils/graphSerialization.js'

const makeId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
const RESULT_OWNERSHIP_KEYS = [
  'resultOwnerNodeId',
  'resultIndex',
  'resultBatchId',
  'batchId',
  'batchIndex',
]
const RESULT_URL_KEYS = [
  'url', 'image_url', 'imageUrl', 'video_url', 'videoUrl',
  'audio_url', 'audioUrl', 'output_url', 'outputUrl',
]

export const stripCanvasResultOwnership = (payload = {}, { clearTask = false } = {}) => {
  const next = { ...payload }
  for (const key of RESULT_OWNERSHIP_KEYS) delete next[key]
  if (clearTask) {
    delete next.task
    delete next.taskId
    delete next.sourceNodeId
    delete next.error
    delete next.notice
  }
  return next
}

const getCanvasResultUrl = (result) => {
  if (typeof result === 'string') return /^https?:\/\//.test(result) ? result : ''
  if (!result || typeof result !== 'object') return ''
  const key = RESULT_URL_KEYS.find((candidate) => typeof result[candidate] === 'string')
  return key ? result[key] : ''
}

const idValue = (value) => {
  if (value == null) return ''
  if (typeof value === 'string') return value
  return value.id || value.nodeId || ''
}

const normalizeConnection = (input) => {
  const connection = input?.connection || input?.params || input || {}
  const source = idValue(connection.source || connection.sourceNode || connection.sourceNodeId)
  const target = idValue(connection.target || connection.targetNode || connection.targetNodeId)
  return {
    source,
    target,
    sourceHandle: connection.sourceHandle || connection.sourceHandleId || null,
    targetHandle: connection.targetHandle || connection.targetHandleId || null,
  }
}

export const makeCanvasEdgeId = (source, target) => `edge_${source}_${target}`

export const isCanvasConnectionDirectionAllowed = (input) => {
  const connection = normalizeConnection(input)
  const sourceHandle = connection.sourceHandle || 'right'
  const targetHandle = connection.targetHandle || 'left'
  return (
    (sourceHandle === 'right' && targetHandle === 'left') ||
    (sourceHandle === 'left' && targetHandle === 'right')
  )
}

export const normalizeCanvasConnection = (input) => {
  const connection = normalizeConnection(input)
  if (connection.sourceHandle === 'left' && connection.targetHandle === 'right') {
    return {
      source: connection.target,
      target: connection.source,
      sourceHandle: 'right',
      targetHandle: 'left',
    }
  }

  return {
    source: connection.source,
    target: connection.target,
    sourceHandle: connection.sourceHandle || 'right',
    targetHandle: connection.targetHandle || 'left',
  }
}

export function useCanvasGraph() {
  const nodes = shallowRef([])
  const edges = shallowRef([])
  const selectedNodeId = ref('')
  const selectedEdgeId = ref('')
  const copiedGraph = ref(null)
  const { project, fitView, setViewport, getViewport } = useVueFlow()

  const selectedNode = computed(() => nodes.value.find((node) => node.id === selectedNodeId.value) || null)
  const selectedNodes = computed(() => nodes.value.filter((node) => node.selected))
  const selectedNodeIds = computed(() => selectedNodes.value.map((node) => node.id))
  const hasSelection = computed(() => Boolean(
    selectedNodeId.value ||
    selectedEdgeId.value ||
    selectedNodes.value.length,
  ))

  const setGraph = (graph = {}) => {
    const allowedTypes = new Set(ACTIVE_CANVAS_NODE_TYPES)
    const nextNodes = Array.isArray(graph.nodes)
      ? graph.nodes.filter((node) => allowedTypes.has(node.type))
      : []
    const nextNodesById = new Map(nextNodes.map((node) => [node.id, node]))
    const seenEdgeIds = new Set()
    nodes.value = nextNodes
    edges.value = Array.isArray(graph.edges)
      ? graph.edges
        .filter((edge) => isCanvasConnectionDirectionAllowed(edge))
        .map((edge) => normalizeCanvasConnection(edge))
        .filter((edge) => {
          const sourceNode = nextNodesById.get(edge.source)
          const targetNode = nextNodesById.get(edge.target)
          if (!sourceNode || !targetNode || !isConnectionAllowed(sourceNode.type, targetNode.type)) {
            return false
          }
          const edgeId = makeCanvasEdgeId(edge.source, edge.target)
          if (seenEdgeIds.has(edgeId)) return false
          seenEdgeIds.add(edgeId)
          return true
        })
        .map((edge) => ({
          ...edge,
          id: makeCanvasEdgeId(edge.source, edge.target),
          type: 'canvas',
          data: {
            ...(edge.data || {}),
            mapping: edge.targetHandle || 'left',
          },
        }))
      : []
    if (graph.viewport) {
      setTimeout(() => setViewport(graph.viewport), 0)
    }
    selectedNodeId.value = ''
    selectedEdgeId.value = ''
  }

  const clonePlain = (value) => JSON.parse(JSON.stringify(toRaw(value)))

  const getNodeById = (nodeId) => nodes.value.find((node) => node.id === nodeId) || null

  const toGraph = () => sanitizeCanvasGraph({
    nodes: toRaw(nodes.value),
    edges: toRaw(edges.value),
    viewport: toRaw(getViewport()),
  })

  const addNode = (type, position, options = {}) => {
    const nodeType = ACTIVE_CANVAS_NODE_TYPES.includes(type) ? type : CANVAS_NODE_TYPES.TEXT
    const id = makeId(nodeType.replace(/Node$/, ''))
    const nextPosition = position || {
      x: 120 + nodes.value.length * 300,
      y: 120 + nodes.value.length * 40,
    }
    const node = {
      id,
      type: nodeType,
      position: nextPosition,
      ...(options.parentNode ? { parentNode: options.parentNode } : {}),
      ...(options.extent ? { extent: options.extent } : {}),
      ...(options.dimensions ? { dimensions: options.dimensions } : {}),
      data: options.data ? clonePlain(options.data) : getNodeDefaults(nodeType),
    }
    nodes.value = [...nodes.value, node]
    if (options.select !== false) {
      selectedNodeId.value = id
      selectedEdgeId.value = ''
    }
    return node
  }

  const updateNodeData = (nodeId, patch, { userMutation = false } = {}) => {
    nodes.value = nodes.value.map((node) => {
      if (node.id !== nodeId) return node
      const currentPayload = userMutation
        ? stripCanvasResultOwnership(node.data?.payload || {})
        : (node.data?.payload || {})
      return {
        ...node,
        data: {
          ...node.data,
          ...patch,
          payload: {
            ...currentPayload,
            ...(patch.payload || {}),
          },
          updatedAt: Date.now(),
        },
      }
    })
  }

  const updateNodePayload = (nodeId, payloadPatch, options) => {
    updateNodeData(nodeId, { payload: payloadPatch }, options)
  }

  const updateNodeStatus = (nodeId, status, extraPayload = {}) => {
    updateNodeData(nodeId, {
      status,
      payload: extraPayload,
    })
  }

  const detachResultOwnership = (nodeId) => {
    let detached = false
    nodes.value = nodes.value.map((node) => {
      if (node.id !== nodeId || !node.data?.payload?.resultOwnerNodeId) return node
      detached = true
      return {
        ...node,
        data: {
          ...node.data,
          payload: stripCanvasResultOwnership(node.data.payload),
          updatedAt: Date.now(),
        },
      }
    })
    return detached
  }

  const selectNode = (nodeId) => {
    selectedNodeId.value = nodeId || ''
    selectedEdgeId.value = ''
    edges.value = edges.value.map((edge) => ({ ...edge, selected: false }))
  }

  const selectEdge = (edgeId) => {
    selectedEdgeId.value = edgeId || ''
    selectedNodeId.value = ''
    nodes.value = nodes.value.map((node) => ({ ...node, selected: false }))
  }

  const clearSelection = () => {
    selectedNodeId.value = ''
    selectedEdgeId.value = ''
    nodes.value = nodes.value.map((node) => ({ ...node, selected: false }))
    edges.value = edges.value.map((edge) => ({ ...edge, selected: false }))
  }

  const selectAllNodes = () => {
    if (!nodes.value.length) return []
    nodes.value = nodes.value.map((node) => ({ ...node, selected: true }))
    selectedNodeId.value = nodes.value.at(-1)?.id || ''
    selectedEdgeId.value = ''
    return nodes.value
  }

  const detachGroupChildren = (group) => {
    nodes.value = nodes.value.map((node) => node.parentNode === group.id
      ? {
          ...node,
          parentNode: undefined,
          extent: undefined,
          position: {
            x: node.position.x + (group.position?.x ?? 0),
            y: node.position.y + (group.position?.y ?? 0),
          },
        }
      : node)
  }

  const deleteSelectedGraphItems = () => {
    const ids = new Set(selectedNodeIds.value)
    if (selectedNodeId.value) ids.add(selectedNodeId.value)

    if (ids.size) {
      const removedEdges = edges.value.filter((edge) => ids.has(edge.source) || ids.has(edge.target))
      for (const edge of removedEdges) {
        if (!ids.has(edge.source)) detachResultOwnership(edge.source)
        if (!ids.has(edge.target)) detachResultOwnership(edge.target)
      }
      nodes.value = nodes.value.map((node) => (
        !ids.has(node.id) && ids.has(node.data?.payload?.resultOwnerNodeId)
          ? {
              ...node,
              data: {
                ...node.data,
                payload: stripCanvasResultOwnership(node.data.payload),
              },
            }
          : node
      ))
      for (const id of ids) {
        const group = nodes.value.find((node) =>
          node.id === id && node.type === CANVAS_NODE_TYPES.GROUP,
        )
        if (group) detachGroupChildren(group)
      }
      nodes.value = nodes.value.filter((node) => !ids.has(node.id))
      edges.value = edges.value.filter((edge) => !ids.has(edge.source) && !ids.has(edge.target))
      selectedNodeId.value = ''
      selectedEdgeId.value = ''
      return
    }

    if (selectedEdgeId.value) {
      const edge = edges.value.find((item) => item.id === selectedEdgeId.value)
      if (edge) {
        detachResultOwnership(edge.source)
        detachResultOwnership(edge.target)
      }
      edges.value = edges.value.filter((edge) => edge.id !== selectedEdgeId.value)
      selectedEdgeId.value = ''
    }
  }

  const groupSelectedNodes = () => {
    const children = selectedNodes.value.filter((node) => node.type !== CANVAS_NODE_TYPES.GROUP)
    if (children.length < 2 || children.some((node) => node.parentNode)) return ''

    const bounds = computeGroupBounds(children)
    const group = addNode(CANVAS_NODE_TYPES.GROUP, { x: bounds.x, y: bounds.y })
    const childIds = new Set(children.map((node) => node.id))
    const childPositions = new Map(children.map((node) => [node.id, {
      x: node.position.x - bounds.x,
      y: node.position.y - bounds.y,
    }]))
    group.style = { width: `${bounds.width}px`, height: `${bounds.height}px` }
    nodes.value = [
      group,
      ...nodes.value
        .filter((node) => node.id !== group.id)
        .map((node) => childIds.has(node.id)
          ? {
              ...node,
              parentNode: group.id,
              extent: 'parent',
              position: childPositions.get(node.id),
              selected: false,
            }
          : node),
    ]
    selectedNodeId.value = group.id
    nextTick(() => {
      if (!getNodeById(group.id)) return
      nodes.value = nodes.value.map((node) => childPositions.has(node.id)
        ? { ...node, position: childPositions.get(node.id) }
        : node)
    })
    return group.id
  }

  const ungroupNode = (groupId) => {
    const group = nodes.value.find((node) =>
      node.id === groupId && node.type === CANVAS_NODE_TYPES.GROUP,
    )
    if (!group) return false

    detachGroupChildren(group)
    nodes.value = nodes.value.filter((node) => node.id !== groupId)
    edges.value = edges.value.filter((edge) => edge.source !== groupId && edge.target !== groupId)
    if (selectedNodeId.value === groupId) selectedNodeId.value = ''
    if (selectedEdgeId.value && !edges.value.some((edge) => edge.id === selectedEdgeId.value)) {
      selectedEdgeId.value = ''
    }
    return true
  }

  const layoutGroup = (groupId, direction) => {
    if (direction !== 'horizontal' && direction !== 'vertical') return false
    const group = nodes.value.find((node) =>
      node.id === groupId && node.type === CANVAS_NODE_TYPES.GROUP,
    )
    if (!group) return false
    const children = nodes.value.filter((node) => node.parentNode === groupId)
    if (!children.length) return false

    let cursor = 40
    let crossSize = 0
    const positions = new Map()
    for (const child of children) {
      const width = child.dimensions?.width || 240
      const height = child.dimensions?.height || 160
      positions.set(child.id, direction === 'horizontal'
        ? { x: cursor, y: 40 }
        : { x: 40, y: cursor })
      cursor += (direction === 'horizontal' ? width : height) + 40
      crossSize = Math.max(crossSize, direction === 'horizontal' ? height : width)
    }
    const style = direction === 'horizontal'
      ? { width: `${cursor}px`, height: `${crossSize + 80}px` }
      : { width: `${crossSize + 80}px`, height: `${cursor}px` }
    nodes.value = nodes.value.map((node) => {
      if (node.id === groupId) return { ...node, style: { ...node.style, ...style } }
      const position = positions.get(node.id)
      return position ? { ...node, position } : node
    })
    return true
  }

  const applyAutoLayout = () => {
    const positions = computeLayeredLayout(nodes.value, edges.value)
    if (!Object.keys(positions).length) return false
    nodes.value = nodes.value.map((node) => positions[node.id]
      ? { ...node, position: positions[node.id] }
      : node)
    return true
  }

  const clearCanvas = () => {
    nodes.value = []
    edges.value = []
    selectedNodeId.value = ''
    selectedEdgeId.value = ''
  }

  // 分组节点作为连接端点时，展开为组内所有可连线子节点的批量连接
  const expandGroupConnection = (connection) => {
    const sourceNode = getNodeById(connection.source)
    const targetNode = getNodeById(connection.target)
    if (!sourceNode || !targetNode) return [connection]

    const isSourceGroup = sourceNode.type === CANVAS_NODE_TYPES.GROUP
    const isTargetGroup = targetNode.type === CANVAS_NODE_TYPES.GROUP
    if (!isSourceGroup && !isTargetGroup) return [connection]

    if (isSourceGroup && isTargetGroup) return [] // 组→组不支持

    if (isSourceGroup) {
      // 组 → 节点：组内所有可与目标类型连线的子节点 → 目标
      const children = nodes.value.filter((node) =>
        node.parentNode === sourceNode.id &&
        node.type !== CANVAS_NODE_TYPES.GROUP &&
        isConnectionAllowed(node.type, targetNode.type),
      )
      return children.map((child) => ({
        source: child.id,
        target: connection.target,
        sourceHandle: 'right',
        targetHandle: connection.targetHandle || 'left',
      }))
    }

    // 节点 → 组：源 → 组内所有可与源类型连线的子节点
    const children = nodes.value.filter((node) =>
      node.parentNode === targetNode.id &&
      node.type !== CANVAS_NODE_TYPES.GROUP &&
      isConnectionAllowed(sourceNode.type, node.type),
    )
    return children.map((child) => ({
      source: connection.source,
      target: child.id,
      sourceHandle: connection.sourceHandle || 'right',
      targetHandle: 'left',
    }))
  }

  const isValidConnection = (rawConnection) => {
    if (!isCanvasConnectionDirectionAllowed(rawConnection)) return false

    const connection = normalizeCanvasConnection(rawConnection)
    const connectionId = rawConnection?.id || rawConnection?.connection?.id || rawConnection?.params?.id || ''
    if (!connection.source || !connection.target || connection.source === connection.target) return false

    const sourceNode = getNodeById(connection.source)
    const targetNode = getNodeById(connection.target)
    if (!sourceNode || !targetNode) return false

    // 分组节点参与连接时，只要组内有可连线的子节点即有效
    if (sourceNode.type === CANVAS_NODE_TYPES.GROUP || targetNode.type === CANVAS_NODE_TYPES.GROUP) {
      return expandGroupConnection(connection).length > 0
    }

    if (!isConnectionAllowed(sourceNode.type, targetNode.type)) return false

    return !edges.value.some((edge) =>
      edge.id !== connectionId &&
      edge.source === connection.source &&
      edge.target === connection.target,
    )
  }

  const appendEdge = (rawConnection, { source: mutationSource = 'user' } = {}) => {
    if (!isCanvasConnectionDirectionAllowed(rawConnection)) return null

    const connection = normalizeCanvasConnection(rawConnection)
    if (!isValidConnection(connection)) return null

    const exists = edges.value.some((edge) =>
      edge.source === connection.source &&
      edge.target === connection.target,
    )
    if (exists) return null

    const edge = {
      ...connection,
      id: makeCanvasEdgeId(connection.source, connection.target),
      type: 'canvas',
      data: {
        mapping: connection.targetHandle || 'left',
      },
    }
    const nextEdges = [...edges.value, edge]
    edges.value = nextEdges
    if (mutationSource === 'user') {
      detachResultOwnership(connection.source)
      detachResultOwnership(connection.target)
    }
    return edge
  }

  // 多选批量连接：选中多个节点时，从任一选中节点拉线 → 所有兼容的选中节点都连上
  const expandSelectionConnection = (connection) => {
    const selected = new Set(selectedNodeIds.value)
    if (selected.size < 2) return null // 单选不走批量

    const sourceNode = getNodeById(connection.source)
    const targetNode = getNodeById(connection.target)
    if (!sourceNode || !targetNode) return null

    // 组连接优先（expandGroupConnection 已处理）
    if (sourceNode.type === CANVAS_NODE_TYPES.GROUP || targetNode.type === CANVAS_NODE_TYPES.GROUP) return null

    // 源在多选中：所有兼容的选中节点 → 目标
    if (selected.has(connection.source)) {
      const compatible = [...selected]
        .filter((id) => id !== connection.target)
        .map((id) => getNodeById(id))
        .filter((node) => node && node.type !== CANVAS_NODE_TYPES.GROUP &&
          isConnectionAllowed(node.type, targetNode.type))
      if (compatible.length > 1) {
        return compatible.map((node) => ({
          source: node.id,
          target: connection.target,
          sourceHandle: 'right',
          targetHandle: connection.targetHandle || 'left',
        }))
      }
    }

    // 目标在多选中：源 → 所有兼容的选中节点
    if (selected.has(connection.target)) {
      const compatible = [...selected]
        .filter((id) => id !== connection.source)
        .map((id) => getNodeById(id))
        .filter((node) => node && node.type !== CANVAS_NODE_TYPES.GROUP &&
          isConnectionAllowed(sourceNode.type, node.type))
      if (compatible.length > 1) {
        return compatible.map((node) => ({
          source: connection.source,
          target: node.id,
          sourceHandle: connection.sourceHandle || 'right',
          targetHandle: 'left',
        }))
      }
    }

    return null
  }

  const onConnect = (connection) => {
    // 优先：多选批量连接
    const selectionExpanded = expandSelectionConnection(connection)
    if (selectionExpanded) {
      let first = null
      for (const conn of selectionExpanded) {
        const edge = appendEdge(conn)
        if (edge && !first) first = edge
      }
      return first
    }

    // 其次：分组展开连接
    const groupExpanded = expandGroupConnection(connection)
    if (!groupExpanded.length) return null
    if (groupExpanded.length === 1) return appendEdge(groupExpanded[0])
    let first = null
    for (const conn of groupExpanded) {
      const edge = appendEdge(conn)
      if (edge && !first) first = edge
    }
    return first
  }

  const addConnectedNode = ({ sourceNodeId, side = 'right', type, position }) => {
    const sourceNode = getNodeById(sourceNodeId)
    if (!sourceNode || !type) return null

    const nextNode = addNode(type, position)
    const connection = side === 'left'
      ? {
          source: sourceNodeId,
          target: nextNode.id,
          sourceHandle: 'left',
          targetHandle: 'right',
        }
      : {
          source: sourceNodeId,
          target: nextNode.id,
          sourceHandle: 'right',
          targetHandle: 'left',
        }

    appendEdge(connection)
    return nextNode
  }

  const copySelected = () => {
    const ids = selectedNodeIds.value.length
      ? selectedNodeIds.value
      : selectedNodeId.value
        ? [selectedNodeId.value]
        : []
    const idSet = new Set(ids)
    const groupIds = new Set(nodes.value
      .filter((node) => idSet.has(node.id) && node.type === CANVAS_NODE_TYPES.GROUP)
      .map((node) => node.id))
    for (const node of nodes.value) {
      if (groupIds.has(node.parentNode)) idSet.add(node.id)
    }
    const copiedNodes = nodes.value.filter((node) => idSet.has(node.id)).map(clonePlain)
    const copiedEdges = edges.value
      .filter((edge) => idSet.has(edge.source) && idSet.has(edge.target))
      .map(clonePlain)
    copiedGraph.value = { nodes: copiedNodes, edges: copiedEdges }
    return copiedGraph.value
  }

  const pasteCopied = () => {
    const graph = copiedGraph.value
    if (!graph?.nodes?.length) return []

    const idMap = new Map(graph.nodes.map((node) => [
      node.id,
      makeId(node.type.replace(/Node$/, 'paste')),
    ]))
    const nextNodes = graph.nodes.map((node) => {
      const parentNode = idMap.get(node.parentNode)
      const copiedData = clonePlain(node.data || {})
      const copiedStatus = [NODE_STATUS.RUNNING, NODE_STATUS.WAITING].includes(copiedData.status)
        ? NODE_STATUS.IDLE
        : copiedData.status
      return {
        ...clonePlain(node),
        id: idMap.get(node.id),
        ...(parentNode ? { parentNode } : {}),
        position: parentNode
          ? { ...node.position }
          : {
              x: node.position.x + 42,
              y: node.position.y + 42,
            },
        selected: true,
        data: {
          ...copiedData,
          status: copiedStatus,
          title: `${node.data?.title || '节点'} 副本`,
          payload: stripCanvasResultOwnership(copiedData.payload || {}, { clearTask: true }),
          updatedAt: Date.now(),
        },
      }
    })

    const nextEdges = graph.edges
      .filter((edge) => idMap.has(edge.source) && idMap.has(edge.target))
      .map((edge) => {
        const source = idMap.get(edge.source)
        const target = idMap.get(edge.target)
        return {
          ...clonePlain(edge),
          id: makeCanvasEdgeId(source, target),
          source,
          target,
          selected: false,
        }
      })

    nodes.value = [
      ...nodes.value.map((node) => ({ ...node, selected: false })),
      ...nextNodes,
    ]
    edges.value = [...edges.value, ...nextEdges]
    selectedNodeId.value = nextNodes[0]?.id || ''
    selectedEdgeId.value = ''
    copiedGraph.value = { nodes: nextNodes, edges: nextEdges }
    return nextNodes
  }

  const duplicateSelected = () => {
    const graph = copySelected()
    if (!graph?.nodes?.length) return []
    return pasteCopied()
  }

  const getIncomingNodes = (nodeId) => {
    const incomingEdges = edges.value.filter((edge) => edge.target === nodeId)
    return incomingEdges
      .map((edge) => ({
        edge,
        node: nodes.value.find((node) => node.id === edge.source),
      }))
      .filter((item) => item.node)
  }

  const materializeCanvasResults = (ownerNodeId, runResult = {}) => {
    const owner = getNodeById(ownerNodeId)
    if (!owner) return []

    const attached = nodes.value.filter((node) =>
      node.data?.payload?.resultOwnerNodeId === ownerNodeId,
    )
    const removeAttached = (items) => {
      const ids = new Set(items.map((node) => node.id))
      if (!ids.size) return
      nodes.value = nodes.value.filter((node) => !ids.has(node.id))
      edges.value = edges.value.filter((edge) => !ids.has(edge.source) && !ids.has(edge.target))
    }
    const selectOwner = () => {
      nodes.value = nodes.value.map((node) => ({
        ...node,
        selected: node.id === ownerNodeId,
      }))
      selectedNodeId.value = ownerNodeId
      selectedEdgeId.value = ''
    }

    if (runResult.unavailableReason) {
      removeAttached(attached)
      nodes.value = nodes.value.map((node) => {
        if (node.id !== ownerNodeId) return node
        const payload = stripCanvasResultOwnership(node.data?.payload || {}, { clearTask: true })
        delete payload.requestMeta
        return {
          ...node,
          data: {
            ...node.data,
            status: NODE_STATUS.UNAVAILABLE,
            payload: {
              ...payload,
              url: '',
              result: null,
              parsedResults: [],
              notice: runResult.unavailableReason,
              error: '',
            },
            updatedAt: Date.now(),
          },
        }
      })
      selectOwner()
      return []
    }

    const results = Array.isArray(runResult.parsedResults) && runResult.parsedResults.length
      ? runResult.parsedResults
      : runResult.result == null
        ? []
        : [runResult.result]
    if (!results.length) return []

    const existingByIndex = new Map()
    const stale = []
    for (const sibling of attached) {
      const index = Number(sibling.data?.payload?.resultIndex)
      if (index < 1 || index >= results.length || existingByIndex.has(index)) stale.push(sibling)
      else existingByIndex.set(index, sibling)
    }
    removeAttached(stale)

    const ownerPayload = stripCanvasResultOwnership(owner.data?.payload || {}, { clearTask: true })
    delete ownerPayload.notice
    delete ownerPayload.error
    nodes.value = nodes.value.map((node) => node.id === ownerNodeId
      ? {
          ...node,
          data: {
            ...node.data,
            status: NODE_STATUS.SUCCESS,
            payload: {
              ...ownerPayload,
              resultType: runResult.resultType || ownerPayload.resultType,
              result: results[0],
              parsedResults: [results[0]],
              requestMeta: runResult.requestMeta,
              url: getCanvasResultUrl(results[0]),
              error: '',
            },
            updatedAt: Date.now(),
          },
        }
      : node)

    const ownerWidth = owner.dimensions?.width || 260
    const ownerHeight = owner.dimensions?.height || 160
    const parentNode = owner.parentNode
    const siblingIds = []
    for (let index = 1; index < results.length; index += 1) {
      const existing = existingByIndex.get(index)
      const result = results[index]
      const siblingPayload = stripCanvasResultOwnership(ownerPayload, { clearTask: true })
      delete siblingPayload.requestMeta
      delete siblingPayload.notice
      delete siblingPayload.error
      const data = {
        ...clonePlain(owner.data || {}),
        status: NODE_STATUS.SUCCESS,
        title: `${owner.data?.title || '结果'} ${index + 1}`,
        payload: {
          ...siblingPayload,
          resultType: runResult.resultType || siblingPayload.resultType,
          result,
          parsedResults: [result],
          url: getCanvasResultUrl(result),
          resultOwnerNodeId: ownerNodeId,
          resultIndex: index,
          error: '',
        },
        updatedAt: Date.now(),
      }

      let sibling = existing ? getNodeById(existing.id) : null
      if (sibling) {
        nodes.value = nodes.value.map((node) => node.id === sibling.id
          ? { ...node, data }
          : node)
      } else {
        const sameSpaceNodes = () => nodes.value.filter((node) =>
          (node.parentNode || '') === (parentNode || ''),
        )
        let position = {
          x: owner.position?.x || 0,
          y: (owner.position?.y || 0) + index * (ownerHeight + 40),
        }
        const collides = (node) => {
          const width = node.dimensions?.width || 260
          const height = node.dimensions?.height || 160
          return position.x < (node.position?.x || 0) + width &&
            position.x + ownerWidth > (node.position?.x || 0) &&
            position.y < (node.position?.y || 0) + height &&
            position.y + ownerHeight > (node.position?.y || 0)
        }
        while (sameSpaceNodes().some(collides)) {
          position = { ...position, y: position.y + ownerHeight + 40 }
        }
        sibling = addNode(owner.type, position, {
          parentNode,
          extent: owner.extent,
          dimensions: owner.dimensions,
          data,
          select: false,
        })
      }
      siblingIds.push(sibling.id)
    }

    const ownerIncoming = edges.value.filter((edge) => edge.target === ownerNodeId)
    const siblingIdSet = new Set(siblingIds)
    edges.value = edges.value.filter((edge) => !siblingIdSet.has(edge.target))
    for (const siblingId of siblingIds) {
      for (const edge of ownerIncoming) {
        appendEdge({
          source: edge.source,
          target: siblingId,
          sourceHandle: edge.sourceHandle || 'right',
          targetHandle: edge.targetHandle || 'left',
        }, { source: 'system' })
      }
    }

    if (parentNode) {
      const group = getNodeById(parentNode)
      if (group) {
        const children = nodes.value.filter((node) => node.parentNode === parentNode)
        const neededWidth = Math.max(...children.map((node) =>
          (node.position?.x || 0) + (node.dimensions?.width || 260) + 40,
        ))
        const neededHeight = Math.max(...children.map((node) =>
          (node.position?.y || 0) + (node.dimensions?.height || 160) + 40,
        ))
        const currentWidth = Number.parseFloat(group.style?.width) || 0
        const currentHeight = Number.parseFloat(group.style?.height) || 0
        nodes.value = nodes.value.map((node) => node.id === parentNode
          ? {
              ...node,
              style: {
                ...node.style,
                width: `${Math.max(currentWidth, neededWidth)}px`,
                height: `${Math.max(currentHeight, neededHeight)}px`,
              },
            }
          : node)
      }
    }

    selectOwner()
    return [getNodeById(ownerNodeId), ...siblingIds.map(getNodeById)].filter(Boolean)
  }

  const fitCanvas = () => {
    return fitView({ padding: 0.2, duration: 220 })
  }

  const fitSelected = () => {
    const nodeIds = selectedNodeIds.value
    if (!nodeIds.length && selectedNodeId.value) nodeIds.push(selectedNodeId.value)
    if (!nodeIds.length) return fitCanvas()
    return fitView({ nodes: [...new Set(nodeIds)], padding: 0.28, duration: 220 })
  }

  return {
    project,
    nodes,
    edges,
    selectedNodeId,
    selectedEdgeId,
    selectedNode,
    selectedNodes,
    selectedNodeIds,
    hasSelection,
    setGraph,
    toGraph,
    getNodeById,
    addNode,
    updateNodeData,
    updateNodePayload,
    updateNodeStatus,
    detachResultOwnership,
    selectNode,
    selectEdge,
    clearSelection,
    selectAllNodes,
    deleteSelected: deleteSelectedGraphItems,
    deleteSelectedGraphItems,
    groupSelectedNodes,
    ungroupNode,
    layoutGroup,
    applyAutoLayout,
    duplicateSelected,
    copySelected,
    pasteCopied,
    clearCanvas,
    isValidConnection,
    expandGroupConnection,
    onConnect,
    appendEdge,
    addConnectedNode,
    getIncomingNodes,
    materializeCanvasResults,
    fitCanvas,
    fitSelected,
  }
}
