<template>
  <div class="ai-canvas-page">
    <section class="canvas-workspace">
      <CanvasToolbar
        :project-id="projectId"
        :project-name="project?.name || '默认画布'"
        :project-options="projectOptions"
        :api-key-options="apiKeyOptions"
        :selected-api-key="selectedApiKeyValue"
        :api-key-loading="apiKeyLoading"
        :show-api-key-control="isGatewayMode"
        :save-state="saveState"
        :storage-error="storageError"
        :controls-locked="taskPersistenceLocked"
        @select-project="handleProjectSelect"
        @create-project="handleCreateProject"
        @select-api-key="handleApiKeySelect"
        @manage-api-keys="showApiKeyManager = true"
        @open-settings="router.push('/settings')"
        @auto-layout="handleAutoLayout"
        @fit-canvas="fitCanvas"
        @rename-project="handleRenameProject"
      />

      <ApiKeyManager
        v-model:show="showApiKeyManager"
        :keys="storedApiKeys"
        @save="handleApiKeySave"
        @delete="handleApiKeyDelete"
      />

      <div v-if="!nodes.length" class="empty-canvas-hint">
        <span class="empty-hint-icon"><SvgIcon icon="tabler:layout-dashboard" width="22" height="22" /></span>
        <strong>双击添加节点</strong>
        <span>在画布空白处双击，选择文本、图片、视频或分组节点。</span>
        <span class="empty-hint-keys">
          <span class="hint-key"><kbd>滚轮</kbd>平移</span>
          <span class="hint-key"><kbd>Ctrl/⌘</kbd>+<kbd>滚轮</kbd>缩放</span>
          <span class="hint-key"><kbd>空格</kbd>+<kbd>拖拽</kbd>平移</span>
        </span>
      </div>

      <VueFlow
        v-model:nodes="nodes"
        v-model:edges="edges"
        class="canvas-flow"
        :node-types="nodeComponents"
        :edge-types="edgeTypes"
        :default-edge-options="defaultEdgeOptions"
        :is-valid-connection="isValidConnection"
        only-render-visible-elements
        connection-mode="loose"
        :connection-radius="72"
        :selection-key-code="true"
        selection-mode="partial"
        pan-activation-key-code="Space"
        :pan-on-drag="[1, 2]"
        :pan-on-scroll="true"
        :zoom-on-scroll="false"
        :zoom-on-pinch="true"
        :zoom-on-double-click="false"
        :zoom-activation-key-code="['Control', 'Meta']"
        :pan-on-scroll-mode="'free'"
        :min-zoom="0.2"
        :max-zoom="2"
        fit-view-on-init
        @connect="onConnect"
        @connect-start="handleConnectStart"
        @connect-end="handleConnectEnd"
        @node-click="handleNodeClick"
        @edge-click="handleEdgeClick"
        @selection-change="handleSelectionChange"
        @pane-click="handlePaneClick"
        @node-drag="handleNodeDrag"
        @node-drag-stop="handleNodeDragStop"
        @move="handleMove"
        @move-end="handleMoveEnd"
        @contextmenu.prevent
        @dblclick.capture="handlePaneDoubleClick"
      >
        <Background :pattern-color="backgroundPatternColor" :gap="18" />
        <CanvasZoomControls />
        <MiniMap pannable zoomable :node-color="minimapNodeColor" :mask-color="minimapMaskColor" />
      </VueFlow>

      <CanvasMediaPreview
        :url="mediaPreview.url"
        :type="mediaPreview.type"
        @close="mediaPreview.url = ''"
      />

      <ConnectionDropMenu
        v-if="connectionMenu"
        :screen-x="connectionMenu.screenX"
        :screen-y="connectionMenu.screenY"
        :source-type="connectionMenu.sourceType"
        :side="connectionMenu.side"
        @select="handleConnectionMenuSelect"
        @close="connectionMenu = null"
      />

      <SelectionToolbar
        :nodes="selectionToolbarNodes"
        :drag-tick="dragTick"
        @duplicate="handleDuplicateSelected"
        @group="handleGroupSelected"
        @ungroup="handleUngroupSelected"
        @layout-horizontal="handleGroupLayout('horizontal')"
        @layout-vertical="handleGroupLayout('vertical')"
        @delete="requestDeleteSelection"
      />

      <CanvasNodeToolbar
        v-if="selectedNode && selectionToolbarNodes.length === 1 && selectedNode.type !== CANVAS_NODE_TYPES.GROUP"
        :node="selectedNode"
        :style="nodeToolbarStyle"
        :running="running"
        @delete="requestDeleteSelection"
      />

      <CanvasPromptDock
        v-if="selectedNode && selectedNode.type !== CANVAS_NODE_TYPES.GROUP"
        :style="promptDockStyle"
        :node="selectedNode"
        :connected-inputs="connectedInputs"
        :mentionable-nodes="mentionableNodes"
        :model-options="modelOptions"
        :selected-model="selectedNode?.data?.payload?.modelName || ''"
        :selected-api-key="selectedApiKeyValue"
        :schema-fields="schemaFields"
        :form-data="formData"
        :format-options="formatOptions"
        :running="running"
        :polling-task-id="pollingTaskId"
        @select-model="handleModelNameUpdate"
        @update-prompt="handlePromptUpdate"
        @update-form-data="handleFormDataUpdate"
        @asset-upload="handleAssetUpload"
        @mention-node="handleMentionNode"
        @submit="handlePromptDockSubmit"
      />
    </section>

    <!-- 新建画布：名称输入（卡片式） -->
    <n-modal
      v-model:show="createDialogVisible"
      preset="card"
      title="新建画布"
      class="create-canvas-modal"
      :z-index="3100"
    >
      <div class="create-canvas-body">
        <label class="create-canvas-label" for="create-canvas-name">画布名称</label>
        <n-input
          id="create-canvas-name"
          v-model:value="createName"
          placeholder="输入画布名称"
          maxlength="50"
          show-count
          autofocus
          @keyup.enter="confirmCreateProject"
        />
      </div>
      <template #footer>
        <div class="create-canvas-footer">
          <n-button quaternary @click="createDialogVisible = false">取消</n-button>
          <n-button type="primary" @click="confirmCreateProject">创建</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { computed, markRaw, nextTick, onBeforeUnmount, onMounted, provide, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import CanvasZoomControls from './components/CanvasZoomControls.vue'
import CanvasMediaPreview from './components/CanvasMediaPreview.vue'
import { pollServerRun } from '@/api/canvasServer.js'
import { MiniMap } from '@vue-flow/minimap'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

import CanvasToolbar from './components/CanvasToolbar.vue'
import CanvasPromptDock from './components/CanvasPromptDock.vue'
import CanvasNodeToolbar from './components/CanvasNodeToolbar.vue'
import ConnectionDropMenu from './components/ConnectionDropMenu.vue'
import SelectionToolbar from './components/SelectionToolbar.vue'
import CanvasEdge from './components/edges/CanvasEdge.vue'
import TextNode from './components/nodes/TextNode.vue'
import ImageNode from './components/nodes/ImageNode.vue'
import VideoNode from './components/nodes/VideoNode.vue'
import GroupNode from './components/nodes/GroupNode.vue'
import {
  CANVAS_NODE_TYPES,
  NODE_MODEL_TYPE_MAP,
  NODE_STATUS,
} from './constants/nodeTypes'
import { getCanvasQuickAddAnchorPoint, isConnectionAllowed } from './utils/connectionRules'
import { repairCanvasGraphForLoad } from './utils/graphSerialization'
import {
  areCanvasModelEndpointsUnavailable,
  isCanvasSubmitEndpointMounted,
  isStreamEndpoint,
  resolveEndpointPath,
} from '@/views/playground/utils/endpointPath'
import { useCanvasGraph } from './composables/useCanvasGraph'
import { useCanvasStorage } from './composables/useCanvasStorage'
import { useCanvasModelNode } from './composables/useCanvasModelNode'
import { usePlaygroundApiKey } from '@/views/playground/composables/usePlaygroundApiKey'
import { usePlaygroundModel } from '@/views/playground/composables/usePlaygroundModel'
import { usePlaygroundSchema } from '@/views/playground/composables/usePlaygroundSchema'
import { listApiKeys } from '@/utils/apiKeySession'
import { getCatalogMode } from '@/config'
import ApiKeyManager from '@/components/ApiKeyManager.vue'
import { useTheme } from '@/composables/useTheme'

const route = useRoute()
const router = useRouter()
const nodeComponents = {
  [CANVAS_NODE_TYPES.TEXT]: markRaw(TextNode),
  [CANVAS_NODE_TYPES.IMAGE]: markRaw(ImageNode),
  [CANVAS_NODE_TYPES.VIDEO]: markRaw(VideoNode),
  [CANVAS_NODE_TYPES.GROUP]: markRaw(GroupNode),
}
const edgeTypes = {
  canvas: markRaw(CanvasEdge),
}
// 主题相关的画布颜色（Background 圆点）直接读取 --cf-* 令牌，
// 随亮/暗主题切换实时更新；连线采用无箭头能量段样式（见 CanvasEdge）
const { isDark } = useTheme()
const backgroundPatternColor = ref('#d6dae1')

// MiniMap 节点按类型着色（与节点卡片的 --node-accent 一致）
const CANVAS_NODE_ACCENTS = {
  [CANVAS_NODE_TYPES.TEXT]: 'rgba(255,255,255,0.35)',
  [CANVAS_NODE_TYPES.IMAGE]: 'rgba(255,255,255,0.45)',
  [CANVAS_NODE_TYPES.VIDEO]: '#f97316',
  [CANVAS_NODE_TYPES.GROUP]: 'rgba(255,255,255,0.2)',
}
const minimapNodeColor = (node) => CANVAS_NODE_ACCENTS[node?.type] || 'var(--cf-text-tertiary)'
const minimapMaskColor = 'transparent'

function syncCanvasThemeColors() {
  const rootStyles = getComputedStyle(document.documentElement)
  backgroundPatternColor.value = rootStyles.getPropertyValue('--cf-border-strong').trim() || '#d6dae1'
}

watch(isDark, syncCanvasThemeColors, { immediate: true })

const defaultEdgeOptions = {
  type: 'canvas',
}
const CANVAS_NODE_WIDTH = 260
const CONNECTED_NODE_GAP = 96

const project = ref(null)
const projects = ref([])
const isSwitchingProject = ref(false)
const projectId = computed(() => project.value?.id || '')
const projectOptions = computed(() => projects.value.map((item) => ({
  label: `${item.name || '未命名画布'}${unsavedProjectIds.value.has(item.id) ? ' · 未保存' : ''}`,
  value: item.id,
  updatedAt: item.updatedAt,
  isActive: item.id === projectId.value,
  nodeCount: item.id === projectId.value ? nodes.value.length : (item.nodeCount || 0),
})))
const startingNodeIds = ref(new Set())
const pendingTaskPersistence = ref(new Set())
const taskControllers = new Map()
const taskPersistenceLocked = computed(() => startingNodeIds.value.size > 0 ||
  pendingTaskPersistence.value.size > 0)
const running = computed(() => {
  const nodeId = selectedNode.value?.id
  if (!nodeId) return false
  return startingNodeIds.value.has(nodeId) ||
    pendingTaskPersistence.value.has(nodeId) ||
    selectedNode.value?.data?.status === NODE_STATUS.WAITING
})
const pollingTaskId = computed(() => selectedNode.value?.data?.payload?.task?.taskId || '')
const formDataOwnerNodeId = ref('')
const promptDockStyle = ref({ left: '-9999px', top: '-9999px' })
const nodeToolbarStyle = ref({ left: '-9999px', top: '-9999px' })
const connectionMenu = ref(null)
const pendingConnection = ref(null)
const dragTick = ref(0)
const isDragging = ref(false)
const { screenToFlowCoordinate } = useVueFlow()
let removeFallbackConnectionListeners = null
let promptDockPositionFrame = 0
let promptDockResizeObserver = null
let schemaRequestToken = 0
let pageEpoch = 0
let projectRequestToken = 0

const {
  nodes,
  edges,
  selectedNodeId,
  selectedEdgeId,
  selectedNode,
  selectedNodes,
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
  deleteSelectedGraphItems,
  groupSelectedNodes,
  ungroupNode,
  layoutGroup,
  applyAutoLayout,
  duplicateSelected,
  copySelected,
  pasteCopied,
  isValidConnection,
  onConnect,
  appendEdge,
  addConnectedNode,
  getIncomingNodes,
  materializeCanvasResults,
  fitCanvas,
  fitSelected,
} = useCanvasGraph()

const {
  getSaveState,
  getStorageError,
  unsavedProjectIds,
  setActiveProject,
  recordPendingGraphDeletion,
  applyPendingGraphDeletion,
  ensureProject,
  listProjects,
  loadProject,
  createProject,
  renameProject,
  saveGraph,
  scheduleSaveGraph,
} = useCanvasStorage()
const saveState = computed(() => getSaveState(projectId.value))
const storageError = computed(() => getStorageError(projectId.value))

const selectionToolbarNodes = computed(() => {
  const selected = [...selectedNodes.value]
  if (selectedNode.value && !selected.some((node) => node.id === selectedNode.value.id)) {
    selected.push(selectedNode.value)
  }
  return selected
})

const connectedInputs = computed(() => {
  if (!selectedNode.value) return []
  return getIncomingNodes(selectedNode.value.id).map(({ node }) => {
    const payload = node.data?.payload || {}
    const first = payload.parsedResults?.[0]
    // 仅图片/视频节点的结果可作缩略图 URL；文本节点的 parsedResults 是文本，
    // 放进 <img src> 会变成裂图（文本内容走 text 字段展示）
    const isMediaNode = node.type === CANVAS_NODE_TYPES.IMAGE || node.type === CANVAS_NODE_TYPES.VIDEO
    const url = isMediaNode
      ? ((typeof first === 'string'
        ? first
        : first?.url || (first?.b64_json ? `data:image/png;base64,${first.b64_json}` : '')) || payload.url || '')
      : ''
    const text = (!isMediaNode && typeof first === 'string' ? first : '') || payload.prompt || ''
    return {
      id: node.id,
      type: node.type,
      label: node.data?.title || '上游节点',
      url,
      text,
    }
  })
})

// @ 引用候选：可按连线规则作为当前节点上游、且尚未连接的节点
const mentionableNodes = computed(() => {
  const target = selectedNode.value
  if (!target || target.type === CANVAS_NODE_TYPES.GROUP) return []
  const incoming = new Set(connectedInputs.value.map((item) => item.id))
  return nodes.value
    .filter((node) => node.id !== target.id)
    .filter((node) => isConnectionAllowed(node.type, target.type))
    .filter((node) => !incoming.has(node.id))
    .map((node) => {
      const payload = node.data?.payload || {}
      const first = payload.parsedResults?.[0]
      // 缩略图仅对图片/视频节点取结果 URL；文本节点的 parsedResults 是文本，不能当图
      const isMediaNode = node.type === CANVAS_NODE_TYPES.IMAGE || node.type === CANVAS_NODE_TYPES.VIDEO
      const thumb = isMediaNode
        ? (typeof first === 'string'
          ? first
          : first?.url || (first?.b64_json ? `data:image/png;base64,${first.b64_json}` : '') || payload.url || '')
        : ''
      return {
        id: node.id,
        type: node.type,
        label: node.data?.title || '节点',
        thumb,
        snippet: String(payload.prompt || payload.text || payload.modelName || '').slice(0, 24),
      }
    })
})

function handleMentionNode(sourceId) {
  const target = selectedNode.value
  if (!target || running.value || !sourceId) return
  onConnect({ source: sourceId, target: target.id, sourceHandle: 'right', targetHandle: 'left' })
}

const {
  apiKeyOptions,
  selectedApiKeyValue,
  apiKeyLoading,
  loadApiKeys,
  selectApiKey,
  saveApiKey,
  deleteApiKey,
  getApiKey,
  getApiBaseUrl,
} = usePlaygroundApiKey(route, router)

// ── API Key 管理弹窗（BYOK：Key 仅存浏览器本地） ──
// 官方直连模式下 Key 按厂商在设置页管理，此弹窗仅网关模式使用
const isGatewayMode = getCatalogMode() === 'gateway'
const showApiKeyManager = ref(false)
const storedApiKeys = ref(listApiKeys())

function handleApiKeySave({ key, name }) {
  saveApiKey(key, name)
  storedApiKeys.value = listApiKeys()
}

function handleApiKeyDelete(key) {
  deleteApiKey(key)
  storedApiKeys.value = listApiKeys()
}

const {
  allCategory,
  loadSingleModel,
  loadCategoryData,
} = usePlaygroundModel()

const {
  modelData,
  schemaFields,
  inputTransformSchema,
  requestTypeSchema,
  asyncModeSchema,
  outputSchema,
  inputBindingsSchema,
  videoModesSchema,
  formData,
  selectedEndpointIndex,
  parsedEndpoints,
  selectedEndpoint,
  applyEndpointSchema,
  applyInputTransform,
  getNestedValue,
  formatOptions,
  setupModel,
} = usePlaygroundSchema()

const {
  resumeModelTask,
  runCanvasModelNode,
} = useCanvasModelNode({
  getIncomingNodes,
  updateNodePayload,
  materializeCanvasResults,
  detachResultOwnership,
  getNestedValue,
})

provide('canvasQuickAdd', handleNodeQuickAdd)
// 双击媒体节点放大预览(图片/视频),节点内通过 inject('canvasPreview') 触发
const mediaPreview = reactive({ url: '', type: 'image' })
provide('canvasPreview', ({ url, type }) => {
  if (!url) return
  mediaPreview.url = url
  mediaPreview.type = type || 'image'
})
provide('canvasUpdateNodePayload', (nodeId, patch) => {
  updateNodePayload(nodeId, patch, { userMutation: true })
})

// 节点拖拽时连接的边显示渐变流光（参考 drama-studio GlowEdge）
const pulsingEdgeIds = ref(new Set())
provide('canvasPulsingEdges', pulsingEdgeIds)
let pulseTimer = 0
const EDGE_GLOW_DURATION_MS = 9_000

function setEdgeGlow(nodeIds) {
  const ids = new Set(
    edges.value
      .filter((e) => nodeIds.includes(e.source) || nodeIds.includes(e.target))
      .map((e) => e.id),
  )
  pulsingEdgeIds.value = ids
  if (pulseTimer) { clearTimeout(pulseTimer); pulseTimer = 0 }
}

function scheduleEdgeGlowClear() {
  if (pulseTimer) clearTimeout(pulseTimer)
  pulseTimer = setTimeout(() => {
    pulsingEdgeIds.value = new Set()
    pulseTimer = 0
  }, EDGE_GLOW_DURATION_MS)
}

// ── 模型选择持久化:按节点类型(1=对话/2=图片/3=视频)记住上次选用的模型,
// 新建节点默认恢复;存的模型已下架或未开放时回退到第一个可用模型 ──
const PICKED_MODELS_KEY = 'chatfire.canvas.pickedModels'

const readPickedModels = () => {
  try {
    const raw = localStorage.getItem(PICKED_MODELS_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function rememberPickedModel(typeCode, modelName) {
  if (!typeCode || !modelName) return
  try {
    localStorage.setItem(PICKED_MODELS_KEY, JSON.stringify({ ...readPickedModels(), [typeCode]: modelName }))
  } catch {}
}

const modelOptions = computed(() => {
  const typeCode = NODE_MODEL_TYPE_MAP[selectedNode.value?.type]
  if (!typeCode) return []
  const groups = allCategory.value
    .filter((category) => String(category.type) === String(typeCode))
    .flatMap((category) => category.factories || [])
  return groups.flatMap((group) => (group.models || [])
    .map((model) => {
    const unavailable = areCanvasModelEndpointsUnavailable(model)
    return {
      label: `${model.fullName || model.name} · ${model.factory || group.factory || group.name || '模型'}${unavailable ? ' · 提交入口未开放' : ''}`,
      value: model.name,
      disabled: unavailable,
      modelName: model.fullName || model.name,
      factory: model.factory || group.factory || group.name || '模型',
      icon: model.icon || '',
    }
  }))
})

const endpointOptions = computed(() => parsedEndpoints.value.map((endpoint, index) => {
  const resolvedPath = resolveEndpointPath(
    endpoint.path || '/v1/chat/completions',
    modelData.value?.name,
    modelData.value?.providerCode || modelData.value?.factory,
  )
  const streaming = isStreamEndpoint(endpoint)
  const disabled = streaming || !isCanvasSubmitEndpointMounted(resolvedPath)
  const suffix = streaming ? ' · 流式端点暂不支持' : (disabled ? ' · 提交入口未开放' : '')
  return {
    label: `${endpoint.canvasModeLabel || endpoint.canvasMode || `POST ${endpoint.path}`}${suffix}`,
    value: index,
    disabled,
  }
}))

function isCurrentPageEpoch(epoch) {
  return epoch === pageEpoch
}

function beginProjectRequest() {
  return {
    token: ++projectRequestToken,
    epoch: pageEpoch,
  }
}

function isCurrentProjectRequest(request) {
  return isCurrentPageEpoch(request?.epoch) && request?.token === projectRequestToken
}

function beginSchemaRequest(nodeId) {
  schemaRequestToken += 1
  return {
    nodeId: nodeId || '',
    token: schemaRequestToken,
  }
}

function isCurrentSchemaRequest(request) {
  return request.token === schemaRequestToken &&
    request.nodeId === (selectedNode.value?.id || '')
}

function setTaskSetValue(target, nodeId, enabled) {
  const next = new Set(target.value)
  if (enabled) next.add(nodeId)
  else next.delete(nodeId)
  target.value = next
}

function abortNodeTask(nodeId) {
  const work = taskControllers.get(nodeId)
  if (work) {
    if (work.persistenceTimer) window.clearTimeout(work.persistenceTimer)
    work.controller.abort(new DOMException('Aborted', 'AbortError'))
    taskControllers.delete(nodeId)
  }
  setTaskSetValue(startingNodeIds, nodeId, false)
  setTaskSetValue(pendingTaskPersistence, nodeId, false)
}

function abortProjectTasks(targetProjectId) {
  for (const [nodeId, work] of taskControllers.entries()) {
    if (work.projectId === targetProjectId) abortNodeTask(nodeId)
  }
}

function beginTaskWork(nodeId, targetProjectId) {
  abortNodeTask(nodeId)
  const work = {
    nodeId,
    projectId: targetProjectId,
    taskId: '',
    controller: new AbortController(),
    persistenceTimer: 0,
  }
  taskControllers.set(nodeId, work)
  return work
}

function isCurrentTaskController(work) {
  if (!work || taskControllers.get(work.nodeId) !== work) return false
  if (work.projectId !== projectId.value || work.controller.signal.aborted) return false
  return Boolean(getNodeById(work.nodeId))
}

function isCurrentTaskWork(work) {
  if (!isCurrentTaskController(work)) return false
  const node = getNodeById(work.nodeId)
  if (work.taskId && node.data?.payload?.task?.taskId !== work.taskId) return false
  return true
}

function waitForTaskPersistenceRetry(work) {
  return new Promise((resolve, reject) => {
    const signal = work.controller.signal
    if (signal.aborted) {
      reject(signal.reason)
      return
    }
    const onAbort = () => {
      window.clearTimeout(work.persistenceTimer)
      work.persistenceTimer = 0
      reject(signal.reason)
    }
    signal.addEventListener('abort', onAbort, { once: true })
    work.persistenceTimer = window.setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      work.persistenceTimer = 0
      resolve()
    }, 1200)
  })
}

async function persistTaskGraph(work, isCurrent) {
  setTaskSetValue(startingNodeIds, work.nodeId, false)
  setTaskSetValue(pendingTaskPersistence, work.nodeId, true)
  while (isCurrent(work)) {
    try {
      await saveGraph(work.projectId, toGraph())
      if (!isCurrent(work)) throw new DOMException('Aborted', 'AbortError')
      setTaskSetValue(pendingTaskPersistence, work.nodeId, false)
      return
    } catch (error) {
      if (!isCurrent(work)) throw error
      await waitForTaskPersistenceRetry(work)
    }
  }
  throw new DOMException('Aborted', 'AbortError')
}

async function persistSubmittedTask(work, taskLink) {
  if (!isCurrentTaskWork(work)) throw new DOMException('Aborted', 'AbortError')
  work.taskId = taskLink.taskId
  updateNodeStatus(work.nodeId, NODE_STATUS.WAITING, {
    task: taskLink,
    error: '',
    notice: '任务已提交，等待结果',
  })
  await persistTaskGraph(work, isCurrentTaskWork)
}

async function persistCompletedTask(work) {
  await persistTaskGraph(work, isCurrentTaskController)
}

function finishTaskWork(work) {
  if (taskControllers.get(work.nodeId) !== work) return
  taskControllers.delete(work.nodeId)
  setTaskSetValue(startingNodeIds, work.nodeId, false)
  setTaskSetValue(pendingTaskPersistence, work.nodeId, false)
}

async function resumeNodeTask(nodeId, existingWork = null) {
  const node = getNodeById(nodeId)
  const taskLink = node?.data?.payload?.task
  if (!taskLink?.taskId && !taskLink?.runId) return
  if (!existingWork && taskControllers.has(nodeId)) return

  const work = existingWork || beginTaskWork(nodeId, projectId.value)
  work.taskId = taskLink.taskId || taskLink.runId

  // 服务端运行恢复：runId 轮询（Key 在服务端，无需本地 Key；刷新/换浏览器均可续）
  if (taskLink.runId) {
    try {
      const runResult = await pollServerRun(taskLink.runId, { signal: work.controller.signal })
      if (!isCurrentTaskWork(work)) return
      if (runResult.status === 'cancelled') return
      if (runResult.status === 'failed') {
        throw Object.assign(new Error(runResult.error || '服务端运行失败'), { kind: 'terminal' })
      }
      materializeCanvasResults(nodeId, {
        result: runResult.result,
        parsedResults: runResult.parsedResults || [],
        unavailableReason: runResult.unavailableReason || '',
      })
      await persistCompletedTask(work)
      if (isCurrentTaskController(work)) window.$message?.success('模型运行完成')
    } catch (error) {
      if (error?.name === 'AbortError' || !isCurrentTaskWork(work)) return
      const currentNode = getNodeById(nodeId)
      const hasPreviousResult = Boolean(
        currentNode?.data?.payload?.url || currentNode?.data?.payload?.parsedResults?.length,
      )
      updateNodeStatus(nodeId, NODE_STATUS.ERROR, {
        task: undefined,
        error: error?.message || '任务处理失败',
        notice: hasPreviousResult ? '本次失败，当前显示上次成功结果' : '',
      })
      await saveGraph(work.projectId, toGraph()).catch(() => {})
    } finally {
      finishTaskWork(work)
    }
    return
  }

  if (!getApiKey()) {
    updateNodeStatus(nodeId, NODE_STATUS.WAITING, {
      task: taskLink,
      notice: '选择有效 API Key 后继续查询',
    })
    finishTaskWork(work)
    return
  }

  try {
    const result = await resumeModelTask({
      taskLink,
      apiKey: getApiKey(),
      apiBaseUrl: getApiBaseUrl(),
      signal: work.controller.signal,
    })
    if (!isCurrentTaskWork(work)) return
    materializeCanvasResults(nodeId, result)
    await persistCompletedTask(work)
    if (isCurrentTaskController(work)) window.$message?.success('模型运行完成')
  } catch (error) {
    if (error?.name === 'AbortError' || !isCurrentTaskWork(work)) return
    const currentNode = getNodeById(nodeId)
    const hasPreviousResult = Boolean(
      currentNode?.data?.payload?.url || currentNode?.data?.payload?.parsedResults?.length,
    )
    if (error?.kind === 'auth-waiting' || error?.kind === 'retryable-waiting') {
      updateNodeStatus(nodeId, NODE_STATUS.WAITING, {
        task: taskLink,
        error: error?.message || '任务查询暂时失败',
        notice: hasPreviousResult ? '等待继续，当前显示上次成功结果' : '任务等待继续',
      })
    } else {
      updateNodeStatus(nodeId, NODE_STATUS.ERROR, {
        task: undefined,
        error: error?.message || '任务处理失败',
        notice: hasPreviousResult ? '本次失败，当前显示上次成功结果' : '',
      })
    }
    await saveGraph(work.projectId, toGraph()).catch(() => {})
  } finally {
    finishTaskWork(work)
  }
}

function recoverWaitingTasks() {
  for (const node of nodes.value) {
    const task = node.data?.payload?.task
    if (node.data?.status === NODE_STATUS.WAITING && (task?.taskId || task?.runId)) {
      void resumeNodeTask(node.id)
    }
  }
}

onMounted(async () => {
  const epoch = ++pageEpoch
  window.addEventListener('keydown', handleCanvasKeydown)
  window.addEventListener('resize', requestPromptDockPositionUpdate)
  document.addEventListener('visibilitychange', handleVisibilitySave)
  attachFallbackConnectionListeners()
  const workspace = document.querySelector('.canvas-workspace')
  if (workspace && window.ResizeObserver) {
    promptDockResizeObserver = new window.ResizeObserver(requestPromptDockPositionUpdate)
    promptDockResizeObserver.observe(workspace)
  }

  try {
    const loaded = await ensureProject({ activate: false })
    if (!isCurrentPageEpoch(epoch)) return
    if (!await applyLoadedProject(loaded, { epoch })) return
    const listedProjects = await listProjects()
    if (!isCurrentPageEpoch(epoch)) return
    projects.value = listedProjects
    await Promise.allSettled([loadApiKeys(), loadCategoryData()])
    if (!isCurrentPageEpoch(epoch)) return
    storedApiKeys.value = listApiKeys()
    // 首次进入且没有任何可用 Key：网关模式自动弹出 Key 管理引导；
    // 官方直连模式提示去设置页配置厂商 Key
    if (!selectedApiKeyValue.value) {
      if (isGatewayMode) showApiKeyManager.value = true
      else window.$message?.info('请先前往右上角「设置」配置厂商 API Key')
    }
    recoverWaitingTasks()
  } catch (error) {
    if (isCurrentPageEpoch(epoch)) {
      window.$message?.error(error?.message || '画布加载失败')
    }
  }
})

onBeforeUnmount(() => {
  pageEpoch += 1
  projectRequestToken += 1
  for (const nodeId of [...taskControllers.keys()]) abortNodeTask(nodeId)
  for (const url of assetObjectUrls.values()) URL.revokeObjectURL(url)
  assetObjectUrls.clear()
  window.removeEventListener('keydown', handleCanvasKeydown)
  window.removeEventListener('resize', requestPromptDockPositionUpdate)
  document.removeEventListener('visibilitychange', handleVisibilitySave)
  promptDockResizeObserver?.disconnect()
  removeFallbackConnectionListeners?.()
  if (promptDockPositionFrame) window.cancelAnimationFrame(promptDockPositionFrame)
})

function handleConnectStart(eventOrParams, maybeParams) {
  const params = maybeParams || eventOrParams
  pendingConnection.value = {
    nodeId: params?.nodeId || '',
    handleId: params?.handleId || 'right',
  }
}

function handleConnectEnd(event) {
  const screenX = event?.clientX ?? event?.changedTouches?.[0]?.clientX
  const screenY = event?.clientY ?? event?.changedTouches?.[0]?.clientY
  if (screenX == null || screenY == null) {
    pendingConnection.value = null
    return
  }

  const source = pendingConnection.value
  if (!source?.nodeId) {
    pendingConnection.value = null
    return
  }

  const hitNodeEl = document
    .elementsFromPoint(screenX, screenY)
    .find((el) => el.closest?.('.vue-flow__node'))
    ?.closest('.vue-flow__node')

  if (hitNodeEl) {
    const targetNodeId = hitNodeEl.dataset.id || hitNodeEl.getAttribute('data-id')
    if (targetNodeId && targetNodeId !== source.nodeId) {
      const sourceHandle = source.handleId === 'left' ? 'left' : 'right'
      commitCanvasConnection({
        source: source.nodeId,
        target: targetNodeId,
        sourceHandle,
        targetHandle: sourceHandle === 'left' ? 'right' : 'left',
      })
    }
    pendingConnection.value = null
    return
  }

  const flow = screenToFlowCoordinate({ x: screenX, y: screenY })
  const side = source.handleId === 'left' ? 'left' : 'right'
  const sourceNode = nodes.value.find((node) => node.id === source.nodeId)
  connectionMenu.value = {
    screenX,
    screenY,
    flow,
    side,
    anchorToSource: false,
    sourceNodeId: source.nodeId,
    sourceType: sourceNode?.type || '',
  }
  pendingConnection.value = null
}

function commitCanvasConnection(connection) {
  window.setTimeout(() => {
    const edge = onConnect(connection)
    if (edge) nextTick(scheduleGraphSave)
  }, 120)
}

watch(nodes, () => {
  scheduleGraphSave()
}, { deep: true })
watch(edges, () => {
  scheduleGraphSave()
}, { deep: true })

watch(() => selectedNode.value?.id, async (nodeId) => {
  // 节点已进入生成流程(如「重新生成」副本选中后立即开跑):跳过 schema 重载,
  // 否则这里的 beginSchemaRequest 会顶掉 runNodeFromDock 的守卫令牌,导致运行被静默中止
  if (nodeId && startingNodeIds.value.has(nodeId)) return
  const schemaRequest = beginSchemaRequest(nodeId)
  formDataOwnerNodeId.value = ''
  await nextTick()
  if (!isCurrentSchemaRequest(schemaRequest)) return
  schedulePromptDockPositionUpdate()
  const node = selectedNode.value
  if (node?.data?.payload?.modelName) {
    await loadNodeModelSchema(schemaRequest)
    if (!isCurrentSchemaRequest(schemaRequest)) return
  } else {
    modelData.value = {}
    schemaFields.value = []
    formDataOwnerNodeId.value = schemaRequest.nodeId
    formData.value = {}
    // 无模型时恢复上次选用的同类型模型;无存值或已不可用时回退第一个可用模型,避免下拉框空白
    const typeCode = NODE_MODEL_TYPE_MAP[node?.type]
    const picked = typeCode ? readPickedModels()[typeCode] : ''
    const preferred = modelOptions.value.find((item) => item.value === picked && !item.disabled)
      || modelOptions.value.find((item) => !item.disabled)
    if (preferred) {
      await handleModelNameUpdate(preferred.value)
    }
  }
})

watch(formData, (value) => {
  const ownerNodeId = formDataOwnerNodeId.value
  if (!ownerNodeId || selectedNode.value?.id !== ownerNodeId) return
  updateNodePayload(ownerNodeId, { params: { ...value } })
}, { deep: true })

watch(() => [connectedInputs.value.length, schemaFields.value.length], async () => {
  await nextTick()
  schedulePromptDockPositionUpdate()
})

function scheduleGraphSave() {
  if (isSwitchingProject.value) return
  if (!projectId.value) return
  if (isDragging.value) return // 拖拽中跳过，drag-stop 再存
  scheduleSaveGraph(projectId.value, () => toGraph())
}

function handleVisibilitySave() {
  if (document.visibilityState !== 'hidden' || !projectId.value || isSwitchingProject.value) return
  void saveGraph(projectId.value, toGraph()).catch(() => {})
}

async function refreshProjects(request = null) {
  const listedProjects = await listProjects()
  if (request && !isCurrentProjectRequest(request)) return false
  projects.value = listedProjects
  return true
}

async function applyLoadedProject(loaded, { request = null, epoch = pageEpoch } = {}) {
  const isCurrent = () => request
    ? isCurrentProjectRequest(request)
    : isCurrentPageEpoch(epoch)
  if (!isCurrent()) return false
  const previousSwitchingState = isSwitchingProject.value
  isSwitchingProject.value = true
  let recoveredGraph
  try {
    setActiveProject(loaded.project.id)
    project.value = loaded.project
    clearSelection()
    connectionMenu.value = null
    recoveredGraph = applyPendingGraphDeletion(loaded.graph)
    setGraph(repairCanvasGraphForLoad(recoveredGraph))
  } finally {
    isSwitchingProject.value = previousSwitchingState
  }
  await nextTick()
  if (!isCurrent()) return false
  schedulePromptDockPositionUpdate()
  if (recoveredGraph !== loaded.graph) {
    await saveGraph(loaded.project.id, toGraph()).catch(() => {})
    if (!isCurrent()) return false
  }
  return true
}

async function handleProjectSelect(nextProjectId) {
  if (!nextProjectId || nextProjectId === projectId.value) return
  if (taskPersistenceLocked.value) {
    window.$message?.warning('任务信息正在保存，暂时不能切换画布')
    return
  }
  const request = beginProjectRequest()
  try {
    const loaded = await loadProject(nextProjectId, { activate: false })
    if (!isCurrentProjectRequest(request)) return
    abortProjectTasks(projectId.value)
    if (!await applyLoadedProject(loaded, { request })) return
    if (!await refreshProjects(request)) return
    recoverWaitingTasks()
  } catch (error) {
    if (isCurrentProjectRequest(request)) {
      window.$message?.error(error?.message || '画布切换失败')
    }
  }
}

// 新建画布：弹出名称输入框（在工具栏触发），预填默认名
const createDialogVisible = ref(false)
const createName = ref('')

function handleCreateProject() {
  if (taskPersistenceLocked.value) {
    window.$message?.warning('任务信息正在保存，暂时不能新建画布')
    return
  }
  createName.value = `画布 ${projects.value.length + 1}`
  createDialogVisible.value = true
}

async function confirmCreateProject() {
  const name = String(createName.value || '').trim()
  if (!name) {
    window.$message?.warning('请输入画布名称')
    return
  }
  const request = beginProjectRequest()
  try {
    const loaded = await createProject(name, { activate: false })
    if (!isCurrentProjectRequest(request)) return
    abortProjectTasks(projectId.value)
    if (!await applyLoadedProject(loaded, { request })) return
    await refreshProjects(request)
    createDialogVisible.value = false
  } catch (error) {
    if (isCurrentProjectRequest(request)) {
      window.$message?.warning(error?.message || '新建画布失败')
    }
  }
}

// 列表重命名
async function handleRenameProject({ id, name }) {
  try {
    await renameProject(id, name)
    await refreshProjects()
    window.$message?.success('已重命名')
  } catch (error) {
    window.$message?.warning(error?.message || '重命名失败')
  }
}

async function handleApiKeySelect(value) {
  if (taskPersistenceLocked.value) {
    window.$message?.warning('任务信息正在保存，暂时不能切换 API Key')
    return
  }
  const waitingNodeIds = nodes.value
    .filter((node) => node.data?.status === NODE_STATUS.WAITING && node.data?.payload?.task?.taskId)
    .map((node) => node.id)
  for (const nodeId of waitingNodeIds) {
    if (taskControllers.get(nodeId)?.projectId === projectId.value) abortNodeTask(nodeId)
  }
  await selectApiKey(value)
  for (const nodeId of waitingNodeIds) void resumeNodeTask(nodeId)
}

function updatePromptDockPosition() {
  if (!selectedNodeId.value) {
    promptDockStyle.value = { left: '-9999px', top: '-9999px' }
    nodeToolbarStyle.value = { left: '-9999px', top: '-9999px' }
    return
  }

  const nodeEl = document.querySelector(`.vue-flow__node[data-id="${selectedNodeId.value}"]`)
  const nodeRect = nodeEl?.getBoundingClientRect()
  if (!nodeRect) return

  // 节点工具条：悬浮在选中节点上方
  nodeToolbarStyle.value = {
    left: `${nodeRect.left + nodeRect.width / 2}px`,
    top: `${Math.max(12, nodeRect.top - 48)}px`,
  }
  // 提示词码头：底部居中悬浮命令条（即梦/剪映式工作台布局）
  promptDockStyle.value = {
    left: '50%',
    top: 'auto',
    bottom: '14px',
  }
}

function handlePromptUpdate(value) {
  const node = selectedNode.value
  if (!node || running.value) return
  updateNodePayload(node.id, { prompt: value }, { userMutation: true })
}

async function handlePromptDockSubmit(payload) {
  const node = selectedNode.value
  const promptText = payload?.prompt?.trim()
  if (!node || !promptText) return

  const modelName = payload.modelName || node.data?.payload?.modelName || ''

  // 重新生成策略:节点已有成功结果时不覆盖,复制出一个保持上游连线的新节点执行(即梦式变体)。
  // 原节点保持原提示词/参数不变,修改后的配置只写到副本上。
  const hasResult = node.data?.status === NODE_STATUS.SUCCESS
    && Boolean(node.data?.payload?.parsedResults?.length || node.data?.payload?.url)

  if (hasResult) {
    const canRunVariant = payload.shouldRun && modelName && getApiKey()
    if (!canRunVariant) {
      window.$message?.info(modelName ? '选择 API Key 后可运行。' : '请先选择模型。')
      return
    }
    const copy = spawnRegenerationCopy(node)
    const copyPayload = {
      ...(copy.data?.payload || {}),
      prompt: promptText,
      modelName,
      params: {
        ...(copy.data?.payload?.params || {}),
        ...(payload.params || {}),
      },
      error: '',
    }
    // 副本落盘展示新提示词/参数
    updateNodePayload(copy.id, copyPayload, { userMutation: true })
    await runNodeFromDock({ ...copy, data: { ...copy.data, payload: copyPayload } })
    return
  }

  updateNodePayload(node.id, {
    prompt: promptText,
    modelName,
    endpointIndex: node.data?.payload?.endpointIndex || 0,
    params: {
      ...(node.data?.payload?.params || {}),
      ...(payload.params || {}),
    },
    error: '',
  }, { userMutation: true })
  nextTick(() => {
    schedulePromptDockPositionUpdate()
    scheduleGraphSave()
  })

  const canRun = payload.shouldRun && modelName && getApiKey()
  if (!canRun) {
    window.$message?.info(modelName ? '已写入当前节点，选择 API Key 后可运行。' : '已写入当前节点，选择模型后可运行。')
    return
  }

  await runNodeFromDock({
    ...node,
    data: {
      ...node.data,
      payload: {
        ...(node.data?.payload || {}),
        prompt: promptText,
        modelName,
        endpointIndex: node.data?.payload?.endpointIndex || 0,
        params: {
          ...(node.data?.payload?.params || {}),
          ...(payload.params || {}),
        },
        error: '',
      },
    },
  })
}

// 复制节点(剥离运行结果/任务状态),保持上游连线,放置在原节点正下方(上下并排对比)
function spawnRegenerationCopy(node) {
  const payload = { ...(node.data?.payload || {}) }
  delete payload.parsedResults
  delete payload.result
  delete payload.url
  delete payload.task
  delete payload.notice
  delete payload.error
  delete payload.localFile
  delete payload.sourceType
  delete payload.resultOwnerNodeId

  const newNode = addNode(node.type, {
    x: node.position.x,
    y: node.position.y + (node.dimensions?.height || 320) + 60,
  }, {
    data: {
      ...JSON.parse(JSON.stringify(node.data || {})),
      status: NODE_STATUS.IDLE,
      payload,
    },
  })
  if (!newNode) return node
  edges.value
    .filter((edge) => edge.target === node.id)
    .forEach((edge) => appendEdge({
      source: edge.source,
      target: newNode.id,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
    }))
  nextTick(() => {
    schedulePromptDockPositionUpdate()
    scheduleGraphSave()
  })
  return newNode
}

async function runNodeFromDock(node) {
  const schemaRequest = beginSchemaRequest(node.id)
  const work = beginTaskWork(node.id, projectId.value)
  formDataOwnerNodeId.value = ''
  setTaskSetValue(startingNodeIds, node.id, true)
  // 同步生成期间将节点置于 running：驱动卡片扫光、状态胶囊与连线流转动画
  updateNodeStatus(node.id, NODE_STATUS.RUNNING, { error: '' })
  try {
    const model = await loadSingleModel(node.data.payload.modelName)
    if (!isCurrentSchemaRequest(schemaRequest)) return
    if (!model) throw new Error('未找到模型配置')
    setupModel(model)
    selectedEndpointIndex.value = Number(node.data.payload?.endpointIndex || 0)
    await nextTick()
    if (!isCurrentSchemaRequest(schemaRequest)) return
    formDataOwnerNodeId.value = schemaRequest.nodeId
    applyEndpointSchema(selectedEndpoint.value?.path || '/v1/chat/completions')
    await nextTick()
    if (!isCurrentSchemaRequest(schemaRequest)) return
    formDataOwnerNodeId.value = schemaRequest.nodeId
    formData.value = {
      ...formData.value,
      ...(node.data.payload?.params || {}),
    }

    const runSnapshot = {
      modelData: modelData.value,
      formData: { ...formData.value },
      selectedEndpoint: selectedEndpoint.value,
      inputTransformSchema: inputTransformSchema.value,
      requestTypeSchema: requestTypeSchema.value,
      asyncModeSchema: asyncModeSchema.value,
      outputSchema: outputSchema.value,
      inputBindingsSchema: inputBindingsSchema.value,
      videoModes: videoModesSchema.value,
      schemaFields: [...schemaFields.value],
    }
    const runResult = await runCanvasModelNode({
      node,
      apiKey: getApiKey(),
      apiBaseUrl: getApiBaseUrl(),
      ...runSnapshot,
      applyInputTransform,
      signal: work.controller.signal,
      onTaskSubmitted: (taskLink) => persistSubmittedTask(work, taskLink),
    })
    if (runResult.pending) {
      if (isCurrentTaskWork(work)) await resumeNodeTask(node.id, work)
    } else if (isCurrentTaskWork(work)) {
      await persistCompletedTask(work)
      if (isCurrentTaskController(work)) window.$message?.success('模型运行完成')
    }
  } catch (error) {
    if (error?.name !== 'AbortError' && isCurrentTaskWork(work)) {
      updateNodeStatus(node.id, NODE_STATUS.ERROR, {
        task: undefined,
        error: error?.message || '模型运行失败',
        notice: node.data?.payload?.parsedResults?.length ? '本次失败，当前显示上次成功结果' : '',
      })
      await saveGraph(work.projectId, toGraph()).catch(() => {})
      window.$message?.error(error?.message || '模型运行失败')
    }
  } finally {
    // 中止/中断且未进入其他状态时，复位 running 视觉
    if (getNodeById(node.id)?.data?.status === NODE_STATUS.RUNNING && taskControllers.get(node.id) === work) {
      updateNodeStatus(node.id, NODE_STATUS.IDLE)
    }
    if (taskControllers.get(node.id) === work) finishTaskWork(work)
  }
}

function handleNodeClick(event) {
  const nodeId = event.node?.id || ''
  selectNode(nodeId)
  if (connectionMenu.value?.sourceNodeId !== nodeId) connectionMenu.value = null
  nextTick(schedulePromptDockPositionUpdate)
}

function handleEdgeClick(event) {
  selectEdge(event.edge?.id || '')
  connectionMenu.value = null
}

function handleSelectionChange({ nodes: selectedNodes = [], edges: selectedEdges = [] } = {}) {
  if (selectedNodes.length) {
    selectNode(selectedNodes.at(-1)?.id || '')
  } else if (!selectedEdges.length) {
    clearSelection()
  }
}

function handlePaneClick() {
  clearSelection()
  connectionMenu.value = null
}

function handleNodeDrag(event) {
  if (!isDragging.value) {
    isDragging.value = true
    // 拖拽开始：点亮连接边的渐变流光
    const dragged = event?.nodes?.length ? event.nodes : (event?.node ? [event.node] : [])
    const ids = dragged.map((n) => n.id).filter(Boolean)
    if (ids.length) setEdgeGlow(ids)
  }
}

function handleNodeDragStop() {
  isDragging.value = false
  dragTick.value += 1
  schedulePromptDockPositionUpdate()
  scheduleGraphSave() // 拖拽结束一次性保存
  // 流光延迟熄灭
  if (pulsingEdgeIds.value.size) scheduleEdgeGlowClear()
}

function handleMove() {
  // promptDock 固定在底部居中，平移/缩放不需要更新位置
  // nodeToolbar 跟随节点，move-end 统一更新一次
}

function handleMoveEnd() {
  schedulePromptDockPositionUpdate()
  scheduleGraphSave()
}

function schedulePromptDockPositionUpdate() {
  requestPromptDockPositionUpdate()
}

function requestPromptDockPositionUpdate() {
  if (promptDockPositionFrame) return
  promptDockPositionFrame = window.requestAnimationFrame(() => {
    promptDockPositionFrame = 0
    updatePromptDockPosition()
  })
}

function handlePaneDoubleClick(event) {
  if (event.target?.closest?.('.vue-flow__node')) return
  if (event.target?.closest?.('.connection-drop-menu')) return

  const screenX = event?.clientX
  const screenY = event?.clientY
  if (screenX == null || screenY == null) return

  connectionMenu.value = {
    screenX,
    screenY,
    flow: screenToFlowCoordinate({ x: screenX, y: screenY }),
    side: 'right',
    anchorToSource: false,
    sourceNodeId: '',
    sourceType: '',
  }
}

function handleNodeQuickAdd(event) {
  const screenX = event?.screenX
  const screenY = event?.screenY
  if (!event?.nodeId || screenX == null || screenY == null) return

  const sourceNode = nodes.value.find((node) => node.id === event.nodeId)
  if (!sourceNode) return
  const side = event.side === 'left' ? 'left' : 'right'
  const sourceNodeElement = [...document.querySelectorAll('.vue-flow__node')]
    .find((element) => (element.dataset.id || element.getAttribute('data-id')) === event.nodeId)
  const handleRect = sourceNodeElement
    ?.querySelector(`.node-handle-plus.is-${side}`)
    ?.getBoundingClientRect()
  const anchorPoint = handleRect
    ? getCanvasQuickAddAnchorPoint(handleRect, side)
    : { x: screenX, y: screenY }

  connectionMenu.value = {
    screenX,
    screenY,
    flow: screenToFlowCoordinate(anchorPoint),
    side,
    anchorToSource: true,
    sourceNodeId: event.nodeId,
    sourceType: sourceNode.type,
  }
}

function getEventPoint(event) {
  const touch = event.changedTouches?.[0] || event.touches?.[0]
  return {
    x: event.clientX ?? touch?.clientX,
    y: event.clientY ?? touch?.clientY,
  }
}

function getHandleNodeId(handle) {
  const node = handle?.closest?.('.vue-flow__node')
  return node?.dataset?.id || node?.getAttribute?.('data-id') || ''
}

function getHandleSide(handle) {
  return handle?.dataset?.handleid ||
    handle?.getAttribute?.('data-handleid') ||
    (handle?.classList?.contains('is-left') ? 'left' : 'right')
}

function findNodeAtPoint(x, y) {
  return document
    .elementsFromPoint(x, y)
    .find((el) => el.closest?.('.vue-flow__node'))
    ?.closest('.vue-flow__node')
}

function attachFallbackConnectionListeners() {
  if (removeFallbackConnectionListeners) return

  let dragSource = null

  const handlePointerDown = (event) => {
    const handle = event.target?.closest?.('.node-handle-plus')
    const nodeId = getHandleNodeId(handle)
    if (!handle || !nodeId) return

    const point = getEventPoint(event)
    dragSource = {
      nodeId,
      handleId: getHandleSide(handle),
      startX: point.x,
      startY: point.y,
    }
  }

  const handlePointerUp = (event) => {
    if (!dragSource?.nodeId) return

    const point = getEventPoint(event)
    if (point.x == null || point.y == null) {
      dragSource = null
      return
    }

    const moved = Math.abs(point.x - dragSource.startX) > 5 || Math.abs(point.y - dragSource.startY) > 5
    if (!moved) {
      dragSource = null
      return
    }

    const targetNodeEl = findNodeAtPoint(point.x, point.y)
    const targetNodeId = targetNodeEl?.dataset?.id || targetNodeEl?.getAttribute?.('data-id')
    if (targetNodeId && targetNodeId !== dragSource.nodeId) {
      const sourceHandle = dragSource.handleId === 'left' ? 'left' : 'right'
      commitCanvasConnection({
        source: dragSource.nodeId,
        target: targetNodeId,
        sourceHandle,
        targetHandle: sourceHandle === 'left' ? 'right' : 'left',
      })
      dragSource = null
      return
    }

    const sourceNode = nodes.value.find((node) => node.id === dragSource.nodeId)
    if (sourceNode) {
      connectionMenu.value = {
        screenX: point.x,
        screenY: point.y,
        flow: screenToFlowCoordinate({ x: point.x, y: point.y }),
        side: dragSource.handleId === 'left' ? 'left' : 'right',
        anchorToSource: false,
        sourceNodeId: dragSource.nodeId,
        sourceType: sourceNode.type,
      }
    }
    dragSource = null
  }

  const resetDragSource = () => {
    dragSource = null
  }

  window.addEventListener('pointerdown', handlePointerDown, true)
  window.addEventListener('mousedown', handlePointerDown, true)
  window.addEventListener('pointerup', handlePointerUp, true)
  window.addEventListener('mouseup', handlePointerUp, true)
  window.addEventListener('pointercancel', resetDragSource, true)
  removeFallbackConnectionListeners = () => {
    window.removeEventListener('pointerdown', handlePointerDown, true)
    window.removeEventListener('mousedown', handlePointerDown, true)
    window.removeEventListener('pointerup', handlePointerUp, true)
    window.removeEventListener('mouseup', handlePointerUp, true)
    window.removeEventListener('pointercancel', resetDragSource, true)
  }
}

function handleConnectionMenuSelect(type) {
  if (!connectionMenu.value) return

  const menu = connectionMenu.value
  const gap = menu.anchorToSource ? CONNECTED_NODE_GAP : 0
  const position = menu.sourceNodeId
    ? {
        x: menu.side === 'right'
          ? menu.flow.x + gap
          : menu.flow.x - CANVAS_NODE_WIDTH - gap,
        y: menu.flow.y - 58,
      }
    : {
        x: menu.flow.x - 115,
        y: menu.flow.y - 58,
      }

  if (menu.sourceNodeId) {
    addConnectedNode({
      sourceNodeId: menu.sourceNodeId,
      side: menu.side,
      type,
      position,
    })
  } else {
    addNode(type, position)
  }

  connectionMenu.value = null
  nextTick(scheduleGraphSave)
}

function handleDuplicateSelected() {
  duplicateSelected()
  nextTick(scheduleGraphSave)
}

function handleGroupSelected() {
  if (groupSelectedNodes()) scheduleGraphSave()
}

function handleUngroupSelected() {
  const groupId = selectionToolbarNodes.value[0]?.id
  if (groupId && ungroupNode(groupId)) scheduleGraphSave()
}

function handleGroupLayout(direction) {
  const groupId = selectionToolbarNodes.value[0]?.id
  if (groupId && layoutGroup(groupId, direction)) {
    dragTick.value += 1
    scheduleGraphSave()
  }
}

function handleAutoLayout() {
  if (!applyAutoLayout()) return
  scheduleGraphSave()
  nextTick(fitCanvas)
}

async function requestDeleteSelection() {
  const nodeIds = new Set(selectedNodes.value.map((node) => node.id))
  if (selectedNode.value) nodeIds.add(selectedNode.value.id)
  if (!nodeIds.size && selectedEdgeId.value) {
    const currentProjectId = projectId.value
    const beforeGraph = toGraph()
    deleteSelectedGraphItems()
    const afterGraph = toGraph()
    const deletionIntentSaved = await recordPendingGraphDeletion(currentProjectId, beforeGraph, afterGraph)
    void saveGraph(currentProjectId, afterGraph).catch((error) => {
      window.$message?.error(deletionIntentSaved
        ? '删除结果暂未写入主存储，刷新后仍会保持删除'
        : (error?.message || '删除保存失败，请暂勿刷新并重试'))
    })
    return
  }
  if (!nodeIds.size) return

  const selected = nodes.value.filter((node) => nodeIds.has(node.id))
  const hasActiveTask = selected.some((node) =>
    startingNodeIds.value.has(node.id) || ['running', 'waiting'].includes(node.data?.status),
  )
  const isSingleGroup = selected.length === 1 && selected[0]?.type === CANVAS_NODE_TYPES.GROUP
  window.$dialog.warning({
    title: nodeIds.size > 1 ? `删除 ${nodeIds.size} 个节点` : '删除节点',
    content: hasActiveTask
      ? '任务可能继续计费且无法恢复。删除后也不会找回任务结果，是否继续？'
      : isSingleGroup
        ? '仅删除分组容器，组内节点会保留。是否继续？'
        : '删除后无法恢复，是否继续？',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      const currentProjectId = projectId.value
      const beforeGraph = toGraph()
      for (const nodeId of nodeIds) abortNodeTask(nodeId)
      deleteSelectedGraphItems()
      const afterGraph = toGraph()
      const deletionIntentSaved = await recordPendingGraphDeletion(currentProjectId, beforeGraph, afterGraph)
      try {
        await saveGraph(currentProjectId, afterGraph)
      } catch (error) {
        window.$message?.error(deletionIntentSaved
          ? '删除结果暂未写入主存储，刷新后仍会保持删除'
          : (error?.message || '删除保存失败，请暂勿刷新并重试'))
      }
    },
  })
}

function handleCanvasKeydown(event) {
  const target = event.target
  const isEditable = target?.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)
  if (isEditable) return

  if (event.key === 'Escape') {
    clearSelection()
    connectionMenu.value = null
    return
  }

  if ((event.key === 'Delete' || event.key === 'Backspace') && hasSelection.value) {
    event.preventDefault()
    requestDeleteSelection()
    return
  }

  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'd' && hasSelection.value) {
    event.preventDefault()
    duplicateSelected()
    nextTick(scheduleGraphSave)
    return
  }

  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a') {
    event.preventDefault()
    selectAllNodes()
    return
  }

  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'g') {
    event.preventDefault()
    if (event.shiftKey) handleUngroupSelected()
    else handleGroupSelected()
    return
  }

  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'c' && hasSelection.value) {
    event.preventDefault()
    copySelected()
    return
  }

  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'v') {
    const pasted = pasteCopied()
    if (pasted.length) {
      event.preventDefault()
      nextTick(scheduleGraphSave)
    }
    return
  }

  if (event.key === '0') {
    event.preventDefault()
    fitCanvas()
    return
  }

  if (event.key.toLowerCase() === 'f' && hasSelection.value) {
    event.preventDefault()
    fitSelected()
  }
}

