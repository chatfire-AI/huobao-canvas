export function computeGroupBounds(nodes, padding = 40) {
  const rects = nodes.map((node) => ({
    x: node.position.x,
    y: node.position.y,
    width: node.dimensions?.width || 240,
    height: node.dimensions?.height || 160,
  }))
  const left = Math.min(...rects.map((rect) => rect.x))
  const top = Math.min(...rects.map((rect) => rect.y))
  const right = Math.max(...rects.map((rect) => rect.x + rect.width))
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.height))
  return {
    x: left - padding,
    y: top - padding,
    width: right - left + padding * 2,
    height: bottom - top + padding * 2,
  }
}

export function computeLayeredLayout(nodes = [], edges = [], options = {}) {
  const gapX = options.gapX || 320
  const gapY = options.gapY || 240
  const stableNodes = nodes.filter((node) => !node.parentNode)
  const ids = new Set(stableNodes.map((node) => node.id))
  const indegree = new Map(stableNodes.map((node) => [node.id, 0]))
  const outgoing = new Map(stableNodes.map((node) => [node.id, []]))
  const level = new Map(stableNodes.map((node) => [node.id, 0]))

  for (const edge of edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target)) continue
    outgoing.get(edge.source).push(edge.target)
    indegree.set(edge.target, indegree.get(edge.target) + 1)
  }

  const queue = stableNodes
    .filter((node) => indegree.get(node.id) === 0)
    .map((node) => node.id)
  const ordered = []
  while (queue.length) {
    const id = queue.shift()
    ordered.push(id)
    for (const target of outgoing.get(id)) {
      level.set(target, Math.max(level.get(target), level.get(id) + 1))
      indegree.set(target, indegree.get(target) - 1)
      if (indegree.get(target) === 0) queue.push(target)
    }
  }

  const seen = new Set(ordered)
  const remaining = stableNodes.filter((node) => !seen.has(node.id)).map((node) => node.id)
  const lastLevel = Math.max(0, ...level.values())
  remaining.forEach((id) => level.set(id, lastLevel + 1))
  const buckets = new Map()
  for (const id of [...ordered, ...remaining]) {
    const column = level.get(id)
    if (!buckets.has(column)) buckets.set(column, [])
    buckets.get(column).push(id)
  }

  return Object.fromEntries([...buckets.entries()].flatMap(([column, nodeIds]) =>
    nodeIds.map((id, row) => [id, { x: column * gapX, y: row * gapY }]),
  ))
}
