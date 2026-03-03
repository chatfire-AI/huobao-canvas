<template>
  <!-- LLM Config node wrapper | LLM配置节点包裹层 -->
  <div class="llm-node-wrapper" @mouseenter="showHandleMenu = true" @mouseleave="showHandleMenu = false">
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
          <span
            v-if="!isEditingLabel"
            @dblclick="startEditLabel"
            class="text-sm font-medium text-[var(--text-secondary)] cursor-text hover:bg-[var(--bg-tertiary)] px-1 rounded transition-colors"
            title="双击编辑名称"
          >{{ nodeLabel }}</span>
          <input
            v-else
            ref="labelInputRef"
            v-model="editingLabelValue"
            @blur="finishEditLabel"
            @keydown.enter="finishEditLabel"
            @keydown.escape="cancelEditLabel"
            class="text-sm font-medium bg-[var(--bg-tertiary)] text-[var(--text-secondary)] px-1 rounded outline-none border border-purple-500"
          />
        </div>
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

      <!-- Config content | 配置内容 -->
      <div class="p-3 space-y-3">
        <!-- System prompt | 系统提示词 -->
        <div class="relative">
          <label class="text-xs text-[var(--text-secondary)] mb-1 block">系统提示词</label>
          <div class="textarea-wrapper" ref="textareaWrapper">
            <div
              ref="systemPromptRef"
              class="editor-content"
              contenteditable="true"
              @input="handleInput"
              @keydown="handleKeydown"
              @paste="handlePaste"
              @blur="handleBlur"
              @wheel.stop
              @mousedown.stop
              :data-placeholder="placeholder"
            ></div>
          </div>
          <!-- @ 提及预览 -->
          <!-- <div class="mentions-preview mt-1 flex flex-wrap gap-1" v-if="mentionsPreview.length > 0">
            <div
              v-for="(mention, index) in mentionsPreview"
              :key="index"
              class="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs rounded"
            >
              <span>@{{ mention.name }}</span>
              <button @click="removeMention(mention.nodeId)" class="hover:text-purple-800">×</button>
            </div>
          </div> -->
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

          <!-- Split actions | 拆分操作 -->
          <div class="mt-2 flex gap-2">
            <button
              @click="handleSplitToTextWithImage"
              :disabled="isSplitting"
              class="flex-1 px-3 py-1.5 text-xs rounded-lg border border-purple-400 text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
            >
              <n-spin v-if="isSplitting" :size="12" />
              <n-icon v-else :size="12"><ImageOutline /></n-icon>
              {{ isSplitting ? '拆分中...' : '拆分图文' }}
            </button>
            <button
              @click="handleSplitToTextOnly"
              :disabled="isSplitting"
              class="flex-1 px-3 py-1.5 text-xs rounded-lg border border-purple-400 text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
            >
              <n-spin v-if="isSplitting" :size="12" />
              <n-icon v-else :size="12"><ListOutline /></n-icon>
              {{ isSplitting ? '拆分中...' : '拆分文本' }}
            </button>
          </div>
          <div v-if="splitMessage" class="mt-1 text-xs text-green-600 dark:text-green-400">{{ splitMessage }}</div>
        </div>
      </div>

      <!-- Handles | 连接点 -->
      <Handle type="target" :position="Position.Left" id="left" class="!bg-purple-500" />
      <NodeHandleMenu :nodeId="id" nodeType="llmConfig" dotColor="#a855f7" :visible="showHandleMenu" :operations="operations" @select="handleSelect" />
    </div>
  </div>

  <!-- Mentions picker | @ 选择器 -->
  <MentionsPicker
    v-model:visible="showMentionsPicker"
    :position="mentionsPosition"
    context="llmConfig"
    :showSearch="false"
    :connectedNodeIds="hasConnectedNodes ? connectedTextNodeIds : []"
    @select="handleMentionSelect"
  />
</template>

<script setup>
/**
 * LLM Config node component | LLM配置节点组件
 * For text generation tasks like story segmentation
 */
