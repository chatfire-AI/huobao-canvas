import { sanitizeCanvasGraph } from './graphSerialization.js'

const WORKFLOW_SCHEMA_VERSION = 2
const makeId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

/**
 * 导出工作流为 JSON 文件
 * @param {Object} graph { nodes, edges, viewport }
 * @param {string} [name='workflow']
 */
export function exportWorkflowToFile(graph, name = 'workflow') {
  const safeGraph = sanitizeCanvasGraph(graph)
  const workflowData = {
    schemaVersion: WORKFLOW_SCHEMA_VERSION,
    appName: 'chatfire-canvas',
    name: name || '未命名工作流',
    exportedAt: new Date().toISOString(),
    nodes: safeGraph.nodes || [],
    edges: safeGraph.edges || [],
    viewport: safeGraph.viewport || { x: 0, y: 0, zoom: 1 },
  }

  const jsonStr = JSON.stringify(workflowData, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `${name.replace(/[\\/:*?"<>|]/g, '_')}_${new Date().toISOString().slice(0, 10)}.flow.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * 解析导入的工作流文件内容
 * @param {string|File} input
 * @returns {Promise<Object>}
 */
export async function parseWorkflowFile(input) {
  let content = ''
  if (typeof input === 'string') {
    content = input
  } else if (input instanceof File || input instanceof Blob) {
    content = await input.text()
  } else {
    throw new Error('无效的输入格式')
  }

  let data
  try {
    data = JSON.parse(content)
  } catch {
    throw new Error('工作流文件解析失败，不是合法的 JSON')
  }

  if (!data || typeof data !== 'object') {
    throw new Error('工作流文件格式错误')
  }

  const nodes = Array.isArray(data.nodes) ? data.nodes : []
  const edges = Array.isArray(data.edges) ? data.edges : []

  if (nodes.length === 0) {
    throw new Error('工作流中不包含任何节点')
  }

  return {
    name: data.name || '导入的工作流',
    nodes,
    edges,
    viewport: data.viewport || { x: 0, y: 0, zoom: 1 },
  }
}

/**
 * 将导入的工作流合并到当前画布中（支持节点 ID 重映射与坐标偏移）
 * @param {Object} currentGraph { nodes, edges }
 * @param {Object} importedGraph { nodes, edges }
 * @param {Object} options
 * @param {boolean} [options.replace=false] - 是否直接替换当前画布
 * @param {{ x: number, y: number }} [options.offset={ x: 60, y: 60 }] - 偏移量
 */
export function remapAndMergeWorkflow(currentGraph, importedGraph, { replace = false, offset = { x: 60, y: 60 } } = {}) {
  if (replace) {
    return {
      nodes: importedGraph.nodes || [],
      edges: importedGraph.edges || [],
    }
  }

  // 为导入的节点分配新 ID，建立映射
  const idMap = new Map()
  const remappedNodes = (importedGraph.nodes || []).map((node) => {
    const newId = makeId(node.type || 'node')
    idMap.set(node.id, newId)

    const posX = (node.position?.x ?? 0) + (offset.x ?? 0)
    const posY = (node.position?.y ?? 0) + (offset.y ?? 0)

    return {
      ...node,
      id: newId,
      position: { x: posX, y: posY },
      parentNode: node.parentNode ? (idMap.get(node.parentNode) || node.parentNode) : undefined,
    }
  })

  // 同步更新连线中的 source / target
  const remappedEdges = (importedGraph.edges || [])
    .filter((edge) => idMap.has(edge.source) && idMap.has(edge.target))
    .map((edge) => {
      const newSource = idMap.get(edge.source)
      const newTarget = idMap.get(edge.target)
      return {
        ...edge,
        id: `edge_${newSource}_${newTarget}`,
        source: newSource,
        target: newTarget,
      }
    })

  return {
    nodes: [...(currentGraph.nodes || []), ...remappedNodes],
    edges: [...(currentGraph.edges || []), ...remappedEdges],
  }
}
