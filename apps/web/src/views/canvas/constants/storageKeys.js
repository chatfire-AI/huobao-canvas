export const CANVAS_DB_NAME = 'chatfire-platform-canvas'
export const CANVAS_CURRENT_PROJECT_KEY = 'chatfire_canvas_current_project_id'
export const DEFAULT_CANVAS_PROJECT_ID = 'default'
export const DEFAULT_CANVAS_PROJECT_NAME = '默认画布'
export const MAX_CANVAS_PROJECTS = 50

export const createEmptyGraph = () => ({
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
})