import { ref, watch, computed, nextTick, onMounted } from 'vue'
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { NIcon, NSpin, NSelect } from 'naive-ui'
import { TrashOutline, CopyOutline, ChatbubbleOutline, SparklesOutline, ListOutline, ImageOutline, VideocamOutline, DocumentTextOutline } from '@vicons/ionicons5'
import { updateNode, removeNode, duplicateNode, addNode, addEdge, addNodes, addEdges, nodes, edges, startBatchOperation, endBatchOperation } from '../../stores/canvas'
import NodeHandleMenu from './NodeHandleMenu.vue'
import MentionsPicker from '../MentionsPicker.vue'
import { useChat, useApiConfig } from '../../hooks'
import { useModelStore } from '../../stores/pinia'
import { parseMentions, removeMention as removeMentionUtil } from '../../hooks/useNodeRef'

const props = defineProps({
  id: String,
  data: Object
})

// Vue Flow instance | Vue Flow 实例
const { updateNodeInternals } = useVueFlow()

// API config hook | API 配置 hook
const { isConfigured: isApiConfigured } = useApiConfig()

// Local state | 本地状态
const showHandleMenu = ref(false)
const systemPrompt = ref(props.data?.systemPrompt || '')
const systemPromptRef = ref(null)
const textareaWrapper = ref(null)
const placeholder = '设定 AI 的角色和行为规则，输入 @ 可引用文本节点...'
const lastContent = ref('')  // 上一次的内容，用于检测变化

// Label editing state | Label 编辑状态
const isEditingLabel = ref(false)
const editingLabelValue = ref('')
const labelInputRef = ref(null)

// Computed node label | 计算节点标签
const nodeLabel = computed(() => props.data?.label || 'LLM 文本生成')

// Mentions picker state | @ 选择器状态
const showMentionsPicker = ref(false)
const mentionsPosition = ref({ x: 0, y: 0 })
const mentionSearchStart = ref(-1)

// 内部更新标志
let isInternalUpdate = false

// ============ 参考 TextNode 的 contenteditable 逻辑 ============

// 从 contenteditable 中提取纯文本
const getEditableText = () => {
  const el = systemPromptRef.value
  if (!el) return ''
  let text = ''
  const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.classList?.contains('mention-chip')) {
        text += `@[${node.dataset.nodeId}]`
      } else if (node.tagName === 'BR') {
        text += '\n'
      } else {
        node.childNodes.forEach(walk)
      }
    }
  }
  el.childNodes.forEach(walk)
  return text
}

// 创建 mention chip 元素
const createMentionChip = (node) => {
  const chip = document.createElement('span')
  chip.className = 'mention-chip'
  chip.contentEditable = 'false'
  chip.dataset.nodeId = node.id
  chip.dataset.label = node.data?.label || node.data?.content?.slice(0, 20) || '文本'

  const iconWrap = document.createElement('span')
  iconWrap.className = 'mention-chip-icon'
  iconWrap.textContent = '📝'
  chip.appendChild(iconWrap)

  const label = document.createElement('span')
  label.className = 'mention-chip-label'
  label.textContent = chip.dataset.label
  chip.appendChild(label)

  return chip
}

// 在 contenteditable 中插入 mention chip（替换 @searchText）
const insertMentionChipDOM = (node) => {
  const el = systemPromptRef.value
  if (!el) return

  // 遍历文本节点，找到最后一个 @
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  let lastAtNode = null
  let lastAtOffset = -1

  while (walker.nextNode()) {
    const idx = walker.currentNode.textContent.lastIndexOf('@')
    if (idx !== -1) {
      lastAtNode = walker.currentNode
      lastAtOffset = idx
    }
  }

  if (!lastAtNode || lastAtOffset === -1) return

  const chip = createMentionChip(node)
  const spaceNode = document.createTextNode('\u00A0')
  const beforeText = lastAtNode.textContent.substring(0, lastAtOffset)

  if (beforeText) {
    lastAtNode.textContent = beforeText
    lastAtNode.parentNode.insertBefore(chip, lastAtNode.nextSibling)
    lastAtNode.parentNode.insertBefore(spaceNode, chip.nextSibling)
  } else {
    const parent = lastAtNode.parentNode
    parent.insertBefore(chip, lastAtNode)
    parent.insertBefore(spaceNode, chip.nextSibling)
    parent.removeChild(lastAtNode)
  }

  // 光标移到空格之后
  const range = document.createRange()
  range.setStartAfter(spaceNode)
  range.collapse(true)
  const sel = window.getSelection()
  sel.removeAllRanges()
  sel.addRange(range)

  // 同步文本
  isInternalUpdate = true
  systemPrompt.value = getEditableText()
  lastContent.value = systemPrompt.value
  nextTick(() => { isInternalUpdate = false })
}

