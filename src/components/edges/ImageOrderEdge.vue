<template>
  <!-- Custom edge with image order selector | 带图片顺序选择器的自定义边 -->
  <BaseEdge :path="path" :style="edgeStyle" />
  
  <!-- Edge label with order selector | 带顺序选择器的边标签 -->
  <EdgeLabelRenderer>
    <div 
      :style="{ 
        position: 'absolute', 
        transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
        pointerEvents: 'all'
      }"
      class="nodrag nopan"
    >
      <n-dropdown 
        :options="orderOptions" 
        @select="handleOrderSelect"
        size="small"
      >
        <button 
          class="flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full bg-blue-500 text-white border-2 border-white shadow-md hover:scale-110 transition-transform"
        >
          {{ currentOrder }}
        </button>
      </n-dropdown>
    </div>
  </EdgeLabelRenderer>
</template>

<script setup>
import { computed } from 'vue'
import { BaseEdge, EdgeLabelRenderer, getBezierPath, useVueFlow } from '@vue-flow/core'
import { NDropdown } from 'naive-ui'
import { edges } from '../../stores/canvas'

// Get VueFlow instance | 获取 VueFlow 实例
const { updateEdgeData } = useVueFlow()

const props = defineProps({
  id: String,
  source: String,
  target: String,
  sourceX: Number,
  sourceY: Number,
  targetX: Number,
  targetY: Number,
  sourcePosition: String,
  targetPosition: String,
  data: Object,
  markerEnd: String,
  style: Object
})

// Order labels | 顺序标签
const orderLabels = [
  { label: '① 第一张', key: 1 },
  { label: '② 第二张', key: 2 },
  { label: '③ 第三张', key: 3 },
  { label: '④ 第四张', key: 4 },
  { label: '⑤ 第五张', key: 5 }
]

// Dynamic order options based on connected edges count | 基于连接边数量的动态顺序选项
const orderOptions = computed(() => {
  // Get all imageOrder edges connected to the same target | 获取连接到同一目标的所有图片边
  const sameTargetImageEdges = edges.value.filter(edge => 
    edge.target === props.target && 
    edge.type === 'imageOrder'
  )
  const count = sameTargetImageEdges.length || 1
  return orderLabels.slice(0, count)
})

// Current order from edge data | 从边数据获取当前顺序
const currentOrder = computed(() => props.data?.imageOrder || 1)

// Calculate bezier path | 计算贝塞尔路径
const path = computed(() => {
  const [edgePath] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
    sourcePosition: props.sourcePosition,
    targetPosition: props.targetPosition
  })
  return edgePath
})

// Label position (center of edge) | 标签位置（边的中心）
const labelX = computed(() => (props.sourceX + props.targetX) / 2)
const labelY = computed(() => (props.sourceY + props.targetY) / 2)

// Edge style | 边样式
const edgeStyle = computed(() => ({
  stroke: '#3b82f6',
  strokeWidth: 2,
  ...props.style
}))

// Handle order selection | 处理顺序选择
const handleOrderSelect = (newOrder) => {
  // Get all image edges connected to the same target | 获取连接到同一目标的所有图片边
  const sameTargetImageEdges = edges.value.filter(edge => 
    edge.target === props.target && 
    edge.type === 'imageOrder'
  )
  
  // Find edge currently using this order | 查找当前使用此顺序的边
  const edgeWithSameOrder = sameTargetImageEdges.find(edge => 
    edge.id !== props.id && 
    edge.data?.imageOrder === newOrder
  )
  
  // If another edge has this order, swap with current | 如果另一条边有此顺序，则交换
  if (edgeWithSameOrder) {
    updateEdgeData(edgeWithSameOrder.id, { imageOrder: currentOrder.value })
  }
  
  // Update current edge order | 更新当前边顺序
  updateEdgeData(props.id, { imageOrder: newOrder })
}
</script>
