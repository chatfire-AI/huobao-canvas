/**
 * Workflow Orchestrator Hook | 工作流编排 Hook
 * 使用回调串行结构编排节点执行
 * 
 * 依赖关系：
 * - imageConfig 执行后产生 image 节点
 * - videoConfig 依赖 image 节点作为输入
 * - 串行执行：等待上一步完成后再执行下一步
 */

import { ref, watch } from 'vue'
import { streamChatCompletions } from '@/api'
import { 
  nodes, 
  addNode, 
  addEdge, 
  updateNode 
} from '@/stores/canvas'

// Workflow types | 工作流类型
const WORKFLOW_TYPES = {
  TEXT_TO_IMAGE: 'text_to_image',
  TEXT_TO_IMAGE_TO_VIDEO: 'text_to_image_to_video',
  STORYBOARD: 'storyboard', // 分镜工作流
}

// System prompt for intent analysis | 意图分析系统提示词
const INTENT_ANALYSIS_PROMPT = `你是一个工作流分析助手。根据用户输入判断需要的工作流类型，并生成对应的提示词。

工作流类型：
1. text_to_image - 用户想要生成单张图片（默认）
2. text_to_image_to_video - 用户想要生成图片并转成视频（包含"视频"、"动画"、"动起来"等关键词）
3. storyboard - 用户想要生成分镜/多场景图片（包含"分镜"、"场景一"、"镜头"等关键词，或描述多个连续场景）

返回 JSON：
{
  "workflow_type": "text_to_image | text_to_image_to_video | storyboard",
  "description": "简短描述",
  
  // text_to_image 和 text_to_image_to_video 使用:
  "image_prompt": "优化后的图片生成提示词",
  "video_prompt": "视频生成提示词（仅 text_to_image_to_video）",
  
  // storyboard 分镜工作流使用:
  "character": {
    "name": "角色名称",
    "description": "角色外观描述，用于生成参考图"
  },
  "shots": [
    {
      "title": "分镜标题",
      "prompt": "该分镜的详细画面描述，包含角色动作、场景、光影等"
    }
  ]
}

提示词优化要求：
- image_prompt: 基于用户输入扩展，添加画面细节、艺术风格、光影效果等
- video_prompt: 描述画面如何动起来，如镜头移动、主体动作、氛围变化等
- character.description: 详细描述角色外观特征，便于后续分镜保持一致性
- shots[].prompt: 每个分镜的完整画面描述，需包含角色名以保持一致性

示例输入: "蜡笔小新去上学。分镜一：清晨的战争；分镜二：出发的风姿"
示例输出:
{
  "workflow_type": "storyboard",
  "description": "蜡笔小新上学分镜",
  "character": {
    "name": "蜡笔小新",
    "description": "5岁男孩，黑色蘑菇头发型，粗眉毛，穿红色T恤和黄色短裤，卡通动漫风格"
  },
  "shots": [
    {"title": "清晨的战争", "prompt": "蜡笔小新在卧室赖床，妈妈美伢在旁边生气催促..."},
    {"title": "出发的风姿", "prompt": "蜡笔小新背着黄色书包，在阳光下昂首阔步走出家门..."}
  ]
}

返回纯 JSON，不要其他内容。`

/**
 * Workflow Orchestrator Composable
 */
