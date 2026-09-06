import { i18n } from '@/locales'
import { CANVAS_NODE_TYPES, NODE_LIBRARY, getCanvasNodeTypeLabel } from '../constants/nodeTypes.js'

const NODE_TYPE_DESC_KEYS = {
  [CANVAS_NODE_TYPES.TEXT]: 'canvas.nodeTypes.textDesc',
  [CANVAS_NODE_TYPES.IMAGE]: 'canvas.nodeTypes.imageDesc',
  [CANVAS_NODE_TYPES.VIDEO]: 'canvas.nodeTypes.videoDesc',
  [CANVAS_NODE_TYPES.GROUP]: 'canvas.nodeTypes.groupDesc',
}

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
  const item = NODE_LIBRARY.find((entry) => entry.type === type)
  if (!item) {
    return {
      type,
      label: getCanvasNodeTypeLabel(type),
      icon: 'tabler:circle',
      description: '',
    }
  }
  return {
    ...item,
    label: getCanvasNodeTypeLabel(type),
    description: NODE_TYPE_DESC_KEYS[type] ? i18n.global.t(NODE_TYPE_DESC_KEYS[type]) : '',
  }
}
