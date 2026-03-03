<template>
  <!-- Image config node wrapper | 文生图配置节点包裹层 -->
  <div class="image-config-node-wrapper" @mouseenter="showHandleMenu = true" @mouseleave="showHandleMenu = false">
    <!-- Image config node | 文生图配置节点 -->
    <div
      class="image-config-node bg-[var(--bg-secondary)] rounded-xl border min-w-[300px] transition-all duration-200"
      :class="data.selected ? 'border-1 border-blue-500 shadow-lg shadow-blue-500/20' : 'border border-[var(--border-color)]'">
      <!-- Header | 头部 -->
      <div class="flex items-center justify-between px-3 py-2 border-b border-[var(--border-color)]">
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

      <!-- Config options | 配置选项 -->
      <div class="p-3 space-y-3">
        <!-- Model selector | 模型选择 -->
        <div class="flex items-center justify-between">
          <span class="text-xs text-[var(--text-secondary)]">模型</span>
          <n-dropdown :options="modelOptions" @select="handleModelSelect">
            <button class="flex items-center gap-1 text-sm text-[var(--text-primary)] hover:text-[var(--accent-color)]">
              {{ displayModelName }}
              <n-icon :size="12"><ChevronDownOutline /></n-icon>
            </button>
          </n-dropdown>
        </div>

        <!-- Quality selector | 画质选择 -->
        <div v-if="hasQualityOptions" class="flex items-center justify-between">
          <span class="text-xs text-[var(--text-secondary)]">画质</span>
          <n-dropdown :options="qualityOptions" @select="handleQualitySelect">
            <button class="flex items-center gap-1 text-sm text-[var(--text-primary)] hover:text-[var(--accent-color)]">
              {{ displayQuality }}
              <n-icon :size="12"><ChevronForwardOutline /></n-icon>
            </button>
          </n-dropdown>
        </div>

        <!-- Size selector | 尺寸选择 -->
        <div v-if="hasSizeOptions" class="flex items-center justify-between">
          <span class="text-xs text-[var(--text-secondary)]">尺寸</span>
          <div class="flex items-center gap-2">
            <n-dropdown :options="sizeOptions" @select="handleSizeSelect">
              <button
                class="flex items-center gap-1 text-sm text-[var(--text-primary)] hover:text-[var(--accent-color)]">
                {{ displaySize }}
                <n-icon :size="12">
                  <ChevronForwardOutline />
                </n-icon>
              </button>
            </n-dropdown>
          </div>
        </div>

        <!-- Model tips | 模型提示 -->
        <div v-if="currentModelConfig?.tips" class="text-xs text-[var(--text-tertiary)] bg-[var(--bg-tertiary)] rounded px-2 py-1">
          💡 {{ currentModelConfig.tips }}
        </div>

        <!-- Connected inputs indicator | 连接输入指示 -->
        <div
          class="flex items-center gap-2 text-xs text-[var(--text-secondary)] py-1 border-t border-[var(--border-color)]">
          <span class="px-2 py-0.5 rounded-full"
            :class="connectedPrompts.length > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'">
            提示词 {{ connectedPrompts.length > 0 ? `${connectedPrompts.length}个` : '○' }}
          </span>
          <span class="px-2 py-0.5 rounded-full"
            :class="connectedRefImages.length > 0 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'">
            参考图 {{ connectedRefImages.length > 0 ? `${connectedRefImages.length}张` : '○' }}
          </span>
        </div>

        <!-- Generate button | 生成按钮 -->
        <div v-if="hasConnectedImageWithContent" class="flex gap-2">
          <!-- Create new (primary) | 新建节点（主按钮） -->
          <button @click="handleGenerate('new')" :disabled="loading || !isConfigured"
            class="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            <n-spin v-if="loading" :size="14" />
            <template v-else>
              <n-icon :size="14"><AddOutline /></n-icon>
              新建生成
            </template>
          </button>
          <!-- Replace existing (secondary) | 替换现有（次按钮） -->
          <button @click="handleGenerate('replace')" :disabled="loading || !isConfigured"
            class="flex-shrink-0 flex items-center justify-center gap-1 py-2 px-2.5 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--accent-color)] hover:text-[var(--accent-color)] text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            <n-spin v-if="loading" :size="14" />
            <template v-else>
              <n-icon :size="14"><RefreshOutline /></n-icon>
              替换
            </template>
          </button>
        </div>
        <button v-else @click="handleGenerate('auto')" :disabled="loading || !isConfigured"
          class="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          <n-spin v-if="loading" :size="14" />
          <template v-else>
            <span
              class="text-[var(--accent-color)] bg-white rounded-full w-4 h-4 flex items-center justify-center text-xs">◆</span>
            立即生成
          </template>
        </button>

        <!-- Error message | 错误信息 -->
        <div v-if="error" class="text-xs text-red-500 mt-2">
          {{ error.message || '生成失败' }}
        </div>

        <!-- Generated images preview | 生成图片预览 -->
        <!-- <div v-if="generatedImages.length > 0" class="mt-3 space-y-2">
        <div class="text-xs text-[var(--text-secondary)]">生成结果:</div>
        <div class="grid grid-cols-2 gap-2 max-w-[240px]">
          <div 
            v-for="(img, idx) in generatedImages" 
            :key="idx"
            class="aspect-square rounded-lg overflow-hidden bg-[var(--bg-tertiary)] max-w-[110px]"
          >
            <img :src="img.url" class="w-full h-full object-cover" />
          </div>
        </div>
      </div> -->
      </div>

      <!-- Handles | 连接点 -->
      <Handle type="target" :position="Position.Left" id="left" class="!bg-[var(--accent-color)]" />
      <NodeHandleMenu :nodeId="id" nodeType="imageConfig" :visible="showHandleMenu" :operations="operations" @select="handleSelect" />
    </div>

  </div>