function handleTitleUpdate(title) {
  if (!selectedNode.value) return
  updateNodeData(selectedNode.value.id, { title }, { userMutation: true })
}

function handlePayloadUpdate(patch) {
  if (!selectedNode.value) return
  updateNodePayload(selectedNode.value.id, patch, { userMutation: true })
}

async function handleModelNameUpdate(modelName) {
  const nodeId = selectedNode.value?.id
  if (!nodeId) return
  const option = modelOptions.value.find((item) => item.value === modelName)
  if (option?.disabled) {
    window.$message?.warning('该模型的提交入口未开放')
    return
  }
  const schemaRequest = beginSchemaRequest(nodeId)
  formDataOwnerNodeId.value = ''
  updateNodePayload(nodeId, {
    modelName,
    endpointIndex: 0,
    params: {},
    error: '',
  }, { userMutation: true })
  rememberPickedModel(NODE_MODEL_TYPE_MAP[selectedNode.value?.type], modelName)
  selectedEndpointIndex.value = 0
  await loadNodeModelSchema(schemaRequest)
  if (!isCurrentSchemaRequest(schemaRequest)) return
}

async function handleEndpointIndexUpdate(index) {
  const nodeId = selectedNode.value?.id
  if (!nodeId || formDataOwnerNodeId.value !== nodeId) return
  const option = endpointOptions.value.find((item) => item.value === index)
  if (option?.disabled) {
    window.$message?.warning('该 Endpoint 的提交入口未开放')
    return
  }
  const schemaRequest = beginSchemaRequest(nodeId)
  formDataOwnerNodeId.value = ''
  selectedEndpointIndex.value = index
  updateNodePayload(nodeId, { endpointIndex: index }, { userMutation: true })
  await nextTick()
  if (!isCurrentSchemaRequest(schemaRequest)) return
  if (selectedEndpoint.value?.path) {
    formDataOwnerNodeId.value = schemaRequest.nodeId
    applyEndpointSchema(selectedEndpoint.value.path)
  }
}

