<template>
  <!-- Video node wrapper | 视频节点包裹层 -->
  <div class="video-node-wrapper relative" @mouseenter="showActions = true; showHandleMenu = true" @mouseleave="showActions = false; showHandleMenu = false">
    <!-- Video node | 视频节点 -->
    <div 
      class="video-node bg-[var(--bg-secondary)] rounded-xl border w-[400px] relative transition-all duration-200"
      :class="data.selected ? 'border-1 border-blue-500 shadow-lg shadow-blue-500/20' : 'border border-[var(--border-color)]'"
      
    >
    <!-- Header | 头部 -->
    <div class="px-3 py-2 border-b border-[var(--border-color)]">
      <div class="flex items-center justify-between">
        <span
          v-if="!isEditingLabel"
          @dblclick="startEditLabel"
          class="text-sm font-medium text-[var(--text-secondary)] cursor-text hover:bg-[var(--bg-tertiary)] px-1 rounded transition-colors"
          title="双击编辑名称"
        >{{ data.label }}</span>
        <input
          v-else
          ref="labelInputRef"
          v-model="editingLabelValue"
          @blur="finishEditLabel"
          @keydown.enter="finishEditLabel"
          @keydown.escape="cancelEditLabel"
          class="text-sm font-medium bg-[var(--bg-tertiary)] text-[var(--text-secondary)] px-1 rounded outline-none border border-blue-500"
        />
        <div class="flex items-center gap-1">
          <button @click="handleDuplicate" class="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors" title="复制节点">
            <n-icon :size="14">
              <CopyOutline />
            </n-icon>
          </button>
          <button @click="handleDelete" class="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors" title="删除节点">
            <n-icon :size="14">
              <TrashOutline />
            </n-icon>
          </button>
        </div>
      </div>
      <!-- Model name | 模型名称 -->
      <div v-if="data.model" class="mt-1 text-xs text-[var(--text-secondary)] truncate">
        {{ data.model }}
      </div>
    </div>
    
    <!-- Video preview area | 视频预览区域 -->
    <div class="p-3">
      <!-- Loading state | 加载状态 -->
      <div 
        v-if="(data.taskId && !data.url) || (data.loading && !data.taskId)"
        class="aspect-video rounded-lg bg-gradient-to-br from-cyan-400 via-blue-300 to-amber-200 flex flex-col items-center justify-center gap-3 relative overflow-hidden"
      >
        <!-- Animated gradient overlay | 动画渐变遮罩 -->
        <div class="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-blue-400/20 to-amber-300/20 animate-pulse"></div>

        <!-- Loading image | 加载图片 -->
        <div class="relative z-10">
          <img
            src="../../assets/loading.webp"
            alt="Loading"
            class="w-14 h-12"
          />
        </div>

        <span class="text-sm text-white font-medium relative z-10">{{ data.taskId ? '创作中，预计等待 1 分钟' : '任务创建中...' }}</span>
      </div>
      <!-- Error state | 错误状态 -->
      <div 
        v-else-if="data.error"
        class="aspect-video rounded-lg bg-red-50 dark:bg-red-900/20 flex flex-col items-center justify-center gap-2 border border-red-200 dark:border-red-800"
      >
        <n-icon :size="32" class="text-red-500"><CloseCircleOutline /></n-icon>
        <span class="text-sm text-red-500">{{ data.error }}</span>
      </div>
      <!-- Video preview | 视频预览 -->
      <div 
        v-else-if="data.url"
        class="aspect-video rounded-lg overflow-hidden bg-black"
      >
        <video 
          :src="data.url" 
          controls 
          class="w-full h-full object-contain"
        />
      </div>
      <!-- Empty state | 空状态 -->
      <div 
        v-else
        class="aspect-video rounded-lg bg-[var(--bg-tertiary)] flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[var(--border-color)] relative"
      >
        <n-icon :size="32" class="text-[var(--text-secondary)]"><VideocamOutline /></n-icon>
        <span class="text-sm text-[var(--text-secondary)]">拖放视频或点击上传</span>
        <input 
          type="file" 
          accept="video/*" 
          class="absolute inset-0 opacity-0 cursor-pointer"
          @change="handleFileUpload"
        />
      </div>
      
      <!-- Duration info | 时长信息 -->
      <div v-if="data.duration" class="mt-2 text-xs text-[var(--text-secondary)]">
        时长: {{ formatDuration(data.duration) }}
      </div>
    </div>

    <!-- Handles | 连接点 -->
    <NodeHandleMenu :nodeId="id" nodeType="video" :visible="showHandleMenu" :operations="operations" @select="handleSelect" />
    <Handle type="target" :position="Position.Left" id="left" class="!bg-[var(--accent-color)]" />
    </div>

    <!-- Right side - Action buttons | 右侧 - 操作按钮 -->
    <div 
      v-show="showActions && data.url"
      class="absolute right-10 top-20 -translate-y-1/2 translate-x-full flex flex-col gap-2 z-[1000]"
    >
      <!-- Preview button | 预览按钮 -->
      <button 
        @click="handlePreview"
        class="action-btn group p-2 bg-white rounded-lg transition-all border border-gray-200 flex items-center gap-0 hover:gap-1.5 w-max"
      >
        <n-icon :size="16" class="text-gray-600"><EyeOutline /></n-icon>
        <span class="text-xs text-gray-600 max-w-0 overflow-hidden group-hover:max-w-[80px] transition-all duration-200 whitespace-nowrap">预览</span>
      </button>
      <!-- Download button | 下载按钮 -->
      <button 
        @click="handleDownload"
        class="action-btn group p-2 bg-white rounded-lg transition-all border border-gray-200 flex items-center gap-0 hover:gap-1.5 w-max"
      >
        <n-icon :size="16" class="text-gray-600"><DownloadOutline /></n-icon>
        <span class="text-xs text-gray-600 max-w-0 overflow-hidden group-hover:max-w-[80px] transition-all duration-200 whitespace-nowrap">下载</span>
      </button>
    </div>
  </div>
