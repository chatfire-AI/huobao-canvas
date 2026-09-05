import { computed, ref, shallowRef } from 'vue'
import { buildWorkflowExecutionPlan } from '../utils/dagScheduler.js'

export function useWorkflowEngine() {
  const isWorkflowRunning = ref(false)
  const currentPlan = shallowRef({ layers: [], totalNodes: 0 })
  const runningNodeIds = ref(new Set())
  const completedNodeIds = ref(new Set())
  const failedNodeIds = ref(new Set())
  // 上游失败后被级联跳过的下游节点（依赖失败输出的下游没有执行意义）
  const skippedNodeIds = ref(new Set())
  const progress = ref({
    current: 0,
    total: 0,
    currentLayer: 0,
    totalLayers: 0,
    percent: 0,
    statusText: '',
  })

  let abortController = null

  const progressPercent = computed(() => {
    if (!progress.value.total) return 0
    return Math.min(100, Math.round((progress.value.current / progress.value.total) * 100))
  })

  const stopWorkflow = () => {
    if (abortController) {
      abortController.abort()
      abortController = null
    }
    isWorkflowRunning.value = false
    runningNodeIds.value = new Set()
    progress.value.statusText = '工作流已停止'
  }

  // 集合整体替换（而非原地 mutate），保证 Vue 响应式触发
  const addNodeId = (target, nodeId) => {
    const next = new Set(target.value)
    next.add(nodeId)
    target.value = next
  }

  /**
   * 执行工作流（支持全局运行、指定终点反向运行、指定起点运行）
   *
   * 执行语义：
   * - 按 DAG 分层拓扑序执行；层内串行。节点执行会写节点状态并触发 IndexedDB 保存，
   *   且下游依赖上游输出，并行的调度收益远小于状态竞态成本
   * - 单节点失败不中断整图：标记失败并级联跳过其全部下游，其余分支继续执行
   * - 停止（stopWorkflow）经 signal 传递，由 runNodeFn 内部联动中止在途请求
   *
   * @param {Object} params
   * @param {Array} params.nodes - 画布当前节点列表
   * @param {Array} params.edges - 画布当前连线列表
   * @param {Function} params.runNodeFn - 单节点运行异步函数 (nodeId, { signal }) => Promise<void>
   * @param {string|Array<string>} [params.targetNodeIds] - 目标终点节点 ID（反向回溯提取依赖执行）
   * @param {string|Array<string>} [params.startNodeIds] - 起始节点 ID（执行后续依赖分支）
   */
  const executeWorkflow = async ({
    nodes = [],
    edges = [],
    runNodeFn,
    targetNodeIds = null,
    startNodeIds = null,
  }) => {
    if (isWorkflowRunning.value) {
      stopWorkflow()
      await new Promise((r) => setTimeout(r, 100))
    }

    const plan = buildWorkflowExecutionPlan(nodes, edges, { targetNodeIds, startNodeIds })
    if (plan.hasCycle) {
      const err = new Error(plan.error || '检测到循环连线引用，无法执行')
      window.$message?.error(err.message)
      throw err
    }

    if (!plan.layers.length || plan.totalNodes === 0) {
      window.$message?.warning('未找到可执行的工作流节点')
      return { success: true, executedCount: 0, failedCount: 0, skippedCount: 0 }
    }

    currentPlan.value = plan
    abortController = new AbortController()
    const { signal } = abortController

    isWorkflowRunning.value = true
    runningNodeIds.value = new Set()
    completedNodeIds.value = new Set()
    failedNodeIds.value = new Set()
    skippedNodeIds.value = new Set()

    progress.value = {
      current: 0,
      total: plan.totalNodes,
      currentLayer: 0,
      totalLayers: plan.layers.length,
      percent: 0,
      statusText: `准备执行工作流（共 ${plan.totalNodes} 个节点）...`,
    }

    // 计划内下游邻接表：仅含参与本次执行的节点（target/start 裁剪后的子图）
    const planNodeIds = new Set(plan.layers.flat())
    const downAdj = new Map()
    planNodeIds.forEach((id) => downAdj.set(id, []))
    edges.forEach((e) => {
      if (downAdj.has(e.source) && downAdj.has(e.target)) downAdj.get(e.source).push(e.target)
    })

    const blockedIds = new Set()
    const markDescendantsSkipped = (rootId) => {
      const queue = [...(downAdj.get(rootId) || [])]
      while (queue.length > 0) {
        const id = queue.shift()
        if (blockedIds.has(id)) continue
        blockedIds.add(id)
        addNodeId(skippedNodeIds, id)
        queue.push(...(downAdj.get(id) || []))
      }
    }

    const advanceProgress = () => {
      progress.value.current += 1
      progress.value.percent = Math.min(100, Math.round((progress.value.current / progress.value.total) * 100))
    }

    try {
      for (let layerIdx = 0; layerIdx < plan.layers.length; layerIdx++) {
        if (signal.aborted) break

        progress.value.currentLayer = layerIdx + 1
        progress.value.statusText = `正在执行第 ${layerIdx + 1}/${plan.layers.length} 阶段...`

        for (const nodeId of plan.layers[layerIdx]) {
          if (signal.aborted) break
          // 上游失败级联：本节点已被标记跳过，不计失败也不执行
          if (blockedIds.has(nodeId)) {
            advanceProgress()
            continue
          }

          addNodeId(runningNodeIds, nodeId)
          try {
            await runNodeFn(nodeId, { signal })
            addNodeId(completedNodeIds, nodeId)
          } catch (err) {
            // 工作流自身停止引发的中止不算节点失败；其余错误标记失败并级联跳过下游
            if (signal.aborted) break
            addNodeId(failedNodeIds, nodeId)
            console.error(`[WorkflowEngine] 节点 ${nodeId} 执行失败:`, err)
            markDescendantsSkipped(nodeId)
          } finally {
            const r = new Set(runningNodeIds.value)
            r.delete(nodeId)
            runningNodeIds.value = r
            advanceProgress()
          }
        }
      }

      const completedCount = completedNodeIds.value.size
      const failedCount = failedNodeIds.value.size
      const skippedCount = skippedNodeIds.value.size

      if (signal.aborted) {
        progress.value.statusText = '工作流已取消'
        return { success: false, aborted: true, executedCount: completedCount, failedCount, skippedCount }
      }
      if (failedCount > 0) {
        progress.value.statusText = `工作流执行结束：成功 ${completedCount}，失败 ${failedCount}，跳过 ${skippedCount}`
        window.$message?.warning(`工作流执行完成：${failedCount} 个节点失败，已跳过 ${skippedCount} 个下游节点`)
        return { success: false, executedCount: completedCount, failedCount, skippedCount }
      }
      progress.value.statusText = '工作流全部执行完成'
      window.$message?.success('工作流执行完成！')
      return { success: true, executedCount: completedCount, failedCount: 0, skippedCount: 0 }
    } catch (error) {
      if (error?.name === 'AbortError' || signal.aborted) {
        progress.value.statusText = '工作流已中止'
        return { success: false, aborted: true }
      }
      progress.value.statusText = `执行异常: ${error?.message || '未知错误'}`
      throw error
    } finally {
      isWorkflowRunning.value = false
      runningNodeIds.value = new Set()
      abortController = null
    }
  }

  return {
    isWorkflowRunning,
    currentPlan,
    runningNodeIds,
    completedNodeIds,
    failedNodeIds,
    skippedNodeIds,
    progress,
    progressPercent,
    executeWorkflow,
    stopWorkflow,
  }
}