</template>

<script setup>
/**
 * Image config node component | 文生图配置节点组件
 * Configuration panel for text-to-image generation with API integration
 */
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { NIcon, NDropdown, NSpin } from 'naive-ui'
import { ChevronDownOutline, ChevronForwardOutline, CopyOutline, TrashOutline, RefreshOutline, AddOutline, ImageOutline, CreateOutline } from '@vicons/ionicons5'
import { useImageGeneration, useApiConfig } from '../../hooks'
import { updateNode, addNode, addEdge, nodes, edges, duplicateNode, removeNode } from '../../stores/canvas'
import NodeHandleMenu from './NodeHandleMenu.vue'
import { useModelStore } from '../../stores/pinia'
import { getModelSizeOptions, getModelQualityOptions, getModelConfig, DEFAULT_IMAGE_MODEL } from '../../stores/models'
import { parseMentions } from '../../hooks/useNodeRef'

// 使用 Pinia store 获取模型选项（根据渠道过滤）
const modelStore = useModelStore()

const props = defineProps({
  id: String,
  data: Object
})

// Vue Flow instance | Vue Flow 实例
const { updateNodeInternals } = useVueFlow()

// API config hook | API 配置 hook
const { isConfigured } = useApiConfig()

// Image generation hook | 图片生成 hook
const { loading, error, images: generatedImages, generate } = useImageGeneration()

// Local state | 本地状态
const showHandleMenu = ref(false)
const localModel = ref(props.data?.model || DEFAULT_IMAGE_MODEL)
const localSize = ref(props.data?.size || '2048x2048')
const localQuality = ref(props.data?.quality || 'standard')

// Label editing state | Label 编辑状态
const isEditingLabel = ref(false)
const editingLabelValue = ref('')
const labelInputRef = ref(null)

// ImageConfig node menu operations | 图片配置节点菜单操作
const operations = [
  // { type: 'imageConfig', label: '图生图', icon: ImageOutline, action: 'imageConfig_imageConfig' }
]

// Handle menu select | 处理菜单选择
const handleSelect = (item) => {
  const action = item.action

  if (action === 'imageConfig_imageConfig') {
    // Image-to-image (create new image node for editing) | 图生图（创建新图片节点用于编辑）
    const currentNode = nodes.value.find(n => n.id === props.id)
    const nodeX = currentNode?.position?.x || 0
    const nodeY = currentNode?.position?.y || 0

    // Create new image node for editing
    const imageNodeId = addNode('image', { x: nodeX + 400, y: nodeY }, {
      label: '图片编辑'
    })

    // Connect current config to new image node
    addEdge({
      source: props.id,
      target: imageNodeId,
      sourceHandle: 'right',
      targetHandle: 'left'
    })

    setTimeout(() => updateNodeInternals(imageNodeId), 50)
    window.$message?.success('已创建图片编辑节点')
  }
}

// Get current model config | 获取当前模型配置
const currentModelConfig = computed(() => getModelConfig(localModel.value))

