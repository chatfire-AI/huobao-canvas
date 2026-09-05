import { computed, reactive, ref } from 'vue'
import Dexie from 'dexie'
import {
  CANVAS_CURRENT_PROJECT_KEY,
  CANVAS_DB_NAME,
  DEFAULT_CANVAS_PROJECT_ID,
  DEFAULT_CANVAS_PROJECT_NAME,
  LEGACY_CANVAS_CURRENT_PROJECT_KEY,
  LEGACY_CANVAS_DB_NAME,
  MAX_CANVAS_PROJECTS,
  createEmptyGraph,
} from '../constants/storageKeys.js'

const defineCanvasSchema = (database) => {
  database.version(1).stores({
    canvas_projects: 'id, updatedAt',
    canvas_graphs: 'projectId, updatedAt',
    canvas_assets: 'id, projectId, nodeId, type, createdAt',
    canvas_runs: 'id, projectId, nodeId, model, status, createdAt',
  })

  database.version(2).stores({
    canvas_projects: 'id, updatedAt',
    canvas_graphs: 'projectId, updatedAt',
    canvas_assets: null,
    canvas_runs: null,
  })
}

const db = new Dexie(CANVAS_DB_NAME)
defineCanvasSchema(db)
const LEGACY_PENDING_GRAPH_DELETIONS_KEY = `${CANVAS_DB_NAME}:pending-graph-deletions`

// 一次性迁移：把旧库（与 chatfire-gateway 平台共用名）中的画布数据拷贝到新库。
// 仅当新库为空时执行；不删除旧库——同一源下 gateway 平台可能仍在使用它。
let legacyMigrationPromise = null
const migrateLegacyDatabase = () => {
  legacyMigrationPromise ||= (async () => {
    try {
      if (!(await Dexie.exists(LEGACY_CANVAS_DB_NAME))) return
      if ((await db.canvas_projects.count()) > 0) return
      const legacy = new Dexie(LEGACY_CANVAS_DB_NAME)
      defineCanvasSchema(legacy)
      const [projects, graphs] = await Promise.all([
        legacy.canvas_projects.toArray(),
        legacy.canvas_graphs.toArray(),
      ])
      legacy.close()
      if (!projects.length) return
      await db.transaction('rw', db.canvas_projects, db.canvas_graphs, async () => {
        await db.canvas_projects.bulkPut(projects)
        await db.canvas_graphs.bulkPut(graphs)
      })
    } catch (error) {
      console.warn('[canvas] 旧库数据迁移跳过：', error)
    }
  })()
  return legacyMigrationPromise
}

const nowIso = () => new Date().toISOString()
const RESULT_OWNERSHIP_KEYS = [
  'resultOwnerNodeId',
  'resultIndex',
  'resultBatchId',
  'batchId',
  'batchIndex',
]
const edgeKey = (edge = {}) => edge.id || [
  edge.source,
  edge.target,
  edge.sourceHandle || '',
  edge.targetHandle || '',
].join(':')
const samePosition = (left, right) => (
  Number(left?.x || 0) === Number(right?.x || 0) &&
  Number(left?.y || 0) === Number(right?.y || 0)
)

export function createCanvasSaveRegistry() {
  return {
    saveTimers: new Map(),
    saveStates: reactive(new Map()),
    storageErrors: reactive(new Map()),
  }
}

const defaultSaveRegistry = createCanvasSaveRegistry()