</template>

<script setup>
/**
 * Video node component | 视频节点组件
 * Displays and manages video content
 */
import { ref, nextTick, watch, onMounted } from 'vue'
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { NIcon, NSpin } from 'naive-ui'
import { TrashOutline, ExpandOutline, VideocamOutline, CopyOutline, CloseCircleOutline, DownloadOutline, EyeOutline, CreateOutline } from '@vicons/ionicons5'
import { updateNode, removeNode, duplicateNode, addNode, addEdge, nodes } from '../../stores/canvas'
import { useVideoGeneration } from '../../hooks/useApi'
import NodeHandleMenu from './NodeHandleMenu.vue'

const props = defineProps({
  id: String,
  data: Object
})

// Vue Flow instance
const { updateNodeInternals } = useVueFlow()

// Get pollVideoTask from useVideoGeneration | 从 useVideoGeneration 获取轮询函数
const { pollVideoTask } = useVideoGeneration()

// Hover state | 悬浮状态
const showActions = ref(false)
const showHandleMenu = ref(false)

// Label editing state | Label 编辑状态
const isEditingLabel = ref(false)
const editingLabelValue = ref('')
const labelInputRef = ref(null)

// Video node menu operations | 视频节点菜单操作
const operations = [
  { type: 'videoConfig', label: '生视频', icon: VideocamOutline }
]

// Polling state | 轮询状态
const isPolling = ref(false)

// Watch for taskId changes and start polling | 监听 taskId 变化并开始轮询
watch(() => props.data?.taskId, (taskId) => {
  if (taskId && !props.data?.url && !isPolling.value) {
    startPolling(taskId)
  }
})

// 页面刷新后恢复轮询 | Resume polling after page refresh
onMounted(() => {
  const { taskId, url } = props.data || {}
  if (taskId && !url && !isPolling.value) {
    startPolling(taskId)
  }
})

// Start polling for video result | 开始轮询获取视频结果
const startPolling = async (taskId) => {
  if (isPolling.value) return

  isPolling.value = true

  try {
    const result = await pollVideoTask(taskId, (attempt, percentage) => {
      // 更新进度
      updateNode(props.id, {
        progress: percentage,
        attempt
      })
    })
    // 轮询成功，更新视频节点
    updateNode(props.id, {
      url: result.url,
      loading: false,
      progress: 100,
      label: '视频生成',
      taskId: null  // 清除 taskId
    })
    window.$message?.success('视频生成成功')
  } catch (err) {
    // 轮询失败
    updateNode(props.id, {
      loading: false,
      error: err.message || '生成失败',
      label: '生成失败',
      taskId: null  // 清除 taskId
    })
    window.$message?.error(err.message || '视频生成失败')
  } finally {
    isPolling.value = false
  }
}

// Handle menu select | 处理菜单选择
const handleSelect = (item) => {
  const currentNode = nodes.value.find(n => n.id === props.id)
  const nodeX = currentNode?.position?.x || 0
  const nodeY = currentNode?.position?.y || 0

  const newId = addNode('videoConfig', { x: nodeX + 400, y: nodeY }, { label: '视频生成' })

  addEdge({
    source: props.id,
    target: newId,
    sourceHandle: 'right',
    targetHandle: 'left'
  })

  setTimeout(() => {
    updateNodeInternals(newId)
  }, 50)
  window.$message?.success(`已创建视频生成节点`)
}

// Handle file upload | 处理文件上传
const handleFileUpload = (event) => {
  const file = event.target.files[0]
  if (file) {
    const url = URL.createObjectURL(file)
    updateNode(props.id, { 
      url,
      updatedAt: Date.now()
    })
  }
}

// Format duration | 格式化时长
const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Start editing label | 开始编辑 label
const startEditLabel = () => {
  editingLabelValue.value = props.data?.label || ''
  isEditingLabel.value = true
  nextTick(() => {
    labelInputRef.value?.focus()
    labelInputRef.value?.select()
  })
}

// Finish editing label | 完成编辑 label
const finishEditLabel = () => {
  const newLabel = editingLabelValue.value.trim()
  if (newLabel && newLabel !== props.data?.label) {
    updateNode(props.id, { label: newLabel })
  }
  isEditingLabel.value = false
}

// Cancel editing label | 取消编辑 label
const cancelEditLabel = () => {
  isEditingLabel.value = false
}

// Handle delete | 处理删除
const handleDelete = () => {
  removeNode(props.id)
}

// Handle preview | 处理预览
const handlePreview = () => {
  if (props.data.url) {
    window.open(props.data.url, '_blank')
  }
}

// Handle download | 处理下载
const handleDownload = () => {
  if (props.data.url) {
    const link = document.createElement('a')
    link.href = props.data.url
    link.download = props.data.fileName || `video_${Date.now()}.mp4`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.$message?.success('视频下载中...')
  }
}

// Handle duplicate | 处理复制
const handleDuplicate = () => {
  const newId = duplicateNode(props.id)
  if (newId) {
    // Clear selection and select the new node | 清除选中并选中新节点
    updateNode(props.id, { selected: false })
    updateNode(newId, { selected: true })
    window.$message?.success('节点已复制')
  }
}
</script>

<style scoped>
.video-node-wrapper {
  padding-right: 50px;
  padding-top: 20px;
}

.video-node {
  cursor: default;
}
</style>