// 设置 contenteditable 内容（纯文本）
const setEditableContent = (text) => {
  if (!systemPromptRef.value) return
  systemPromptRef.value.innerHTML = ''
  if (text) {
    // 将 @[nodeId] 格式转换为纯文本显示
    systemPromptRef.value.textContent = text
  }
}

// 扫描 contenteditable 文本节点，将 @label 自动转为 chip
const convertTextMentionsToChips = () => {
  const el = systemPromptRef.value
  if (!el) return

  // 获取所有可引用的文本节点
  const textNodes = nodes.value.filter(n => n.type === 'text' && n.data?.content)
  if (textNodes.length === 0) return

  // 快速检查：无 @ 直接跳过
  if (!el.textContent.includes('@')) return

  // 构建正则，匹配 @[nodeId] 格式
  const pattern = /@\[([^\]|]+)(?:\|([^\]]+))?\]/g

  // 收集需要替换的文本节点（跳过 chip 内部）
  const targets = []
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) {
    const node = walker.currentNode
    if (node.parentElement?.closest('.mention-chip')) continue
    pattern.lastIndex = 0
    if (pattern.test(node.textContent)) {
      targets.push(node)
    }
  }
  if (targets.length === 0) return

  // 替换文本节点为 chip + 文本片段
  targets.forEach(textNode => {
    const text = textNode.textContent
    pattern.lastIndex = 0
    const fragment = document.createDocumentFragment()
    let lastIdx = 0
    let match

    while ((match = pattern.exec(text)) !== null) {
      if (match.index > lastIdx) {
        fragment.appendChild(document.createTextNode(text.slice(lastIdx, match.index)))
      }
      const nodeId = match[1]
      const node = textNodes.find(n => n.id === nodeId)
      if (node) {
        fragment.appendChild(createMentionChip(node))
        fragment.appendChild(document.createTextNode('\u00A0'))
      } else {
        fragment.appendChild(document.createTextNode(match[0]))
      }
      lastIdx = pattern.lastIndex
    }

    if (lastIdx < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIdx)))
    }

    textNode.parentNode.replaceChild(fragment, textNode)
  })
}

// 防抖版本（用于输入事件，避免频繁 DOM 操作）
let _convertTimer = null
const debouncedConvertMentions = () => {
  if (_convertTimer) clearTimeout(_convertTimer)
  _convertTimer = setTimeout(convertTextMentionsToChips, 300)
}

// Handle paste - 参考 TextNode，纯文本粘贴
const handlePaste = (e) => {
  e.preventDefault()
  const text = e.clipboardData?.getData('text/plain') || ''
  document.execCommand('insertText', false, text)
}