export const useWorkflowOrchestrator = () => {
  // State | 状态
  const isAnalyzing = ref(false)
  const isExecuting = ref(false)
  const currentStep = ref(0)
  const totalSteps = ref(0)
  const executionLog = ref([])
  
  // Active watchers | 活跃的监听器
  const activeWatchers = []
  
  /**
   * Add log entry | 添加日志
   */
  const addLog = (type, message) => {
    executionLog.value.push({ type, message, timestamp: Date.now() })
    console.log(`[Workflow ${type}] ${message}`)
  }
  
  /**
   * Clear all watchers | 清除所有监听器
   */
  const clearWatchers = () => {
    activeWatchers.forEach(stop => stop())
    activeWatchers.length = 0
  }
  
  /**
   * Wait for config node to complete and return output node ID
   * 等待配置节点完成并返回输出节点 ID
   */
  const waitForConfigComplete = (configNodeId) => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('执行超时'))
      }, 5 * 60 * 1000)
      
      let stopWatcher = null
      
      const checkNode = (node) => {
        if (!node) return false
        
        // Check for error | 检查错误
        if (node.data?.error) {
          clearTimeout(timeout)
          if (stopWatcher) stopWatcher()
          reject(new Error(node.data.error))
          return true
        }
        
        // Config node completed with output node ID | 配置节点完成并返回输出节点 ID
        if (node.data?.executed && node.data?.outputNodeId) {
          clearTimeout(timeout)
          if (stopWatcher) stopWatcher()
          addLog('success', `节点 ${configNodeId} 完成，输出节点: ${node.data.outputNodeId}`)
          resolve(node.data.outputNodeId)
          return true
        }
        return false
      }
      
      // Check immediately first | 先立即检查一次
      const node = nodes.value.find(n => n.id === configNodeId)
      if (checkNode(node)) return
      
      // Then watch for changes | 然后监听变化
      stopWatcher = watch(
        () => nodes.value.find(n => n.id === configNodeId),
        (node) => checkNode(node),
        { deep: true }
      )
      
      activeWatchers.push(stopWatcher)
    })
  }
  
  /**
   * Wait for output node (image/video) to be ready
   * 等待输出节点准备好
   */
  const waitForOutputReady = (outputNodeId) => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('输出节点超时'))
      }, 5 * 60 * 1000)
      
      let stopWatcher = null
      
      const checkNode = (node) => {
        if (!node) return false
        
        if (node.data?.error) {
          clearTimeout(timeout)
          if (stopWatcher) stopWatcher()
          reject(new Error(node.data.error))
          return true
        }
        
        // Output node ready when has URL and not loading
        if (node.data?.url && !node.data?.loading) {
          clearTimeout(timeout)
          if (stopWatcher) stopWatcher()
          addLog('success', `输出节点 ${outputNodeId} 已就绪`)
          resolve(node)
          return true
        }
        return false
      }
      
      // Check immediately first | 先立即检查一次
      const node = nodes.value.find(n => n.id === outputNodeId)
      if (checkNode(node)) return
      
      // Then watch for changes | 然后监听变化
      stopWatcher = watch(
        () => nodes.value.find(n => n.id === outputNodeId),
        (node) => checkNode(node),
        { deep: true }
      )
      
      activeWatchers.push(stopWatcher)
    })
  }
  
  /**
   * Analyze user intent | 分析用户意图
   */
  const analyzeIntent = async (userInput) => {
    isAnalyzing.value = true
    
    try {
      let response = ''
      for await (const chunk of streamChatCompletions({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: INTENT_ANALYSIS_PROMPT },
          { role: 'user', content: userInput }
        ]
      })) {
        response += chunk
      }
      
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        return { workflow_type: WORKFLOW_TYPES.TEXT_TO_IMAGE }
      }
      
      return JSON.parse(jsonMatch[0])
    } catch (err) {
      addLog('error', `分析失败: ${err.message}`)
      return { workflow_type: WORKFLOW_TYPES.TEXT_TO_IMAGE }
    } finally {
      isAnalyzing.value = false
    }
  }
  
  /**
   * Execute text-to-image workflow | 执行文生图工作流
   * text → imageConfig (autoExecute) → image
   */
  const executeTextToImage = async (imagePrompt, position) => {
    const nodeSpacing = 400
    let x = position.x
    
    addLog('info', '开始执行文生图工作流')
    currentStep.value = 1
    totalSteps.value = 2
    
    // Step 1: Create text node for image | 创建图片提示词节点
    const textNodeId = addNode('text', { x, y: position.y }, {
      content: imagePrompt,
      label: '图片提示词'
    })
    addLog('info', `创建图片提示词节点: ${textNodeId}`)
    x += nodeSpacing
    
    // Step 2: Create imageConfig with autoExecute | 创建图片配置节点并自动执行
    currentStep.value = 2
    const imageConfigId = addNode('imageConfig', { x, y: position.y }, {
      label: '文生图',
      autoExecute: true
    })
    addLog('info', `创建图片配置节点: ${imageConfigId}`)
    
    // Connect text → imageConfig
    addEdge({
      source: textNodeId,
      target: imageConfigId,
      sourceHandle: 'right',
      targetHandle: 'left'
    })
    
    addLog('success', '文生图工作流已启动')
    return { textNodeId, imageConfigId }
  }
  
  /**
   * Execute text-to-image-to-video workflow | 执行文生图生视频工作流
   * imageText → imageConfig → image
   * videoText → videoConfig → video
   *              image → videoConfig
   */
  const executeTextToImageToVideo = async (imagePrompt, videoPrompt, position) => {
    const nodeSpacing = 400
    const rowSpacing = 200
    let x = position.x
    
    addLog('info', '开始执行文生图生视频工作流')
    currentStep.value = 1
    totalSteps.value = 5
    
    // Step 1: Create image prompt text node | 创建图片提示词节点
    const imageTextNodeId = addNode('text', { x, y: position.y }, {
      content: imagePrompt,
      label: '图片提示词'
    })
    addLog('info', `创建图片提示词节点: ${imageTextNodeId}`)
    
    // Step 2: Create video prompt text node (below image prompt) | 创建视频提示词节点
    currentStep.value = 2
    const videoTextNodeId = addNode('text', { x, y: position.y + rowSpacing }, {
      content: videoPrompt,
      label: '视频提示词'
    })
    addLog('info', `创建视频提示词节点: ${videoTextNodeId}`)
    x += nodeSpacing
    
    // Step 3: Create imageConfig with autoExecute | 创建图片配置节点
    currentStep.value = 3
    const imageConfigId = addNode('imageConfig', { x, y: position.y }, {
      label: '文生图',
      autoExecute: true
    })
    addLog('info', `创建图片配置节点: ${imageConfigId}`)
    
    // Connect imageText → imageConfig
    addEdge({
      source: imageTextNodeId,
      target: imageConfigId,
      sourceHandle: 'right',
      targetHandle: 'left'
    })
    
    // Step 3: Wait for imageConfig to complete and get image node ID
    // 等待图片配置完成并获取图片节点 ID
    currentStep.value = 3
    addLog('info', '等待图片生成完成...')
    
    try {
      const imageNodeId = await waitForConfigComplete(imageConfigId)
      
      // Wait for image to be ready | 等待图片准备好
      await waitForOutputReady(imageNodeId)
      
      // Get image node position | 获取图片节点位置
      const imageNode = nodes.value.find(n => n.id === imageNodeId)
      x = (imageNode?.position?.x || x) + nodeSpacing
      
      // Step 4: Create videoConfig connected to videoText and image nodes
      // 创建视频配置节点，连接视频提示词和图片节点
      currentStep.value = 4
      const videoConfigId = addNode('videoConfig', { x, y: position.y + rowSpacing }, {
        label: '图生视频',
        autoExecute: true
      })
      addLog('info', `创建视频配置节点: ${videoConfigId}`)
      
      // Connect videoText → videoConfig (for video prompt)
      addEdge({
        source: videoTextNodeId,
        target: videoConfigId,
        sourceHandle: 'right',
        targetHandle: 'left'
      })
      
      // Connect image → videoConfig (for image input)
      addEdge({
        source: imageNodeId,
        target: videoConfigId,
        sourceHandle: 'right',
        targetHandle: 'left'
      })
      
      addLog('success', '文生图生视频工作流已启动')
      return { imageTextNodeId, videoTextNodeId, imageConfigId, imageNodeId, videoConfigId }
    } catch (err) {
      addLog('error', `工作流执行失败: ${err.message}`)
      throw err
    }
  }
  
  /**
   * Execute storyboard workflow | 执行分镜工作流
   * 
   * 布局结构:
   * [角色描述] → [imageConfig] → [角色参考图]
   *                                    ↓
   * [分镜1文本] → [imageConfig] → [分镜1图片]
   * [分镜2文本] → [imageConfig] → [分镜2图片]
   * ...
   */
  const executeStoryboard = async (character, shots, position) => {
    const nodeSpacing = 400
    const rowSpacing = 250
    let x = position.x
    let y = position.y
    
    const shotCount = shots?.length || 0
    addLog('info', `开始执行分镜工作流: ${character?.name || '未知角色'}, ${shotCount} 个分镜`)
    currentStep.value = 1
    totalSteps.value = 2 + shotCount * 2 // 角色生成 + 每个分镜(文本+生成)
    
    const createdNodes = {
      characterTextId: null,
      characterConfigId: null,
      characterImageId: null,
      shots: []
    }
    
    try {
      // Step 1: Create character description text node | 创建角色描述文本节点
      const characterDesc = `${character?.name || '角色'}: ${character?.description || ''}`
      createdNodes.characterTextId = addNode('text', { x, y }, {
        content: characterDesc,
        label: `角色: ${character?.name || '参考'}`
      })
      addLog('info', `创建角色描述节点: ${createdNodes.characterTextId}`)
      x += nodeSpacing
      
      // Step 2: Create character imageConfig with autoExecute | 创建角色参考图配置
      currentStep.value = 2
      createdNodes.characterConfigId = addNode('imageConfig', { x, y }, {
        label: '角色参考图',
        autoExecute: true
      })
      addLog('info', `创建角色配置节点: ${createdNodes.characterConfigId}`)
      
      // Connect character text → imageConfig
      addEdge({
        source: createdNodes.characterTextId,
        target: createdNodes.characterConfigId,
        sourceHandle: 'right',
        targetHandle: 'left'
      })
      
      // Wait for character image to complete | 等待角色参考图完成
      addLog('info', '等待角色参考图生成...')
      createdNodes.characterImageId = await waitForConfigComplete(createdNodes.characterConfigId)
      await waitForOutputReady(createdNodes.characterImageId)
      addLog('success', '角色参考图已生成')
      
      // Get character image position for layout | 获取角色图位置用于布局
      const charImageNode = nodes.value.find(n => n.id === createdNodes.characterImageId)
      x = (charImageNode?.position?.x || x) + nodeSpacing
      
      // Step 3+: Create each shot | 创建每个分镜
      for (let i = 0; i < shotCount; i++) {
        const shot = shots[i]
        const shotY = y + (i + 1) * rowSpacing
        let shotX = position.x
        
        currentStep.value = 3 + i * 2
        
        // Create shot text node | 创建分镜文本节点
        const shotTextId = addNode('text', { x: shotX, y: shotY }, {
          content: shot.prompt,
          label: `分镜${i + 1}: ${shot.title}`
        })
        addLog('info', `创建分镜${i + 1}文本节点: ${shotTextId}`)
        shotX += nodeSpacing
        
        // Create shot imageConfig | 创建分镜配置节点
        currentStep.value = 4 + i * 2
        const shotConfigId = addNode('imageConfig', { x: shotX, y: shotY }, {
          label: `分镜${i + 1}`,
          autoExecute: true
        })
        addLog('info', `创建分镜${i + 1}配置节点: ${shotConfigId}`)
        
        // Connect shot text → imageConfig
        addEdge({
          source: shotTextId,
          target: shotConfigId,
          sourceHandle: 'right',
          targetHandle: 'left'
        })
        
        // Connect character image → shot imageConfig (as reference)
        addEdge({
          source: createdNodes.characterImageId,
          target: shotConfigId,
          sourceHandle: 'right',
          targetHandle: 'left'
        })
        
        // Wait for this shot to complete before next | 等待当前分镜完成
        addLog('info', `等待分镜${i + 1}生成...`)
        const shotImageId = await waitForConfigComplete(shotConfigId)
        await waitForOutputReady(shotImageId)
        addLog('success', `分镜${i + 1}已生成`)
        
        createdNodes.shots.push({
          textId: shotTextId,
          configId: shotConfigId,
          imageId: shotImageId,
          title: shot.title
        })
      }
      
      addLog('success', `分镜工作流完成，共生成 ${shotCount} 个分镜`)
      return createdNodes
    } catch (err) {
      addLog('error', `分镜工作流执行失败: ${err.message}`)
      throw err
    }
  }
  
  /**
   * Main execute function based on workflow type
   * 根据工作流类型执行
   * @param {object} params - 工作流参数
   * @param {object} position - 起始位置
   */
  const executeWorkflow = async (params, position) => {
    isExecuting.value = true
    clearWatchers()
    executionLog.value = []
    
    const { workflow_type, image_prompt, video_prompt, character, shots } = params
    
    try {
      switch (workflow_type) {
        case WORKFLOW_TYPES.STORYBOARD:
          return await executeStoryboard(character, shots, position)
        case WORKFLOW_TYPES.TEXT_TO_IMAGE_TO_VIDEO:
          return await executeTextToImageToVideo(image_prompt, video_prompt, position)
        case WORKFLOW_TYPES.TEXT_TO_IMAGE:
        default:
          return await executeTextToImage(image_prompt, position)
      }
    } finally {
      isExecuting.value = false
      clearWatchers()
    }
  }
  
  /**
   * Convenience method for simple text-to-image | 简便方法
   */
  const createTextToImageWorkflow = (imagePrompt, position) => {
    return executeWorkflow({ 
      workflow_type: WORKFLOW_TYPES.TEXT_TO_IMAGE, 
      image_prompt: imagePrompt 
    }, position)
  }
  
  /**
   * Reset state | 重置状态
   */
  const reset = () => {
    isAnalyzing.value = false
    isExecuting.value = false
    currentStep.value = 0
    totalSteps.value = 0
    executionLog.value = []
    clearWatchers()
  }
  
  return {
    // State
    isAnalyzing,
    isExecuting,
    currentStep,
    totalSteps,
    executionLog,
    
    // Methods
    analyzeIntent,
    executeWorkflow,
    createTextToImageWorkflow,
    reset,
    
    // Constants
    WORKFLOW_TYPES
  }
}

export default useWorkflowOrchestrator