// Model options from Pinia store (filtered by provider) | 从 Pinia store 获取模型选项（根据渠道过滤）
const modelOptions = computed(() => modelStore.allImageModelOptions)

// Display model name | 显示模型名称
const displayModelName = computed(() => {
  const model = modelOptions.value.find(m => m.key === localModel.value)
  // 如果当前模型不在选项中，尝试从 allImageModels 找到
  if (!model) {
    const allModel = modelStore.allImageModels.find(m => m.key === localModel.value)
    return allModel?.label || localModel.value || '选择模型'
  }
  return model?.label || localModel.value || '选择模型'
})

// Quality options based on model | 基于模型的画质选项
const qualityOptions = computed(() => {
  return getModelQualityOptions(localModel.value)
})

// Check if model has quality options | 检查模型是否有画质选项
const hasQualityOptions = computed(() => {
  return qualityOptions.value && qualityOptions.value.length > 0
})

// Display quality | 显示画质
const displayQuality = computed(() => {
  const option = qualityOptions.value.find(o => o.key === localQuality.value)
  return option?.label || '标准画质'
})

// Size options based on model and quality | 基于模型和画质的尺寸选项
const sizeOptions = computed(() => {
  return getModelSizeOptions(localModel.value, localQuality.value)
})

// Check if model has size options | 检查模型是否有尺寸选项
const hasSizeOptions = computed(() => {
  const config = getModelConfig(localModel.value)
  return config?.sizes && config.sizes.length > 0
})

// Display size with label | 显示尺寸（带标签）
const displaySize = computed(() => {
  const option = sizeOptions.value.find(o => o.key === localSize.value)
  return option?.label || localSize.value
})

// Initialize on mount | 挂载时初始化
onMounted(() => {
  // 检查当前模型是否在可用模型列表中
  const availableModels = modelStore.availableImageModels
  const isModelAvailable = availableModels.some(m => m.key === localModel.value)

  if (!localModel.value || !isModelAvailable) {
    // 使用 store 中的默认模型或第一个可用模型
    localModel.value = modelStore.selectedImageModel || availableModels[0]?.key || DEFAULT_IMAGE_MODEL
    updateNode(props.id, { model: localModel.value })
  }
})

// 解析 textNode 内容中的 @ 引用，转换为简短引用（如 图 1）并收集图片
const resolveTextMentionsForImage = (textNode) => {
  const content = textNode.data?.content || ''
  const mentions = parseMentions(content)

  if (mentions.length === 0) {
    return { resolvedContent: content, refImages: [] }
  }

  // 收集引用的图片节点
  const imageMentions = []
  for (const mention of mentions) {
    const referencedNode = nodes.value.find(n => n.id === mention.nodeId)
    if (referencedNode?.type === 'image') {
      const imageData = referencedNode.data?.base64 || referencedNode.data?.url
      if (imageData) {
        imageMentions.push({
          order: mention.order,
          nodeId: mention.nodeId,
          imageData
        })
      }
    }
  }

  if (imageMentions.length === 0) {
    return { resolvedContent: content, refImages: [] }
  }

  // 按出现顺序排序
  imageMentions.sort((a, b) => a.order - b.order)

  // 替换 @[nodeId] 为按顺序的 "图1"、"图2" 等
  let resolvedContent = content
  for (let i = 0; i < imageMentions.length; i++) {
    const mention = imageMentions[i]
    const placeholder = `@[${mention.nodeId}]`
    // 按排序后的索引替换为 "图1"、"图2" 等
    resolvedContent = resolvedContent.replace(placeholder, `图${i + 1}`)
  }

  // 返回解析后的内容和图片数组（按引用顺序）
  const refImages = imageMentions.map(m => m.imageData)

  return { resolvedContent, refImages }
}

// Computed connected prompts (sorted by order) | 计算连接的提示词（按顺序排列）
const connectedPrompts = computed(() => {
  return getConnectedInputs().prompts
})

// Computed connected reference images | 计算连接的参考图
const connectedRefImages = computed(() => {
  return getConnectedInputs().refImages
})

// 已连接的文本节点 ID 列表（用于 @ 提及时过滤）
const connectedTextNodeIds = computed(() => {
  const incomingEdges = edges.value.filter(e => e.target === props.id)
  const connectedIds = []
  for (const edge of incomingEdges) {
    const sourceNode = nodes.value.find(n => n.id === edge.source)
    if (sourceNode?.type === 'text') {
      connectedIds.push(sourceNode.id)
    }
  }
  return connectedIds
})