// 已连接的文本节点 ID 列表（用于 @ 选择器过滤）
const connectedTextNodeIds = computed(() => {
  // 获取所有以当前节点为目标的边（输入边）
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

// 是否有连接的节点
const hasConnectedNodes = computed(() => {
  return connectedTextNodeIds.value.length > 0
})

// @ 提及预览列表
const mentionsPreview = computed(() => {
  const mentions = parseMentions(systemPrompt.value)
  const previews = []

  for (const mention of mentions) {
    const node = nodes.value.find(n => n.id === mention.nodeId)
    if (node?.type === 'text') {
      previews.push({
        nodeId: mention.nodeId,
        name: node.data?.label || node.data?.content?.slice(0, 20) || '文本',
        content: node.data?.content || ''
      })
    }
  }

  return previews
})

// LLMConfig node menu operations | LLM配置节点菜单操作
const operations = [
  { type: 'imageConfig', label: '生图', icon: ImageOutline },
  { type: 'videoConfig', label: '生视频', icon: VideocamOutline },
  { type: 'text', label: '文本', icon: DocumentTextOutline }
]

// Handle menu select | 处理菜单选择
const handleSelect = (item) => {
  const currentNode = nodes.value.find(n => n.id === props.id)
  const nodeX = currentNode?.position?.x || 0
  const nodeY = currentNode?.position?.y || 0

  const defaultData = {
    imageConfig: { model: 'doubao-seedream-4-5-251128', size: '2048x2048', label: '文生图' },
    videoConfig: { label: '视频生成' },
    text: { content: '', label: '文本输入' }
  }

  const newId = addNode(item.type, { x: nodeX + 400, y: nodeY }, defaultData[item.type] || {})

  addEdge({
    source: props.id,
    target: newId,
    sourceHandle: 'right',
    targetHandle: 'left'
  })

  setTimeout(() => updateNodeInternals(newId), 50)
  window.$message?.success(`已创建${item.label}节点`)
}

// Handle keydown for mentions | 处理 @ 选择器的键盘事件
const handleKeydown = (e) => {
  // 规范化 Shift+Enter 插入换行
  if (e.key === 'Enter' && e.shiftKey) {
    e.preventDefault()
    document.execCommand('insertLineBreak')
    return
  }

  if (showMentionsPicker.value) {
    if (e.key === 'Escape') {
      e.preventDefault()
      showMentionsPicker.value = false
      // Remove the incomplete @ | 移除不完整的 @
      const editor = systemPromptRef.value
      if (!editor) return

      const selection = window.getSelection()
      if (!selection.rangeCount) return

      const range = selection.getRangeAt(0)
      const cursorPos = range.startOffset
      const textBeforeCursor = systemPrompt.value.slice(0, cursorPos)
      const lastAtIndex = textBeforeCursor.lastIndexOf('@')

      if (lastAtIndex !== -1) {
        systemPrompt.value = textBeforeCursor.slice(0, lastAtIndex) + systemPrompt.value.slice(cursorPos)
        nextTick(() => {
          editor.innerHTML = systemPrompt.value.replace(/\n/g, '<br>')
          // Set cursor position | 设置光标位置
          const newRange = document.createRange()
          newRange.setStart(editor.firstChild || editor, lastAtIndex)
          newRange.collapse(true)
          selection.removeAllRanges()
          selection.addRange(newRange)
        })
      }
    }
    return
  }
}

// Handle mention selection | 处理 @ 引用选择
const handleMentionSelect = ({ nodeId }) => {
  // 插入 mention chip 到 DOM
  const node = nodes.value.find(n => n.id === nodeId)
  if (!node) {
    showMentionsPicker.value = false
    return
  }

  insertMentionChipDOM(node)

  // 更新 store
  updateConfig()
  showMentionsPicker.value = false
}

// Remove mention | 移除提及
const removeMention = (nodeId) => {
  systemPrompt.value = removeMentionUtil(systemPrompt.value, nodeId)
  // 同步到 editor
  setEditableContent(systemPrompt.value)
  nextTick(() => convertTextMentionsToChips())
  updateConfig()
}

// 根据 DOM 光标位置计算纯文本中的位置（考虑 mention-chip 的转换）
const getTextPositionBeforeCursor = (editor, range) => {
  const container = editor
  let textLength = 0
  let found = false

  const walk = (node) => {
    if (found) return

    if (node.nodeType === Node.TEXT_NODE) {
      const nodeLength = node.textContent.length
      if (range.startContainer === node) {
        textLength += range.startOffset
        found = true
        return
      }
      textLength += nodeLength
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.classList?.contains('mention-chip')) {
        // mention-chip 在纯文本中算作 @[nodeId]（约 3-5 个字符）
        const replacement = `@[${node.dataset.nodeId || ''}]`
        if (range.startContainer === node || container.contains(range.startContainer) && isNodeInside(node, range.startContainer)) {
          // 光标在 mention-chip 内部
          found = true
          return
        }
        textLength += replacement.length
      } else if (node.tagName === 'BR') {
        textLength += 1  // 换行符
      } else {
        for (const child of node.childNodes) {
          walk(child)
          if (found) return
        }
      }
    }
  }

  walk(container)
  return textLength
}

// 检查节点是否在父节点内部
const isNodeInside = (parent, child) => {
  let node = child
  while (node) {
    if (node === parent) return true
    node = node.parentNode
  }
  return false
}

// Handle input for @ trigger | 处理 @ 触发输入
const handleInput = (e) => {
  const editor = e.target
  isInternalUpdate = true
  systemPrompt.value = getEditableText()
  lastContent.value = systemPrompt.value
  nextTick(() => { isInternalUpdate = false })

  // 触发文本到 chip 的转换
  debouncedConvertMentions()

  // 获取光标位置
  const selection = window.getSelection()
  if (!selection.rangeCount) return

  const range = selection.getRangeAt(0)
  // 使用辅助函数计算纯文本中的光标位置
  const cursorPos = getTextPositionBeforeCursor(editor, range)
  const fullText = getEditableText()
  const textBeforeCursor = fullText.slice(0, cursorPos)

  // Check if cursor is after @ character | 检查光标是否在 @ 字符后
  const lastAtIndex = textBeforeCursor.lastIndexOf('@')

  if (lastAtIndex !== -1) {
    // Check if there's a space after @ (meaning user finished typing mention) | 检查 @ 后面是否有空格（用户已完成输入）
    const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1)

    // Check if there's a complete @[...] mention - 检查是否有完整的 @[...] 配对
    const bracketMatch = textAfterAt.match(/\[([^\]]*)\]/)
    const hasCompleteMention = bracketMatch !== null

    // Show picker only if: @ exists, no space after @, not part of a complete @[...] mention, and has connected nodes
    // 显示选择器的条件：@ 存在，@ 后没有空格，且不是完整的 @[...] 格式，且有连接线
    if (!textAfterAt.includes(' ') && !hasCompleteMention && hasConnectedNodes.value) {
      // Calculate position | 计算位置
      showMentionsPicker.value = true
      mentionSearchStart.value = lastAtIndex

      // Get editor position | 获取 editor 位置
      const rect = editor.getBoundingClientRect()
      mentionsPosition.value = {
        x: rect.left + 10,
        y: rect.bottom + 5
      }
      return
    }
  }

  // Hide picker if conditions not met | 如果条件不满足，隐藏选择器
  showMentionsPicker.value = false
}

