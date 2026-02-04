<template>
  <!-- LLM Config node wrapper | LLM配置节点包裹层 -->
  <div class="llm-node-wrapper" @mouseenter="showActions = true" @mouseleave="showActions = false">
    <!-- LLM Config node | LLM配置节点 -->
    <div
      class="llm-node bg-[var(--bg-secondary)] rounded-xl border min-w-[320px] max-w-[400px] relative transition-all duration-200"
      :class="data.selected ? 'border-1 border-purple-500 shadow-lg shadow-purple-500/20' : 'border border-[var(--border-color)]'">
      <!-- Header | 头部 -->
      <div class="flex items-center justify-between px-3 py-2 border-b border-[var(--border-color)] bg-gradient-to-r from-purple-500/10 to-transparent">
        <div class="flex items-center gap-2">
          <n-icon :size="16" class="text-purple-500">
            <ChatbubbleOutline />
          </n-icon>
          <span class="text-sm font-medium text-[var(--text-secondary)]">{{ data.label || 'LLM 文本生成' }}</span>
        </div>
        <div class="flex items-center gap-1">
          <button @click="handleDelete" class="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors">
            <n-icon :size="14">
              <TrashOutline />
            </n-icon>
          </button>
        </div>
      </div>

      <!-- Config content | 配置内容 -->
      <div class="p-3 space-y-3">
        <!-- System prompt | 系统提示词 -->
        <div>
          <label class="text-xs text-[var(--text-secondary)] mb-1 block">系统提示词</label>
          <textarea 
            v-model="systemPrompt" 
            @blur="updateConfig"
            @wheel.stop 
            @mousedown.stop
            class="w-full bg-[var(--bg-tertiary)] rounded-lg p-2 resize-none outline-none text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] min-h-[60px] max-h-[120px] overflow-y-auto border border-[var(--border-color)] focus:border-purple-500 transition-colors"
            placeholder="设定 AI 的角色和行为规则..." 
          />
        </div>

        <!-- Model selection | 模型选择 -->
        <div>
          <label class="text-xs text-[var(--text-secondary)] mb-1 block">模型</label>
          <n-select
            v-model:value="model"
            :options="modelOptions"
            size="small"
            @update:value="updateConfig"
          />
        </div>

        <!-- Output format | 输出格式 -->
        <div>
          <label class="text-xs text-[var(--text-secondary)] mb-1 block">输出格式</label>
          <n-select
            v-model:value="outputFormat"
            :options="formatOptions"
            size="small"
            @update:value="updateConfig"
          />
        </div>

        <!-- Generate button | 生成按钮 -->
        <button 
          @click="handleGenerate"
          :disabled="isGenerating"
          class="w-full px-4 py-2 text-sm rounded-lg bg-purple-500 hover:bg-purple-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <n-spin v-if="isGenerating" :size="14" />
          <n-icon v-else :size="14"><SparklesOutline /></n-icon>
          {{ isGenerating ? '生成中...' : '执行生成' }}
        </button>

        <!-- Output preview | 输出预览 -->
        <div v-if="outputContent" class="mt-2">
          <div class="flex items-center justify-between mb-1">
            <label class="text-xs text-[var(--text-secondary)]">生成结果</label>
            <button 
              @click="handleCopyOutput"
              class="text-xs text-[var(--text-secondary)] hover:text-purple-500 flex items-center gap-1 transition-colors"
            >
              <n-icon :size="12"><CopyOutline /></n-icon>
              复制
            </button>
          </div>
          <div 
            @wheel.stop 
            @mousedown.stop
            class="bg-[var(--bg-tertiary)] rounded-lg p-2 text-xs text-[var(--text-primary)] max-h-[150px] overflow-y-auto border border-[var(--border-color)]"
          >
            <pre class="whitespace-pre-wrap">{{ outputContent }}</pre>
          </div>
        </div>
      </div>

      <!-- Handles | 连接点 -->
      <Handle type="target" :position="Position.Left" id="left" class="!bg-purple-500" />
      <Handle type="source" :position="Position.Right" id="right" class="!bg-purple-500" />
    </div>

    <!-- Hover action buttons | 悬浮操作按钮 -->
    <div v-show="showActions" class="absolute -top-5 right-12 z-[1000]">
      <button @click="handleDuplicate"
        class="action-btn group p-2 bg-white rounded-lg transition-all border border-gray-200 flex items-center gap-0 hover:gap-1.5 w-max">
        <n-icon :size="16" class="text-gray-600">
          <CopyOutline />
        </n-icon>
        <span class="text-xs text-gray-600 max-w-0 overflow-hidden group-hover:max-w-[60px] transition-all duration-200 whitespace-nowrap">复制</span>
      </button>
    </div>
  </div>
</template>

<script setup>
/**
 * LLM Config node component | LLM配置节点组件
 * For text generation tasks like story segmentation
 */