function handleFormDataUpdate(nextFormData) {
  const nodeId = selectedNode.value?.id
  if (!nodeId || formDataOwnerNodeId.value !== nodeId) return
  detachResultOwnership(nodeId)
  formData.value = nextFormData
}

async function loadNodeModelSchema(schemaRequest) {
  if (!isCurrentSchemaRequest(schemaRequest)) return
  const node = selectedNode.value
  const modelName = node?.data?.payload?.modelName
  if (!modelName) {
    modelData.value = {}
    schemaFields.value = []
    formDataOwnerNodeId.value = schemaRequest.nodeId
    formData.value = {}
    return
  }

  const model = await loadSingleModel(modelName)
  if (!isCurrentSchemaRequest(schemaRequest)) return
  if (!model) return
  setupModel(model)
  selectedEndpointIndex.value = Number(node.data.payload?.endpointIndex || 0)
  await nextTick()
  if (!isCurrentSchemaRequest(schemaRequest)) return
  formDataOwnerNodeId.value = schemaRequest.nodeId
  applyEndpointSchema(selectedEndpoint.value?.path || '/v1/chat/completions')
  await nextTick()
  if (!isCurrentSchemaRequest(schemaRequest)) return
  formDataOwnerNodeId.value = schemaRequest.nodeId
  formData.value = {
    ...formData.value,
    ...(node.data.payload?.params || {}),
  }
}