// Get connected nodes | 获取连接的节点
const getConnectedInputs = () => {
  // 1. First check @ mentions | 首先检查 @ 引用
  // Only check connected TextNodes | 只检查已连接的 TextNode
  const textNodes = nodes.value.filter(n => n.type === 'text' && connectedTextNodeIds.value.includes(n.id))
  const mentionsPrompts = []
  const mentionsRefImages = []

  for (const textNode of textNodes) {
    const { resolvedContent, refImages: nodeRefImages } = resolveTextMentionsForImage(textNode)

    // 如果有解析出图片引用
    if (nodeRefImages.length > 0) {
      // 添加解析后的提示词内容
      mentionsPrompts.push({
        order: mentionsPrompts.length,
        content: resolvedContent,
        nodeId: textNode.id
      })

      // 添加参考图
      for (const imageData of nodeRefImages) {
        mentionsRefImages.push({
          order: mentionsRefImages.length,
          imageData,
          nodeId: textNode.id
        })
      }
    }
  }

  // 2. Get edge-connected ImageNodes | 获取边连接的 ImageNode
  const connectedEdges = edges.value.filter(e => e.target === props.id)
  const edgeRefImages = [] // Array of { order, imageData, nodeId } | 参考图数组

  for (const edge of connectedEdges) {
    const sourceNode = nodes.value.find(n => n.id === edge.source)
    if (!sourceNode) continue

    if (sourceNode.type === 'image') {
      // Prefer base64, fallback to url | 优先使用 base64，回退到 url
      const imageData = sourceNode.data?.base64 || sourceNode.data?.url
      if (imageData) {
        // Get order from edge data, default to 1 | 从边数据获取顺序，默认为1
        // Add offset of @ mentions count | 加上 @ 提及图片数量的偏移
        const baseOrder = edge.data?.imageOrder || 1
        const order = mentionsRefImages.length + baseOrder
        edgeRefImages.push({ order, imageData, nodeId: sourceNode.id })
      }
    }
  }

  // 3. Merge and sort refImages | 合并并排序参考图
  // Combine @ mentions refImages and edge-connected refImages | 合并 @ 提及和边连接的图片
  const allRefImages = [...mentionsRefImages, ...edgeRefImages]
  // Sort by order | 按顺序排序
  allRefImages.sort((a, b) => a.order - b.order)
  const sortedRefImages = allRefImages.map(r => r.imageData)

  // 4. If there are @ mentions, use them | 如果有 @ 提及，使用它们
  if (mentionsPrompts.length > 0) {
    // Sort prompts by order | 按顺序排序提示词
    mentionsPrompts.sort((a, b) => a.order - b.order)
    const combinedPrompt = mentionsPrompts.map(p => p.content).join('\n\n')

    return {
      prompt: combinedPrompt,
      prompts: mentionsPrompts,
      refImages: sortedRefImages,
      refImagesWithOrder: allRefImages,
      fromMentions: true
    }
  }

  // 5. Fallback to edge connections | 降级到边的连接
  // (only prompts, no @ mentions) （只有提示词，没有 @ 提及）
  const prompts = [] // Array of { order, content } | 提示词数组

  for (const edge of connectedEdges) {
    const sourceNode = nodes.value.find(n => n.id === edge.source)
    if (!sourceNode) continue

    if (sourceNode.type === 'text') {
      const content = sourceNode.data?.content || ''
      if (content) {
        // Get order from edge data, default to 1 | 从边数据获取顺序，默认为1
        const order = edge.data?.promptOrder || 1
        prompts.push({ order, content, nodeId: sourceNode.id })
      }
    } else if (sourceNode.type === 'llmConfig') {
      // LLM node output as prompt | LLM 节点输出作为提示词
      const content = sourceNode.data?.outputContent || ''
      if (content) {
        const order = edge.data?.promptOrder || 1
        prompts.push({ order, content, nodeId: sourceNode.id })
      }
    }
    // Note: ImageNode handling moved to step 2 above | 注意：ImageNode 处理已移至步骤 2
  }

  // Sort prompts by order and concatenate | 按顺序排序并拼接
  prompts.sort((a, b) => a.order - b.order)
  const combinedPrompt = prompts.map(p => p.content).join('\n\n')

  // Use edge-connected refImages (already sorted above) | 使用边连接的参考图（已在上面排序）
  return { prompt: combinedPrompt, prompts, refImages: sortedRefImages, refImagesWithOrder: allRefImages, fromMentions: false }
}