import { ref, watch, computed } from 'vue'
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { NIcon, NSpin, NSelect } from 'naive-ui'
import { TrashOutline, CopyOutline, ChatbubbleOutline, SparklesOutline } from '@vicons/ionicons5'
import { updateNode, removeNode, duplicateNode, nodes, edges } from '../../stores/canvas'
import { useChat, useApiConfig } from '../../hooks'

const props = defineProps({
  id: String,
  data: Object
})

// Vue Flow instance | Vue Flow 实例
const { updateNodeInternals } = useVueFlow()

// API config hook | API 配置 hook
const { isConfigured: isApiConfigured } = useApiConfig()

// Local state | 本地状态
const systemPrompt = ref(props.data?.systemPrompt || '')
const model = ref(props.data?.model || 'gpt-4o-mini')
const outputFormat = ref(props.data?.outputFormat || 'text')
const outputContent = ref(props.data?.outputContent || '')
const isGenerating = ref(false)
const showActions = ref(false)

// Model options | 模型选项
const modelOptions = [
  { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
  { label: 'GPT-4o', value: 'gpt-4o' },
  { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20241022' },
  { label: 'DeepSeek V3', value: 'deepseek-chat' }
]

// Format options | 格式选项
const formatOptions = [
  { label: '纯文本', value: 'text' },
  { label: 'JSON 结构', value: 'json' },
  { label: 'Markdown', value: 'markdown' }
]

// Chat hook | Chat hook
const chatHook = computed(() => {
  return useChat({
    systemPrompt: systemPrompt.value,
    model: model.value
  })
})

// Watch for external data changes | 监听外部数据变化
watch(() => props.data, (newData) => {
  if (newData?.systemPrompt !== undefined) systemPrompt.value = newData.systemPrompt
  if (newData?.model !== undefined) model.value = newData.model
  if (newData?.outputFormat !== undefined) outputFormat.value = newData.outputFormat
  if (newData?.outputContent !== undefined) outputContent.value = newData.outputContent
}, { deep: true })

// Update config in store | 更新存储中的配置
const updateConfig = () => {
  updateNode(props.id, { 
    systemPrompt: systemPrompt.value,
    model: model.value,
    outputFormat: outputFormat.value,
    outputContent: outputContent.value
  })
}

// Get input from connected nodes | 获取连接节点的输入
const getInputFromConnections = () => {
  const incomingEdges = edges.value.filter(e => e.target === props.id)
  const inputs = []
  
  for (const edge of incomingEdges) {
    const sourceNode = nodes.value.find(n => n.id === edge.source)
    if (sourceNode) {
      if (sourceNode.type === 'text' && sourceNode.data?.content) {
        inputs.push(sourceNode.data.content)
      } else if (sourceNode.type === 'llmConfig' && sourceNode.data?.outputContent) {
        inputs.push(sourceNode.data.outputContent)
      }
    }
  }
  
  return inputs.join('\n\n')
}

// Handle generate | 处理生成
const handleGenerate = async () => {
  if (!isApiConfigured.value) {
    window.$message?.warning('请先配置 API Key')
    return
  }

  const input = getInputFromConnections()
  if (!input && !systemPrompt.value) {
    window.$message?.warning('请连接输入节点或设置系统提示词')
    return
  }

  isGenerating.value = true

  try {
    const { send } = useChat({
      systemPrompt: systemPrompt.value,
      model: model.value
    })

    const result = await send(input || '请根据系统提示词生成内容', true)
    
    if (result) {
      outputContent.value = result
      updateNode(props.id, { outputContent: result })
      window.$message?.success('生成完成')
    }
  } catch (err) {
    window.$message?.error(err.message || '生成失败')
  } finally {
    isGenerating.value = false
  }
}

// Handle delete | 处理删除
const handleDelete = () => {
  removeNode(props.id)
}

// Handle duplicate | 处理复制
const handleDuplicate = () => {
  const newNodeId = duplicateNode(props.id)
  window.$message?.success('节点已复制')
  if (newNodeId) {
    setTimeout(() => {
      updateNodeInternals(newNodeId)
    }, 50)
  }
}

// Handle copy output | 处理复制输出
const handleCopyOutput = async () => {
  if (!outputContent.value) return
  try {
    await navigator.clipboard.writeText(outputContent.value)
    window.$message?.success('已复制到剪贴板')
  } catch (err) {
    window.$message?.error('复制失败')
  }
}
</script>

<style scoped>
.llm-node-wrapper {
  padding-right: 50px;
  padding-top: 20px;
  position: relative;
}

.llm-node {
  cursor: default;
  position: relative;
}

.llm-node textarea {
  cursor: text;
}

.llm-node pre {
  cursor: text;
  user-select: text;
  -webkit-user-select: text;
}
</style>
