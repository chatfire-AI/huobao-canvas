export const CANVAS_CURRENT_PROJECT_KEY = 'huobao_canvas_current_project_id'
// v2.0 独立前与 chatfire-gateway 平台共用的旧键，仅用于一次性迁移（旧键保留不动）
export const LEGACY_CANVAS_CURRENT_PROJECT_KEY = 'chatfire_canvas_current_project_id'
export const DEFAULT_CANVAS_PROJECT_ID = 'default'
export const DEFAULT_CANVAS_PROJECT_NAME = '默认画布'
export const MAX_CANVAS_PROJECTS = 50

export const createEmptyGraph = () => ({
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
})