// Handle model selection | 处理模型选择
const handleModelSelect = (key) => {
  localModel.value = key
  const config = getModelConfig(key)

  // 同步 Quality 到模型默认值
  if (config?.defaultParams?.quality) {
    localQuality.value = config.defaultParams.quality
  }

  // 同步 Size 到模型默认值
  const newSizeOptions = getModelSizeOptions(key, localQuality.value)
  let defaultSize = config?.defaultParams?.size

  if (!defaultSize && newSizeOptions.length > 0) {
    // 备用逻辑：查找 2048 或最接近的尺寸
    defaultSize = newSizeOptions.find(o => o.key === '2048x2048')?.key
      || newSizeOptions.find(o => o.key.includes('1024'))?.key
      || newSizeOptions[0].key
  }

  localSize.value = defaultSize

  // 更新节点数据
  updateNode(props.id, {
    model: key,
    quality: localQuality.value,
    size: defaultSize
  })
}

// Handle quality selection | 处理画质选择
const handleQualitySelect = (quality) => {
  localQuality.value = quality
  // Update size to first option of new quality | 更新尺寸为新画质的第一个选项
  const newSizeOptions = getModelSizeOptions(localModel.value, quality)
  if (newSizeOptions.length > 0) {
    const defaultSize = quality === '4k' ? newSizeOptions.find(o => o.key.includes('4096'))?.key || newSizeOptions[4]?.key : newSizeOptions[4]?.key
    localSize.value = defaultSize || newSizeOptions[0].key
    updateNode(props.id, { quality, size: localSize.value })
  } else {
    updateNode(props.id, { quality })
  }
}

// Handle size selection | 处理尺寸选择
const handleSizeSelect = (size) => {
  localSize.value = size
  updateNode(props.id, { size })
}

// Update size from manual input | 更新手动输入的尺寸
const updateSize = () => {
  updateNode(props.id, { size: localSize.value })
}

// Created image node ID | 创建的图片节点 ID
const createdImageNodeId = ref(null)

// Find connected output image node | 查找已连接的输出图片节点
const findConnectedOutputImageNode = (onlyEmpty = true) => {
  // Find edges where this node is the source | 查找以当前节点为源的边
  const outputEdges = edges.value.filter(e => e.source === props.id)
  
  for (const edge of outputEdges) {
    const targetNode = nodes.value.find(n => n.id === edge.target)
    if (targetNode?.type === 'image') {
      if (onlyEmpty) {
        // Check if target is an image node with empty or no url | 检查目标是否为空白图片节点
        if (!targetNode.data?.url || targetNode.data?.url === '') {
          return targetNode.id
        }
      } else {
        // Return any connected image node | 返回任意连接的图片节点
        return targetNode.id
      }
    }
  }
  return null
}

// Check if there's a connected image node with content | 检查是否有已连接且有内容的图片节点
const hasConnectedImageWithContent = computed(() => {
  const outputEdges = edges.value.filter(e => e.source === props.id)
  
  for (const edge of outputEdges) {
    const targetNode = nodes.value.find(n => n.id === edge.target)
    if (targetNode?.type === 'image' && targetNode.data?.url && targetNode.data.url !== '') {
      return true
    }
  }
  return false
})

