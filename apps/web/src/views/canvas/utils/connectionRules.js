import { CANVAS_NODE_TYPES, NODE_LIBRARY } from '../constants/nodeTypes.js'

export const CONNECTION_RULES = {
  [CANVAS_NODE_TYPES.TEXT]: [
    CANVAS_NODE_TYPES.TEXT,
    CANVAS_NODE_TYPES.IMAGE,
    CANVAS_NODE_TYPES.VIDEO,
  ],
  [CANVAS_NODE_TYPES.IMAGE]: [CANVAS_NODE_TYPES.IMAGE, CANVAS_NODE_TYPES.VIDEO],
  [CANVAS_NODE_TYPES.VIDEO]: [CANVAS_NODE_TYPES.VIDEO],
}

export const isConnectionAllowed = (sourceType, targetType) => {
  if (!sourceType || !targetType) return false
  return (CONNECTION_RULES[sourceType] || []).includes(targetType)
}

export const getCanvasQuickAddAnchorPoint = (handleRect, side = 'right') => ({
  x: side === 'left' ? handleRect.left : handleRect.right,
  y: handleRect.top + handleRect.height / 2,
})

export const getConnectableNodeTypes = (sourceType, side = 'right') => {
  if (!sourceType) return Object.keys(CONNECTION_RULES)

  if (side === 'right') {
    return [...(CONNECTION_RULES[sourceType] || [])]
  }

  return Object.keys(CONNECTION_RULES).filter((producerType) =>
    (CONNECTION_RULES[producerType] || []).includes(sourceType),
  )
}

export const getCanvasNodeMeta = (type) => {
  return NODE_LIBRARY.find((item) => item.type === type) || {
    type,
    label: '节点',
    icon: 'tabler:circle',
    description: '',
  }
}