// Handle blur | 处理失去焦点
const handleBlur = () => {
  // Delay hiding picker to allow click event | 延迟隐藏选择器以允许点击事件
  setTimeout(() => {
    showMentionsPicker.value = false
  }, 200)
  // 同步内容到 store
  updateConfig()
}

// Watch for external data changes | 监听外部数据变化
watch(() => props.data, (newData) => {
  if (newData?.systemPrompt !== undefined && newData.systemPrompt !== systemPrompt.value) {
    systemPrompt.value = newData.systemPrompt
    lastContent.value = systemPrompt.value
    // Sync to editor | 同步到 editor
    setEditableContent(systemPrompt.value)
    // 立即将文本中的 @label 转为 chip
    nextTick(() => convertTextMentionsToChips())
  }
  if (newData?.model !== undefined) model.value = newData.model
  if (newData?.outputFormat !== undefined) outputFormat.value = newData.outputFormat
  if (newData?.outputContent !== undefined) outputContent.value = newData.outputContent
}, { deep: true })

// Watch content changes and sync to editor | 监听内容变化并同步到编辑器
watch(systemPrompt, (newVal) => {
  if (isInternalUpdate) return
  setEditableContent(newVal)
  // 立即将文本中的 @label 转为 chip
  nextTick(() => convertTextMentionsToChips())
  lastContent.value = newVal
})