async function handleRunNode() {
  const node = selectedNode.value
  if (!node) return
  await runNodeFromDock(node)
}

// 追踪各节点持有的本地素材 object URL，便于替换/删除/卸载时统一释放，避免泄漏
const assetObjectUrls = new Map()
function trackAssetUrl(nodeId, url) {
  if (!nodeId || !url || typeof url !== 'string' || !url.startsWith('blob:')) return
  const prev = assetObjectUrls.get(nodeId)
  if (prev && prev !== url) URL.revokeObjectURL(prev)
  assetObjectUrls.set(nodeId, url)
}
function releaseAssetUrl(nodeId) {
  const url = assetObjectUrls.get(nodeId)
  if (url) {
    URL.revokeObjectURL(url)
    assetObjectUrls.delete(nodeId)
  }
}

// 上传图片本地 blob 预览 + localFile 兜底（运行时转 dataURL 注入，仅当前会话有效，刷新需重新上传）
async function handleAssetUpload(file) {
  const node = selectedNode.value
  if (!node || node.type !== CANVAS_NODE_TYPES.IMAGE || !file) return
  const previewUrl = URL.createObjectURL(file)
  trackAssetUrl(node.id, previewUrl)
  updateNodePayload(node.id, {
    url: previewUrl,
    localFile: file,
    name: file.name,
    sourceType: 'local',
  }, { userMutation: true })
}