// Handle generate action | 处理生成操作
// mode: 'auto' = 自动判断, 'replace' = 替换现有, 'new' = 新建节点
const handleGenerate = async (mode = 'auto') => {
  const { prompt, prompts, refImages, refImagesWithOrder } = getConnectedInputs()

  if (!prompt && refImages.length === 0) {
    window.$message?.warning('请连接文本节点（提示词）或图片节点（参考图）')
    return
  }
  
  // Log prompt order for debugging | 记录提示词顺序用于调试
  if (prompts.length > 1) {
    console.log('[ImageConfigNode] 拼接提示词顺序:', prompts.map(p => `${p.order}: ${p.content.substring(0, 20)}...`))
  }
  
  // Log image order for debugging | 记录图片顺序用于调试
  if (refImagesWithOrder && refImagesWithOrder.length > 1) {
    console.log('[ImageConfigNode] 参考图顺序:', refImagesWithOrder.map(r => `${r.order}: ${r.nodeId}`))
  }

  if (!isConfigured.value) {
    window.$message?.warning('请先配置 API Key')
    return
  }

  let imageNodeId = null
  
  if (mode === 'replace') {
    // Replace mode: find any connected image node | 替换模式：查找任意连接的图片节点
    imageNodeId = findConnectedOutputImageNode(false)
    if (imageNodeId) {
      updateNode(imageNodeId, { loading: true, url: '' })
    }
  } else if (mode === 'new') {
    // New mode: always create new node | 新建模式：始终创建新节点
    imageNodeId = null
  } else {
    // Auto mode: check for empty connected node first | 自动模式：先检查空白连接节点
    imageNodeId = findConnectedOutputImageNode(true)
    if (imageNodeId) {
      updateNode(imageNodeId, { loading: true })
    }
  }
  
  if (!imageNodeId) {
    // Get current node position | 获取当前节点位置
    const currentNode = nodes.value.find(n => n.id === props.id)
    const nodeX = currentNode?.position?.x || 0
    const nodeY = currentNode?.position?.y || 0
    
    // Calculate Y offset if creating new node alongside existing | 如果是新建节点，计算Y偏移
    let yOffset = 0
    if (mode === 'new') {
      const outputEdges = edges.value.filter(e => e.source === props.id)
      yOffset = outputEdges.length * 280 // Stack below existing outputs | 在现有输出下方堆叠
    }

    // Create image node with loading state | 创建带加载状态的图片节点
    imageNodeId = addNode('image', { x: nodeX + 400, y: nodeY + yOffset }, {
      url: '',
      loading: true,
      label: '图像生成结果'
    })

    // Auto-connect imageConfig → image | 自动连接 生图配置 → 图片
    addEdge({
      source: props.id,
      target: imageNodeId,
      sourceHandle: 'right',
      targetHandle: 'left'
    })
  }
  
  createdImageNodeId.value = imageNodeId

  // Force Vue Flow to recalculate node dimensions | 强制 Vue Flow 重新计算节点尺寸
  setTimeout(() => {
    updateNodeInternals(imageNodeId)
  }, 50)

  try {
    // Build request params | 构建请求参数
    const params = {
      model: localModel.value,
      prompt: prompt,
      size: localSize.value,
      quality: localQuality.value,
      n: 1
    }

    // Add reference image if provided | 如果有参考图则添加
    if (refImages.length > 0) {
      params.image = refImages
    }

    const result = await generate(params)

    // Update image node with generated URL | 更新图片节点 URL
    if (result && result.length > 0) {
      updateNode(imageNodeId, {
        url: result[0].url,
        loading: false,
        label: '文生图',
        model: localModel.value,
        updatedAt: Date.now()
      })
      
      // Mark this config node as executed | 标记配置节点已执行
      updateNode(props.id, { executed: true, outputNodeId: imageNodeId })
    }
    window.$message?.success('图片生成成功')
  } catch (err) {
    // Update node to show error | 更新节点显示错误
    updateNode(imageNodeId, {
      loading: false,
      error: err.message || '生成失败',
      updatedAt: Date.now()
    })
    window.$message?.error(err.message || '图片生成失败')
  }
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
  window.$message?.success('节点已删除')
}

// 监听模型变化，同步 Quality 和 Size
watch(() => props.data?.model, (newModel) => {
  if (newModel && newModel !== localModel.value) {
    localModel.value = newModel
    const config = getModelConfig(newModel)

    // 同步 Quality
    if (config?.defaultParams?.quality) {
      localQuality.value = config.defaultParams.quality
    }

    // 同步 Size
    if (config?.defaultParams?.size) {
      localSize.value = config.defaultParams.size
    }
  }
})

// 修复 Vue Flow visibility: hidden 问题
watch(() => props.data, () => {
  nextTick(() => {
    updateNodeInternals(props.id)
  })
}, { deep: true })

// Watch for auto-execute flag | 监听自动执行标志
watch(
  () => props.data?.autoExecute,
  (shouldExecute) => {
    if (shouldExecute && !loading.value) {
      // Clear the flag first to prevent re-triggering | 先清除标志防止重复触发
      updateNode(props.id, { autoExecute: false })
      // Delay to ensure node connections are established | 延迟确保节点连接已建立
      setTimeout(() => {
        handleGenerate()
      }, 100)
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.image-config-node-wrapper {
  position: relative;
  padding-top: 20px;
}

.image-config-node {
  cursor: default;
  position: relative;
}
</style>