// Initialize editor content | 初始化 editor 内容
onMounted(() => {
  // 检查当前模型是否在可用模型列表中
  const availableModels = modelStore.availableChatModels
  const isModelAvailable = availableModels.some(m => m.key === model.value)

  if (!model.value || !isModelAvailable) {
    // 使用 store 中的默认模型或第一个可用模型
    model.value = modelStore.selectedChatModel || availableModels[0]?.key || 'gpt-4o-mini'
    updateConfig()
  }

  if (systemPromptRef.value) {
    if (props.data?.systemPrompt) {
      systemPrompt.value = props.data.systemPrompt
    }
    lastContent.value = systemPrompt.value
    // 设置纯文本内容
    setEditableContent(systemPrompt.value)
    // 立即将文本中的 @[...] 转为 chip
    nextTick(() => convertTextMentionsToChips())
  }
})

const outputFormat = ref(props.data?.outputFormat || 'text')
const outputContent = ref(props.data?.outputContent || '')
const isGenerating = ref(false)
const isSplitting = ref(false)
const splitMessage = ref('')

// Model Store (Pinia) | 模型配置 Store
const modelStore = useModelStore()

// 使用全部模型（不按渠道过滤）
const modelOptions = computed(() => modelStore.allChatModelOptions)

// 默认模型使用选中的模型
const model = ref(props.data?.model || modelStore.selectedChatModel || 'gpt-4o-mini')

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
  // 1. First check @ mentions | 首先检查 @ 引用
  // LLMConfigNode 可以被 TextNode @ 引用
  const textNodes = nodes.value.filter(n => n.type === 'text')
  const mentionsInputs = []

  for (const textNode of textNodes) {
    const content = textNode.data?.content || ''
    const mentions = parseMentions(content)

    // Find mentions that reference this LLMConfigNode | 查找引用本节点的 @ 提及
    const refsToThis = mentions.filter(m => m.nodeId === props.id)
    if (refsToThis.length > 0) {
      mentionsInputs.push({
        nodeId: textNode.id,
        content: content,
        order: refsToThis[0].order
      })
    }
  }

  // If there are @ mentions, use them | 如果有 @ 提及，使用它们
  if (mentionsInputs.length > 0) {
    mentionsInputs.sort((a, b) => a.order - b.order)
    return mentionsInputs.map(n => n.content).join('\n\n')
  }

  // 2. Fallback to edge connections | 降级到边的连接
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

  // 将 systemPrompt 中的 @[nodeId] 替换为节点内容
  const resolveSystemPrompt = () => {
    const mentions = parseMentions(systemPrompt.value)
    let resolved = systemPrompt.value

    for (const mention of mentions) {
      const node = nodes.value.find(n => n.id === mention.nodeId)
      if (node?.type === 'text' && node.data?.content) {
        // 替换 @[nodeId] 为节点内容
        const placeholder = `@[${mention.nodeId}]`
        resolved = resolved.replace(placeholder, node.data.content)
      }
    }

    return resolved
  }

  // 获取已经被 systemPrompt 引用的节点内容（按顺序）
  const getReferencedContent = () => {
    const mentions = parseMentions(systemPrompt.value)
    const contents = []

    for (const mention of mentions) {
      const node = nodes.value.find(n => n.id === mention.nodeId)
      if (node?.type === 'text' && node.data?.content) {
        contents.push(node.data.content)
      }
    }

    return contents
  }

  // 获取 user 消息（排除已经在 systemPrompt 中引用的内容）
  const getUserMessage = (input, referencedContents) => {
    if (!input) return ''

    // 如果没有引用任何内容，使用原始输入
    if (referencedContents.length === 0) {
      return input
    }

    // 尝试从 input 中移除已引用的内容
    let remainingInput = input
    for (const refContent of referencedContents) {
      // 移除已引用的内容（精确匹配）
      remainingInput = remainingInput.replace(refContent, '')
    }

    // 清理多余的空白
    remainingInput = remainingInput.trim()

    return remainingInput
  }

  isGenerating.value = true

  try {
    // 解析 systemPrompt 并获取引用的内容
    const resolvedSystemPrompt = resolveSystemPrompt()
    const referencedContent = getReferencedContent()
    const userMessage = getUserMessage(input, referencedContent)

    const { send } = useChat({
      systemPrompt: resolvedSystemPrompt,
      model: model.value
    })

    // 如果 user 消息为空，使用简单提示
    const result = await send(userMessage || '请根据以上信息生成内容', true)
    
    if (result) {
      outputContent.value = result
      updateNode(props.id, { outputContent: result, executed: true })
      window.$message?.success('生成完成')
    }
  } catch (err) {
    updateNode(props.id, { error: err.message || '生成失败' })
    window.$message?.error(err.message || '生成失败')
  } finally {
    isGenerating.value = false
  }
}