function createDefaultProject() {
  const timestamp = nowIso()
  return {
    id: DEFAULT_CANVAS_PROJECT_ID,
    name: DEFAULT_CANVAS_PROJECT_NAME,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

function createCanvasProject(name) {
  const timestamp = nowIso()
  return {
    id: `canvas_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: name || `画布 ${new Date().toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })}`,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

function getNextProjectName(projects) {
  const names = new Set(projects.map((item) => item.name))
  let index = projects.length + 1
  while (names.has(`画布 ${index}`)) {
    index += 1
  }
  return `画布 ${index}`
}

export function useCanvasStorage(options = {}) {
  const database = options.database || db
  const timers = options.timers || globalThis.window
  const storage = options.storage || globalThis.localStorage
  try {
    storage?.removeItem(LEGACY_PENDING_GRAPH_DELETIONS_KEY)
    // 旧 localStorage 键（与 gateway 平台共用）迁移到新键；旧键保留不动
    if (storage && !storage.getItem(CANVAS_CURRENT_PROJECT_KEY)) {
      const legacyProjectId = storage.getItem(LEGACY_CANVAS_CURRENT_PROJECT_KEY)
      if (legacyProjectId) storage.setItem(CANVAS_CURRENT_PROJECT_KEY, legacyProjectId)
    }
  } catch {}
  const registry = options.registry || (
    options.database || options.timers || options.storage
      ? createCanvasSaveRegistry()
      : defaultSaveRegistry
  )
  const activeProjectId = ref('')
  const { saveTimers, saveStates, storageErrors } = registry

  const getSaveState = (projectId) => saveStates.get(projectId) || 'idle'
  const getStorageError = (projectId) => storageErrors.get(projectId) || ''
  const unsavedProjectIds = computed(() => new Set(
    [...saveStates.entries()]
      .filter(([, state]) => state === 'saving' || state === 'error')
      .map(([projectId]) => projectId),
  ))
  const saveState = computed(() => getSaveState(activeProjectId.value))
  const storageError = computed(() => getStorageError(activeProjectId.value))

  const cancelSaveTimer = (projectId) => {
    const timer = saveTimers.get(projectId)
    if (timer !== undefined) timers?.clearTimeout(timer)
    saveTimers.delete(projectId)
  }

  const setActiveProject = (projectId) => {
    activeProjectId.value = projectId || ''
    if (projectId) storage?.setItem(CANVAS_CURRENT_PROJECT_KEY, projectId)
  }

  const recordPendingGraphDeletion = async (projectId, beforeGraph = {}, afterGraph = {}) => {
    if (!projectId) return false
    cancelSaveTimer(projectId)
    try {
      const graph = await database.canvas_graphs.get(projectId)
      if (!graph) return false
      const previous = graph.pendingDeletion?.version === 1
        ? graph.pendingDeletion
        : { nodeIds: [], edgeIds: [], nodePatches: [] }
      const beforeNodes = new Map((beforeGraph.nodes || []).map((node) => [node.id, node]))
      const afterNodes = new Map((afterGraph.nodes || []).map((node) => [node.id, node]))
      const nodeIds = new Set(previous.nodeIds || [])
      const edgeIds = new Set(previous.edgeIds || [])
      const nodePatches = new Map((previous.nodePatches || []).map((patch) => [patch.id, patch]))

      for (const [nodeId, beforeNode] of beforeNodes) {
        const afterNode = afterNodes.get(nodeId)
        if (!afterNode) {
          nodeIds.add(nodeId)
          nodePatches.delete(nodeId)
          continue
        }
        const patch = { ...(nodePatches.get(nodeId) || {}), id: nodeId }
        let changed = nodePatches.has(nodeId)
        if (beforeNode.parentNode !== afterNode.parentNode || beforeNode.extent !== afterNode.extent) {
          patch.parentNode = afterNode.parentNode ?? null
          patch.extent = afterNode.extent ?? null
          changed = true
        }
        if (!samePosition(beforeNode.position, afterNode.position)) {
          patch.position = afterNode.position
          changed = true
        }
        const beforePayload = beforeNode.data?.payload || {}
        const afterPayload = afterNode.data?.payload || {}
        if (
          RESULT_OWNERSHIP_KEYS.some((key) => beforePayload[key] !== undefined) &&
          RESULT_OWNERSHIP_KEYS.every((key) => afterPayload[key] === undefined)
        ) {
          patch.detachResultOwnership = true
          changed = true
        }
        if (changed) nodePatches.set(nodeId, patch)
      }

      const afterEdgeIds = new Set((afterGraph.edges || []).map(edgeKey))
      for (const edge of beforeGraph.edges || []) {
        const key = edgeKey(edge)
        if (!afterEdgeIds.has(key)) edgeIds.add(key)
      }
      const pendingDeletion = {
        version: 1,
        nodeIds: [...nodeIds],
        edgeIds: [...edgeIds],
        nodePatches: [...nodePatches.values()].filter((patch) => !nodeIds.has(patch.id)),
      }
      return Boolean(await database.canvas_graphs.update(projectId, { pendingDeletion }))
    } catch {
      return false
    }
  }

  const applyPendingGraphDeletion = (graph = {}) => {
    const intent = graph.pendingDeletion
    if (intent?.version !== 1) return graph
    const { pendingDeletion: _pendingDeletion, ...durableGraph } = graph
    const nodeIds = new Set(intent.nodeIds || [])
    const edgeIds = new Set(intent.edgeIds || [])
    const nodePatches = new Map((intent.nodePatches || []).map((patch) => [patch.id, patch]))
    const nodes = (durableGraph.nodes || [])
      .filter((node) => !nodeIds.has(node.id))
      .map((node) => {
        const patch = nodePatches.get(node.id)
        if (!patch) return node
        const next = { ...node }
        if ('parentNode' in patch) {
          if (patch.parentNode == null) delete next.parentNode
          else next.parentNode = patch.parentNode
        }
        if ('extent' in patch) {
          if (patch.extent == null) delete next.extent
          else next.extent = patch.extent
        }
        if (patch.position) next.position = patch.position
        if (patch.detachResultOwnership) {
          const payload = { ...(next.data?.payload || {}) }
          for (const key of RESULT_OWNERSHIP_KEYS) delete payload[key]
          next.data = { ...next.data, payload }
        }
        return next
      })
    return {
      ...durableGraph,
      nodes,
      edges: (durableGraph.edges || []).filter((edge) => (
        !nodeIds.has(edge.source) &&
        !nodeIds.has(edge.target) &&
        !edgeIds.has(edgeKey(edge))
      )),
    }
  }

  const ensureProject = async ({ activate = true } = {}) => {
    let projectId = storage?.getItem(CANVAS_CURRENT_PROJECT_KEY) || DEFAULT_CANVAS_PROJECT_ID
    let project = await database.canvas_projects.get(projectId)

    if (!project) {
      project = createDefaultProject()
      projectId = project.id
      await database.canvas_projects.put(project)
    }

    let graph = await database.canvas_graphs.get(projectId)
    if (!graph) {
      graph = {
        projectId,
        ...createEmptyGraph(),
        updatedAt: nowIso(),
      }
      await database.canvas_graphs.put(graph)
    }

    if (activate) setActiveProject(projectId)
    return { project, graph }
  }

  const listProjects = async () => {
    if (database === db) await migrateLegacyDatabase()
    const projects = await database.canvas_projects.orderBy('updatedAt').reverse().toArray()
    if (projects.length) {
      const graphs = await database.canvas_graphs.bulkGet(projects.map((project) => project.id))
      return projects.map((project, index) => ({
        ...project,
        nodeCount: graphs[index]?.nodes?.length || 0,
      }))
    }

    const project = createDefaultProject()
    await database.canvas_projects.put(project)
    await database.canvas_graphs.put({
      projectId: project.id,
      ...createEmptyGraph(),
      updatedAt: nowIso(),
    })
    setActiveProject(project.id)
    return [{ ...project, nodeCount: 0 }]
  }

  const loadProject = async (projectId, { activate = true } = {}) => {
    const project = await database.canvas_projects.get(projectId)
    if (!project) return ensureProject({ activate })

    let graph = await database.canvas_graphs.get(projectId)
    if (!graph) {
      graph = {
        projectId,
        ...createEmptyGraph(),
        updatedAt: nowIso(),
      }
      await database.canvas_graphs.put(graph)
    }

    if (activate) setActiveProject(projectId)
    return { project, graph }
  }

  const createProject = async (name, { activate = true } = {}) => {
    const projects = await listProjects()
    if (projects.length >= MAX_CANVAS_PROJECTS) {
      throw new Error(`当前浏览器最多创建 ${MAX_CANVAS_PROJECTS} 个画布`)
    }

    const project = createCanvasProject(name || getNextProjectName(projects))
    const graph = {
      projectId: project.id,
      ...createEmptyGraph(),
      updatedAt: project.updatedAt,
    }
    await database.transaction('rw', database.canvas_projects, database.canvas_graphs, async () => {
      await database.canvas_projects.put(project)
      await database.canvas_graphs.put(graph)
    })
    if (activate) setActiveProject(project.id)
    return { project, graph }
  }

  const deleteProject = async (projectId, { activate = true } = {}) => {
    cancelSaveTimer(projectId)
    let nextProject

    await database.transaction('rw', database.canvas_projects, database.canvas_graphs, async () => {
      await database.canvas_projects.delete(projectId)
      await database.canvas_graphs.delete(projectId)

      let project = await database.canvas_projects.orderBy('updatedAt').reverse().first()
      if (!project) {
        project = createDefaultProject()
        await database.canvas_projects.put(project)
      }

      let graph = await database.canvas_graphs.get(project.id)
      if (!graph) {
        graph = {
          projectId: project.id,
          ...createEmptyGraph(),
          updatedAt: nowIso(),
        }
        await database.canvas_graphs.put(graph)
      }
      nextProject = { project, graph }
    })

    saveStates.delete(projectId)
    storageErrors.delete(projectId)
    if (activate) setActiveProject(nextProject.project.id)
    return nextProject
  }

  const renameProject = async (projectId, name) => {
    const trimmed = String(name || '').trim()
    if (!trimmed) throw new Error('画布名称不能为空')
    const project = await database.canvas_projects.get(projectId)
    if (!project) throw new Error('画布不存在')
    project.name = trimmed
    project.updatedAt = nowIso()
    await database.canvas_projects.put(project)
    return project
  }

  const saveGraph = async (projectId, graph) => {
    if (!projectId) return
    cancelSaveTimer(projectId)
    saveStates.set(projectId, 'saving')
    try {
      const updatedAt = nowIso()
      await database.transaction('rw', database.canvas_projects, database.canvas_graphs, async () => {
        await database.canvas_graphs.put({
          projectId,
          nodes: graph.nodes || [],
          edges: graph.edges || [],
          viewport: graph.viewport || createEmptyGraph().viewport,
          updatedAt,
        })
        await database.canvas_projects.update(projectId, { updatedAt })
      })
      storageErrors.delete(projectId)
      saveStates.set(projectId, 'saved')
    } catch (error) {
      storageErrors.set(projectId, error?.message || '画布保存失败')
      saveStates.set(projectId, 'error')
      throw error
    }
  }

  const scheduleSaveGraph = (projectId, graph, delay = 450) => {
    if (!projectId) return
    cancelSaveTimer(projectId)
    saveStates.set(projectId, 'saving')
    const timer = timers?.setTimeout(() => {
      saveTimers.delete(projectId)
      saveGraph(projectId, graph).catch(() => {})
    }, delay)
    saveTimers.set(projectId, timer)
  }

  const clearGraph = async (projectId) => {
    const graph = {
      projectId,
      ...createEmptyGraph(),
      updatedAt: nowIso(),
    }
    await database.canvas_graphs.put(graph)
    return graph
  }

  return {
    db: database,
    saveState,
    storageError,
    saveStates,
    storageErrors,
    unsavedProjectIds,
    getSaveState,
    getStorageError,
    setActiveProject,
    recordPendingGraphDeletion,
    applyPendingGraphDeletion,
    ensureProject,
    listProjects,
    loadProject,
    createProject,
    deleteProject,
    renameProject,
    saveGraph,
    scheduleSaveGraph,
    clearGraph,
  }
}