</script>

<style scoped lang="scss">
.ai-canvas-page {
  width: 100%;
  height: 100vh;
  display: flex;
  overflow: hidden;
  background: var(--cf-bg-page);
}

.canvas-workspace {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;

  // 画布表面的品牌微光：柔和径向渐变，随主题令牌变化
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    background:
      radial-gradient(860px 400px at 16% -4%, color-mix(in srgb, var(--cf-brand) 5%, transparent), transparent 62%),
      radial-gradient(720px 360px at 92% 104%, color-mix(in srgb, var(--cf-brand) 4%, transparent), transparent 60%);
  }
}

.canvas-flow {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  background: transparent;
}

:deep(.vue-flow__pane) {
  cursor: grab;
}

:deep(.vue-flow__selection) {
  border: 1px solid color-mix(in srgb, var(--cf-brand) 45%, transparent);
  background: color-mix(in srgb, var(--cf-brand) 6%, transparent);
}

:deep(.vue-flow__connection-path) {
  stroke: var(--cf-brand);
  stroke-width: 2;
  stroke-dasharray: 6 4;
}

:deep(.vue-flow__node.selected .canvas-node .node-card),
:deep(.vue-flow__node.selected .canvas-group-node) {
  border-color: var(--cf-brand);
  box-shadow: 0 0 0 1px var(--cf-brand-soft-strong), var(--cf-shadow-lg);
}