// Watch for auto-execute flag | 监听自动执行标志
watch(
  () => props.data?.autoExecute,
  (shouldExecute) => {
    if (shouldExecute && !isGenerating.value) {
      updateNode(props.id, { autoExecute: false })
      setTimeout(() => handleGenerate(), 100)
    }
  },
  { immediate: true }
)

// Start editing label | 开始编辑 label
const startEditLabel = () => {
  editingLabelValue.value = nodeLabel.value
  isEditingLabel.value = true
  nextTick(() => {
    labelInputRef.value?.focus()
    labelInputRef.value?.select()
  })
}

// Finish editing label | 完成编辑 label
const finishEditLabel = () => {
  const newLabel = editingLabelValue.value.trim()
  if (newLabel && newLabel !== nodeLabel.value) {
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

/**
 * Parse text into paragraphs
 * 解析文本为段落 - 连续的非空行合并为一个段落，空行作为分隔符
 */
const parseParagraphs = (text) => {
  const lines = text.split('\n')
  const paragraphs = []
  let current = ''

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === '') {
      // Empty line - separator
      if (current.trim()) {
        paragraphs.push(current.trim())
        current = ''
      }
    } else {
      // Non-empty line - append to current paragraph
      current += (current ? '\n' : '') + line
    }
  }

  // Don't forget the last paragraph
  if (current.trim()) {
    paragraphs.push(current.trim())
  }

  return paragraphs
}

/**
 * Split output by newline into text + image nodes
 * 按换行拆分为文本节点 + 图片配置节点
 */
const handleSplitToTextWithImage = () => {
  if (!outputContent.value) return
  // Split by paragraphs (continuous non-empty lines as one segment)
  const segments = parseParagraphs(outputContent.value)

  if (segments.length === 0) {
    window.$message?.warning('内容为空，无法拆分')
    return
  }

  isSplitting.value = true
  splitMessage.value = ''

  try {
    // Get current node position
    const currentNode = nodes.value.find(n => n.id === props.id)
    const baseX = (currentNode?.position?.x || 0) + 450
    const baseY = (currentNode?.position?.y || 0)
    const rowSpacing = 200
    const colSpacing = 350

    // Start batch operation manually
    startBatchOperation()

    // Prepare node specs for batch creation
    const nodeSpecs = []
    const edgeSpecs = []

    for (let i = 0; i < segments.length; i++) {
      const content = segments[i]
      const segY = baseY + i * rowSpacing

      // Create text node
      const textSpec = {
        type: 'text',
        position: { x: baseX, y: segY },
        data: {
          content: content,
          label: `片段 ${i + 1}`
        }
      }
      nodeSpecs.push(textSpec)

      // Create imageConfig node
      const imageConfigSpec = {
        type: 'imageConfig',
        position: { x: baseX + colSpacing, y: segY },
        data: {
          label: `图片 ${i + 1}`,
          model: 'doubao-seedream-4-5-251128',
          size: '2048x2048'
        }
      }
      nodeSpecs.push(imageConfigSpec)
    }

    // Batch create nodes
    const createdIds = addNodes(nodeSpecs, false)

    // Create edges
    for (let i = 0; i < segments.length; i++) {
      const textId = createdIds[i * 2]
      const imageConfigId = createdIds[i * 2 + 1]

      // Connect LLM → text
      edgeSpecs.push({
        source: props.id,
        target: textId,
        sourceHandle: 'right',
        targetHandle: 'left'
      })

      // Connect text → imageConfig
      edgeSpecs.push({
        source: textId,
        target: imageConfigId,
        type: 'promptOrder',
        data: { promptOrder: 1 },
        sourceHandle: 'right',
        targetHandle: 'left'
      })
    }

    // Batch create edges
    addEdges(edgeSpecs, false)

    // End batch operation
    endBatchOperation()

    splitMessage.value = `已拆分 ${segments.length} 个图文节点`
    window.$message?.success(`已拆分为 ${segments.length} 个图文节点`)
  } catch (err) {
    window.$message?.error(`拆分失败: ${err.message}`)
  } finally {
    isSplitting.value = false
  }
}

