import { computed, onScopeDispose, ref } from 'vue'
import { useRequestPipeline } from '../../../composables/useRequestPipeline'
import { STATUS_TEXT_MAP, STATUS_TYPE_MAP, getEndpointDisplayType } from '../constants/index'

export function usePlaygroundRunner({
  modelData,
  formData,
  selectedEndpoint,
  inputTransformSchema,
  requestTypeSchema,
  asyncModeSchema,
  outputSchema,
  route,
  getApiKey,
  getApiBaseUrl,
  applyInputTransform,
  initFormData,
  getNestedValue,
}) {
  const { run: pipelineRun, resumeTask } = useRequestPipeline({ getNestedValue })
  const running = ref(false)
  const result = ref(null)
  const resultView = ref('preview')
  const status = ref('idle')
  const pollingTaskId = ref('')
  const chatViewMode = ref('chat')
  const parsedResults = ref([])
  const requestMeta = ref(emptyRequestMeta())

  // 异步任务时间线状态：taskId 完成后保留，耗时随状态冻结
  const taskId = ref('')
  const runStartedAt = ref(0)
  const nowTick = ref(0)
  let tickTimer = null

  const elapsedSeconds = computed(() => {
    if (!runStartedAt.value || !nowTick.value) return 0
    return Math.max(0, Math.round((nowTick.value - runStartedAt.value) / 1000))
  })

  function startTicker() {
    stopTicker()
    runStartedAt.value = Date.now()
    nowTick.value = runStartedAt.value
    tickTimer = setInterval(() => {
      nowTick.value = Date.now()
    }, 1000)
  }

  function stopTicker() {
    if (tickTimer) {
      clearInterval(tickTimer)
      tickTimer = null
    }
    if (runStartedAt.value) nowTick.value = Date.now()
  }

  onScopeDispose(stopTicker)

  const statusType = computed(() => STATUS_TYPE_MAP[status.value] || 'default')
  const statusText = computed(() => pollingTaskId.value
    ? `任务处理中: ${pollingTaskId.value}`
    : STATUS_TEXT_MAP[status.value] || 'Idle')
  const resultType = computed(() => {
    if (outputSchema.value?.displayType && outputSchema.value.displayType !== 'auto') {
      return outputSchema.value.displayType
    }
    const endpointType = getEndpointDisplayType(
      selectedEndpoint.value?.path,
      selectedEndpoint.value?.capability,
    )
    return endpointType
  })
  const resultJson = computed(() => JSON.stringify(result.value || {}, null, 2))

  async function handleRun() {
    running.value = true
    status.value = 'running'
    result.value = null
    parsedResults.value = []
    pollingTaskId.value = ''
    taskId.value = ''
    startTicker()

    try {
      const runResult = await pipelineRun({
        model: modelData.value,
        formData: formData.value,
        endpoint: selectedEndpoint.value,
        protocolKey: (modelData.value.modelSchema?.protocolKey) || undefined,
        apiKey: getApiKey(),
        apiBaseUrl: getApiBaseUrl(),
        stream: false,
        applyInputTransform,
        inputTransformSchema: inputTransformSchema.value,
        outputSchema: outputSchema.value,
        asyncModeSchema: asyncModeSchema.value,
        onTaskSubmitted: async (taskLink) => {
          pollingTaskId.value = taskLink.taskId
          taskId.value = taskLink.taskId
          status.value = 'polling'
        },
      })

      const completed = runResult.pending
        ? await resumeTask({
          taskLink: runResult.taskLink,
          apiKey: getApiKey(),
          apiBaseUrl: getApiBaseUrl(),
        })
        : runResult

      result.value = completed.result
      parsedResults.value = completed.parsedResults || []
      requestMeta.value = completed.requestMeta || requestMeta.value
      status.value = 'success'
    } catch (error) {
      console.error('Run error:', error)
      status.value = 'error'
      result.value = { error: error.message }
    } finally {
      pollingTaskId.value = ''
      running.value = false
      stopTicker()
    }
  }

  function handleReset() {
    initFormData()
    result.value = null
    parsedResults.value = []
    resultView.value = 'preview'
    status.value = 'idle'
    pollingTaskId.value = ''
    taskId.value = ''
    runStartedAt.value = 0
    nowTick.value = 0
    requestMeta.value = emptyRequestMeta()
  }

  return {
    running,
    result,
    resultView,
    status,
    pollingTaskId,
    taskId,
    elapsedSeconds,
    chatViewMode,
    requestMeta,
    statusType,
    statusText,
    resultType,
    parsedResults,
    resultJson,
    handleRun,
    handleReset,
  }
}

function emptyRequestMeta() {
  return {
    duration: 0,
    requestHeaders: {},
    responseHeaders: {},
    tokenUsage: null,
    estimatedCost: null,
  }
}