:deep(.vue-flow__controls) {
  overflow: hidden;
  border: 1px solid var(--cf-border);
  border-radius: 10px;
  background: color-mix(in srgb, var(--cf-bg-elevated) 95%, transparent);
  box-shadow: var(--cf-shadow-md);
}

:deep(.vue-flow__controls-button) {
  width: 32px;
  height: 32px;
  border-bottom-color: var(--cf-border);
  background: transparent;
  color: var(--cf-text-secondary);
}

:deep(.vue-flow__controls-button:hover) {
  background: var(--cf-brand-soft);
  color: var(--cf-brand);
}

:deep(.vue-flow__minimap) {
  overflow: hidden;
  border: 1px solid var(--cf-border);
  border-radius: 10px;
  background: color-mix(in srgb, var(--cf-bg-elevated) 95%, transparent);
  box-shadow: var(--cf-shadow-md);
}

:deep(.vue-flow__minimap-mask) {
  fill: color-mix(in srgb, var(--cf-brand) 8%, transparent);
}

.empty-canvas-hint {
  position: absolute;
  z-index: 4;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 30px 38px;
  border: 1px solid var(--cf-border);
  border-radius: 18px;
  background: color-mix(in srgb, var(--cf-bg-elevated) 95%, transparent);
  box-shadow: var(--cf-shadow-lg);
  pointer-events: none;
  color: var(--cf-text-tertiary);
  text-align: center;

  .empty-hint-icon {
    width: 46px;
    height: 46px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 2px;
    border-radius: 13px;
    background: var(--cf-brand-soft);
    color: var(--cf-brand);
    box-shadow: 0 6px 16px color-mix(in srgb, var(--cf-brand) 24%, transparent);
  }

  strong {
    color: var(--cf-text-primary);
    font-size: 16px;
    font-weight: 850;
    letter-spacing: -0.01em;
  }

  span {
    font-size: 13px;
  }

  .empty-hint-keys {
    display: flex;
    align-items: center;
    gap: 8px 16px;
    flex-wrap: wrap;
    justify-content: center;
    margin-top: 8px;
    padding-top: 14px;
    border-top: 1px solid var(--cf-border);
    font-size: 11.5px;
    color: var(--cf-text-tertiary);
  }

  .hint-key {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 19px;
    padding: 0 6px;
    border: 1px solid var(--cf-border-strong);
    border-bottom-width: 2px;
    border-radius: 5px;
    background: var(--cf-bg-subtle);
    color: var(--cf-text-secondary);
    font-family: inherit;
    font-size: 10.5px;
    font-weight: 750;
    line-height: 1;
  }
}

@media (max-width: 1100px) {
  .ai-canvas-page {
    height: auto;
    min-height: 100vh;
    flex-direction: column;
  }
}

// ── 新建画布弹窗（卡片式；n-modal 内容 teleport 到 body，需 :deep） ──
:deep(.create-canvas-modal) {
  width: 440px;
  max-width: calc(100vw - 48px);
  border-radius: var(--cf-radius-lg);
  background: var(--cf-bg-elevated);
  border: 1px solid var(--cf-border);
  box-shadow: var(--cf-shadow-lg);

  .n-card-header {
    padding: 16px 20px 8px;
    font-size: 15px;
    font-weight: 650;
  }

  .n-card__content {
    padding: 8px 20px 4px;
  }

  .n-card__footer {
    padding: 12px 20px 16px;
  }

  .create-canvas-body {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .create-canvas-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--cf-text-secondary);
  }

  .create-canvas-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }
}
</style>