/**
 * Split output by newlines into individual text nodes
 * 按换行拆分为多个文本节点
 */
const handleSplitToTextOnly = () => {
  if (!outputContent.value) return

  // Split by paragraphs (continuous non-empty lines as one segment)
  const segments = parseParagraphs(outputContent.value)

  if (segments.length <= 1) {
    window.$message?.warning('内容无法拆分（只有一段或内容为空）')
    return
  }

  doSplitToTextNodes(segments)
}

const doSplitToTextNodes = (segments) => {
  isSplitting.value = true
  splitMessage.value = ''

  try {
    const currentNode = nodes.value.find(n => n.id === props.id)
    const baseX = (currentNode?.position?.x || 0) + 450
    const baseY = (currentNode?.position?.y || 0)
    const rowSpacing = 180

    // Start batch operation manually
    startBatchOperation()

    // Prepare node specs for batch creation
    const nodeSpecs = segments.map((content, index) => ({
      type: 'text',
      position: { x: baseX, y: baseY + index * rowSpacing },
      data: {
        content: content,
        label: `拆分片段 ${index + 1}`
      }
    }))

    // Batch create nodes
    const createdIds = addNodes(nodeSpecs, false)

    // Prepare edge specs for batch creation
    const edgeSpecs = createdIds.map(nodeId => ({
      source: props.id,
      target: nodeId,
      sourceHandle: 'right',
      targetHandle: 'left'
    }))

    // Batch create edges
    addEdges(edgeSpecs, false)

    // End batch operation
    endBatchOperation()

    splitMessage.value = `已拆分为 ${segments.length} 个文本节点`
    window.$message?.success(`已拆分为 ${segments.length} 个文本节点`)
  } catch (err) {
    window.$message?.error(`拆分失败: ${err.message}`)
  } finally {
    isSplitting.value = false
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

/* Textarea wrapper - 参考 TextNode */
.textarea-wrapper {
  position: relative;
}

/* Editor styles | 编辑器样式 */
.editor-content {
  min-height: 60px;
  max-height: 120px;
  padding: 8px 10px;
  border: none;
  border-radius: 8px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.6;
  outline: none;
  overflow-y: auto;
  word-break: break-word;
  white-space: pre-wrap;
  border: 1px solid var(--border-color);
  transition: border-color 0.2s;
}

.editor-content:focus {
  border-color: var(--accent-color, #a855f7);
}

.editor-content:empty::before {
  content: attr(data-placeholder);
  color: var(--text-secondary);
  opacity: 0.5;
  pointer-events: none;
}

/* Mention chip - 参考 TextNode */
.mention-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px 2px 2px;
  margin: 0 2px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 13px;
  vertical-align: middle;
  cursor: default;
  user-select: none;
  line-height: 1.4;
  color: var(--text-primary);
}

.mention-chip img {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  object-fit: cover;
}

.mention-chip-icon {
  font-size: 12px;
}

.mention-chip-label {
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
