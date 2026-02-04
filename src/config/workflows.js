/**
 * Workflow Templates Configuration | 工作流模板配置
 * 预设工作流模板，支持一键添加到画布
 */
import product01 from '@/assets/product01.jpg'
import workflowCover1 from '@/assets/workflow01.jpeg'
import workflowCover2 from '@/assets/workflow02.jpeg'
import scene01 from '@/assets/scene01.jpeg'
import shot01 from '@/assets/shot01.jpeg'

// Multi-angle prompts | 多角度提示词模板
export const MULTI_ANGLE_PROMPTS = {
  front: {
    label: '正视',
    english: 'Front View',
    prompt: (character) => `使用提供的图片，生成四宫格分镜，每张四宫格包括人物正面对着镜头的4个景别（远景、中景、近景、和局部特写），保持场景、产品、人物特征的一致性，宫格里的每一张照片保持和提供图片相同的比例。并在图片下方用英文标注这个景别

角色参考: ${character}`
  },
  side: {
    label: '侧视',
    english: 'Side View', 
    prompt: (character) => `使用提供的图片，分别生成四宫格分镜，每张四宫格包括人物侧面角度的4个景别（远景、中景、近景、和局部特写），保持场景、产品、人物特征的一致性，宫格里的每一张照片保持和提供图片相同的比例。并在图片下方用英文标注这个景别

角色参考: ${character}`
  },
  back: {
    label: '后视',
    english: 'Back View',
    prompt: (character) => `使用提供的图片，分别生成四宫格分镜，每张四宫格包括人物背影角度的4个景别（远景、中景、近景、和局部特写），保持场景、产品、人物特征的一致性，宫格里的每一张照片保持和提供图片相同的比例。并在图片下方用英文标注这个景别

角色参考: ${character}`
  },
  top: {
    label: '俯视',
    english: 'Top/Bird\'s Eye View',
    prompt: (character) => `使用提供的图片，分别生成四宫格分镜，每张四宫格包括俯视角度的4个景别（远景、中景、近景、和局部特写），保持场景、产品、人物特征的一致性，宫格里的每一张照片保持和提供图片相同的比例。并在图片下方用英文标注这个景别

角色参考: ${character}`
  }
}

/**
 * Workflow Templates | 工作流模板
 */
export const WORKFLOW_TEMPLATES = [
  {
    id: 'multi-angle-storyboard',
    name: '多角度分镜',
    description: '生成角色的正视、侧视、后视、俯视四宫格分镜图',
    icon: 'GridOutline',
    category: 'storyboard',
    cover: workflowCover1,
    // 节点配置
    createNodes: (startPosition) => {
      const nodeSpacing = 400
      const rowSpacing = 280
      const angles = ['front', 'side', 'back', 'top']
      
      const nodes = []
      const edges = []
      let nodeIdCounter = 0
      const getNodeId = () => `workflow_node_${Date.now()}_${nodeIdCounter++}`
      
      // 主角色图：提示词 + 文生图配置
      const characterTextId = getNodeId()
      nodes.push({
        id: characterTextId,
        type: 'text',
        position: { x: startPosition.x, y: startPosition.y + rowSpacing * 1.5 },
        data: {
          content: '',
          label: '角色提示词'
        }
      })
      
      const characterConfigId = getNodeId()
      nodes.push({
        id: characterConfigId,
        type: 'imageConfig',
        position: { x: startPosition.x + nodeSpacing, y: startPosition.y + rowSpacing * 1.5 },
        data: {
          label: '主角色图',
          model: 'doubao-seedream-4-5-251128',
          size: '2048x2048'
        }
      })
      
      // 主角色图结果节点（空白图片节点）
      const characterImageId = getNodeId()
      nodes.push({
        id: characterImageId,
        type: 'image',
        position: { x: startPosition.x + nodeSpacing * 2, y: startPosition.y + rowSpacing * 1.5 },
        data: {
          url: '',
          label: '角色图结果'
        }
      })
      
      // 连线：角色提示词 → 角色图配置
      edges.push({
        id: `edge_${characterTextId}_${characterConfigId}`,
        source: characterTextId,
        target: characterConfigId,
        sourceHandle: 'right',
        targetHandle: 'left'
      })
      
      // 连线：角色图配置 → 角色图结果
      edges.push({
        id: `edge_${characterConfigId}_${characterImageId}`,
        source: characterConfigId,
        target: characterImageId,
        sourceHandle: 'right',
        targetHandle: 'left'
      })
      
      // 创建4个角度的节点
      const angleX = startPosition.x + nodeSpacing * 3 + 100
      
      angles.forEach((angleKey, index) => {
        const angleConfig = MULTI_ANGLE_PROMPTS[angleKey]
        const angleY = startPosition.y + index * rowSpacing
        let currentX = angleX
        
        // 提示词节点（预填充默认提示词）
        const textNodeId = getNodeId()
        nodes.push({
          id: textNodeId,
          type: 'text',
          position: { x: currentX, y: angleY },
          data: {
            content: angleConfig.prompt(''),
            label: `${angleConfig.label}提示词`
          }
        })
        currentX += nodeSpacing
        
        // 图片配置节点
        const configNodeId = getNodeId()
        nodes.push({
          id: configNodeId,
          type: 'imageConfig',
          position: { x: currentX, y: angleY },
          data: {
            label: `${angleConfig.label} (${angleConfig.english})`,
            model: 'doubao-seedream-4-5-251128',
            size: '2048x2048'
          }
        })
        
        // 连线：提示词 → 配置
        edges.push({
          id: `edge_${textNodeId}_${configNodeId}`,
          source: textNodeId,
          target: configNodeId,
          type: 'promptOrder',
          data: { promptOrder: 1 },
          sourceHandle: 'right',
          targetHandle: 'left'
        })
        
        // 连线：角色图结果 → 角度配置（参考图）
        edges.push({
          id: `edge_${characterImageId}_${configNodeId}`,
          source: characterImageId,
          target: configNodeId,
          type: 'imageOrder',
          data: { imageOrder: 1 },
          sourceHandle: 'right',
          targetHandle: 'left'
        })
      })
      
      return { nodes, edges }
    }
  },
  {
    id: 'product-ecommerce-full-set',
    name: '通用产品全套电商图',
    description: '根据产品信息和图片，生成模特图、侧面展示图、俯瞰展示图',
    icon: 'ShoppingOutline',
    category: 'ecommerce',
    cover: workflowCover2,
    // 节点配置
    createNodes: (startPosition) => {
      const colSpacing = 500  // 列间距
      const rowSpacing = 350  // 行间距
      
      const nodes = []
      const edges = []
      let nodeIdCounter = 0
      const getNodeId = () => `workflow_node_${Date.now()}_${nodeIdCounter++}`
      
      // ========== 布局说明 ==========
      // 第一列: A(产品信息), B(产品图片) - 输入节点
      // 第二列: C, D, E - 提示词节点
      // 第三列: 生成模特图, 侧面展示图, 俯瞰展示图 - 输出节点
      
      // ========== 第一列：输入节点 ==========
      // A: 产品信息文本节点
      const nodeA_productInfoId = getNodeId()
      nodes.push({
        id: nodeA_productInfoId,
        type: 'text',
        position: { x: startPosition.x, y: startPosition.y },
        data: {
          content: 'Soundcore by Anker P20i真无线耳机，10mm驱动单元带来强劲低音，蓝牙5.3，30小时超长续航，防水，2个麦克风实现AI清晰通话，22种预设均衡器，可通过App定制 强劲低音：Soundcore P20i真无线耳机搭载超大10mm驱动单元，带来强劲音效和增强的低音，让您沉浸在喜爱的歌曲中。 个性化聆听体验：使用Soundcore App自定义控制选项，并从22种预设均衡器中进行选择。借助“Find My Earbuds”（查找我的耳机）功能，丢失的耳机可以发出声音，帮助您定位。 长续航，快速充电：单次充电可提供10小时电池续航，搭配充电盒则可延长至30小时。如果P20i真无线耳机电量不足，仅需10分钟快速充电即可提供2小时播放时间。 便携式设计：Soundcore P20i真无线耳机和充电盒小巧轻便，配有挂绳。其体积足够小，可轻松放入口袋，或挂在包或钥匙上，让您无需担心空间问题。 AI增强清晰通话：2个内置麦克风和AI算法协同工作，捕捉您的声音，让您无需在电话中大喊大叫。',
          label: '产品信息'
        }
      })
      
      // B: 产品图片节点
      const nodeB_productImageId = getNodeId()
      nodes.push({
        id: nodeB_productImageId,
        type: 'image',
        position: { x: startPosition.x, y: startPosition.y + rowSpacing },
        data: {
          url: 'https://ffile.chatfire.site/image/covers/product01.jpg',
          label: '产品图片'
        }
      })
      
      // ========== 第二列：提示词节点 ==========
      // C: 模特图提示词 (与生成模特图对齐)
      const nodeC_modelPromptId = getNodeId()
      nodes.push({
        id: nodeC_modelPromptId,
        type: 'text',
        position: { x: startPosition.x + colSpacing, y: startPosition.y },
        data: {
          content: '根据产品特性，生成一个适合展示该产品且时尚富有高级感的模特图，彩色人像，背景是白底，人物居中，欧美人优先',
          label: '模特图提示词'
        }
      })
      
      // D: 侧面展示图提示词 (与侧面展示图对齐)
      const nodeD_sidePromptId = getNodeId()
      nodes.push({
        id: nodeD_sidePromptId,
        type: 'text',
        position: { x: startPosition.x + colSpacing, y: startPosition.y + rowSpacing },
        data: {
          content: '根据产品图和产品信息，生成左侧侧面45度的展示图，高清展示侧面的产品形状和细节，保持产品不变形',
          label: '侧面展示图提示词'
        }
      })
      
      // E: 俯瞰展示图提示词 (与俯瞰展示图对齐)
      const nodeE_topPromptId = getNodeId()
      nodes.push({
        id: nodeE_topPromptId,
        type: 'text',
        position: { x: startPosition.x + colSpacing, y: startPosition.y + rowSpacing * 2 },
        data: {
          content: '根据产品图和产品信息，生成从上往下俯瞰的产品展示图，高清展示俯瞰角度的产品形状和细节，保持产品不变形',
          label: '俯瞰展示图提示词'
        }
      })
      
      // F: 拆解图提示词 (与拆解图对齐)
      const nodeF_explodedPromptId = getNodeId()
      nodes.push({
        id: nodeF_explodedPromptId,
        type: 'text',
        position: { x: startPosition.x + colSpacing, y: startPosition.y + rowSpacing * 3 },
        data: {
          content: '根据产品材质功能，生成一张产品核心部件的结构示意图，要展现出产品核心部件的内部构造，画面清晰呈现产品关键部件，背景为简洁的浅色调，同时包含核心卖点文案',
          label: '拆解图提示词'
        }
      })
      
      // ========== 第三列：生成节点 ==========
      // B+C = 生成模特图
      const modelConfigId = getNodeId()
      nodes.push({
        id: modelConfigId,
        type: 'imageConfig',
        position: { x: startPosition.x + colSpacing * 2, y: startPosition.y },
        data: {
          label: '生成模特图',
          model: 'doubao-seedream-4-5-251128',
          size: '2048x2048'
        }
      })
      
      // B+D = 生成侧面展示图
      const sideConfigId = getNodeId()
      nodes.push({
        id: sideConfigId,
        type: 'imageConfig',
        position: { x: startPosition.x + colSpacing * 2, y: startPosition.y + rowSpacing },
        data: {
          label: '侧面展示图',
          model: 'doubao-seedream-4-5-251128',
          size: '2048x2048'
        }
      })
      
      // B+E = 生成俯瞰展示图
      const topConfigId = getNodeId()
      nodes.push({
        id: topConfigId,
        type: 'imageConfig',
        position: { x: startPosition.x + colSpacing * 2, y: startPosition.y + rowSpacing * 2 },
        data: {
          label: '俯瞰展示图',
          model: 'doubao-seedream-4-5-251128',
          size: '2048x2048'
        }
      })
      
      // AB+F = 生成拆解图
      const explodedConfigId = getNodeId()
      nodes.push({
        id: explodedConfigId,
        type: 'imageConfig',
        position: { x: startPosition.x + colSpacing * 2, y: startPosition.y + rowSpacing * 3 },
        data: {
          label: '拆解图',
          model: 'doubao-seedream-4-5-251128',
          size: '2048x2048'
        }
      })
      
      // ========== 连线 ==========
      // AB+C → 生成模特图
      edges.push({
        id: `edge_${nodeA_productInfoId}_${modelConfigId}`,
        source: nodeA_productInfoId,
        target: modelConfigId,
        type: 'promptOrder',
        data: { promptOrder: 1 },
        sourceHandle: 'right',
        targetHandle: 'left'
      })
      edges.push({
        id: `edge_${nodeB_productImageId}_${modelConfigId}`,
        source: nodeB_productImageId,
        target: modelConfigId,
        type: 'imageOrder',
        data: { imageOrder: 1 },
        sourceHandle: 'right',
        targetHandle: 'left'
      })
      edges.push({
        id: `edge_${nodeC_modelPromptId}_${modelConfigId}`,
        source: nodeC_modelPromptId,
        target: modelConfigId,
        type: 'promptOrder',
        data: { promptOrder: 2 },
        sourceHandle: 'right',
        targetHandle: 'left'
      })
      
      // AB+D → 生成侧面展示图
      edges.push({
        id: `edge_${nodeA_productInfoId}_${sideConfigId}`,
        source: nodeA_productInfoId,
        target: sideConfigId,
        type: 'promptOrder',
        data: { promptOrder: 1 },
        sourceHandle: 'right',
        targetHandle: 'left'
      })
      edges.push({
        id: `edge_${nodeB_productImageId}_${sideConfigId}`,
        source: nodeB_productImageId,
        target: sideConfigId,
        type: 'imageOrder',
        data: { imageOrder: 1 },
        sourceHandle: 'right',
        targetHandle: 'left'
      })
      edges.push({
        id: `edge_${nodeD_sidePromptId}_${sideConfigId}`,
        source: nodeD_sidePromptId,
        target: sideConfigId,
        type: 'promptOrder',
        data: { promptOrder: 2 },
        sourceHandle: 'right',
        targetHandle: 'left'
      })
      
      // AB+E → 生成俯瞰展示图
      edges.push({
        id: `edge_${nodeA_productInfoId}_${topConfigId}`,
        source: nodeA_productInfoId,
        target: topConfigId,
        type: 'promptOrder',
        data: { promptOrder: 1 },
        sourceHandle: 'right',
        targetHandle: 'left'
      })
      edges.push({
        id: `edge_${nodeB_productImageId}_${topConfigId}`,
        source: nodeB_productImageId,
        target: topConfigId,
        type: 'imageOrder',
        data: { imageOrder: 1 },
        sourceHandle: 'right',
        targetHandle: 'left'
      })
      edges.push({
        id: `edge_${nodeE_topPromptId}_${topConfigId}`,
        source: nodeE_topPromptId,
        target: topConfigId,
        type: 'promptOrder',
        data: { promptOrder: 2 },
        sourceHandle: 'right',
        targetHandle: 'left'
      })
      
      // AB+F → 生成拆解图
      edges.push({
        id: `edge_${nodeA_productInfoId}_${explodedConfigId}`,
        source: nodeA_productInfoId,
        target: explodedConfigId,
        type: 'promptOrder',
        data: { promptOrder: 1 },
        sourceHandle: 'right',
        targetHandle: 'left'
      })
      edges.push({
        id: `edge_${nodeB_productImageId}_${explodedConfigId}`,
        source: nodeB_productImageId,
        target: explodedConfigId,
        type: 'imageOrder',
        data: { imageOrder: 1 },
        sourceHandle: 'right',
        targetHandle: 'left'
      })
      edges.push({
        id: `edge_${nodeF_explodedPromptId}_${explodedConfigId}`,
        source: nodeF_explodedPromptId,
        target: explodedConfigId,
        type: 'promptOrder',
        data: { promptOrder: 2 },
        sourceHandle: 'right',
        targetHandle: 'left'
      })
      
      return { nodes, edges }
    }
  },
  // ========== 短剧生图工作流 ==========
  {
    id: 'drama-character-design',
    name: '短剧角色设计',
    description: '根据角色描述生成一致性角色形象，后续多角度图依赖正面图保持一致性',
    icon: 'PersonOutline',
    category: 'drama',
    cover: shot01,
    createNodes: (startPosition) => {
      const colSpacing = 400
      const rowSpacing = 280
      
      const nodes = []
      const edges = []
      let nodeIdCounter = 0
      const getNodeId = () => `workflow_node_${Date.now()}_${nodeIdCounter++}`
      
      // ========== 第一阶段：生成正面角色图 ==========
      // 角色描述
      const characterDescId = getNodeId()
      nodes.push({
        id: characterDescId,
        type: 'text',
        position: { x: startPosition.x, y: startPosition.y },
        data: {
          content: '角色名称：林小雨\n性别：女\n年龄：22岁\n外貌特征：长发及腰，眼睛明亮有神，皮肤白皙，身材高挑\n服装风格：现代都市风，白色连衣裙\n性格特点：温柔善良，内心坚强',
          label: '角色描述'
        }
      })
      
      // 风格参考图（可选）
      const styleRefId = getNodeId()
      nodes.push({
        id: styleRefId,
        type: 'image',
        position: { x: startPosition.x, y: startPosition.y + rowSpacing },
        data: {
          url: '',
          label: '风格参考图（可选）'
        }
      })
      
      // 正面全身提示词
      const frontPromptId = getNodeId()
      nodes.push({
        id: frontPromptId,
        type: 'text',
        position: { x: startPosition.x + colSpacing, y: startPosition.y },
        data: {
          content: '根据角色描述，生成角色的正面全身照，人物居中，白色简洁背景，高清写实风格，电影级画质',
          label: '正面全身提示词'
        }
      })
      
      // 正面全身生成配置
      const frontConfigId = getNodeId()
      nodes.push({
        id: frontConfigId,
        type: 'imageConfig',
        position: { x: startPosition.x + colSpacing * 2, y: startPosition.y },
        data: {
          label: '生成正面全身图',
          model: 'doubao-seedream-4-5-251128',
          size: '1440x2560'
        }
      })
      
      // 正面全身图结果（作为后续生成的参考）
      const frontResultId = getNodeId()
      nodes.push({
        id: frontResultId,
        type: 'image',
        position: { x: startPosition.x + colSpacing * 3, y: startPosition.y },
        data: {
          url: '',
          label: '正面角色图（参考基准）'
        }
      })
      
      // ========== 第二阶段：基于正面图生成多角度 ==========
      // 侧面半身提示词
      const sidePromptId = getNodeId()
      nodes.push({
        id: sidePromptId,
        type: 'text',
        position: { x: startPosition.x + colSpacing * 3 + 100, y: startPosition.y + rowSpacing },
        data: {
          content: '参考提供的角色正面图，保持人物外貌、服装完全一致，生成角色的侧面半身照，45度角侧脸，展示五官轮廓，白色简洁背景，高清写实风格',
          label: '侧面半身提示词'
        }
      })
      
      // 表情特写提示词
      const closeupPromptId = getNodeId()
      nodes.push({
        id: closeupPromptId,
        type: 'text',
        position: { x: startPosition.x + colSpacing * 3 + 100, y: startPosition.y + rowSpacing * 2 },
        data: {
          content: '参考提供的角色正面图，保持人物五官、发型完全一致，生成角色的面部特写，展示多种表情（微笑、严肃、惊讶、悲伤），四宫格布局，高清写实风格',
          label: '表情特写提示词'
        }
      })
      
      // 背面全身提示词
      const backPromptId = getNodeId()
      nodes.push({
        id: backPromptId,
        type: 'text',
        position: { x: startPosition.x + colSpacing * 3 + 100, y: startPosition.y + rowSpacing * 3 },
        data: {
          content: '参考提供的角色正面图，保持人物发型、服装、身材完全一致，生成角色的背面全身照，展示背影，白色简洁背景，高清写实风格',
          label: '背面全身提示词'
        }
      })
      
      // 侧面生成配置
      const sideConfigId = getNodeId()
      nodes.push({
        id: sideConfigId,
        type: 'imageConfig',
        position: { x: startPosition.x + colSpacing * 4 + 100, y: startPosition.y + rowSpacing },
        data: {
          label: '侧面半身图',
          model: 'doubao-seedream-4-5-251128',
          size: '2048x2048'
        }
      })
      
      // 表情特写生成配置
      const closeupConfigId = getNodeId()
      nodes.push({
        id: closeupConfigId,
        type: 'imageConfig',
        position: { x: startPosition.x + colSpacing * 4 + 100, y: startPosition.y + rowSpacing * 2 },
        data: {
          label: '表情特写图',
          model: 'doubao-seedream-4-5-251128',
          size: '2048x2048'
        }
      })
      
      // 背面生成配置
      const backConfigId = getNodeId()
      nodes.push({
        id: backConfigId,
        type: 'imageConfig',
        position: { x: startPosition.x + colSpacing * 4 + 100, y: startPosition.y + rowSpacing * 3 },
        data: {
          label: '背面全身图',
          model: 'doubao-seedream-4-5-251128',
          size: '1440x2560'
        }
      })
      
      // ========== 连线：第一阶段 ==========
      // 角色描述 → 正面生成
      edges.push({
        id: `edge_${characterDescId}_${frontConfigId}`,
        source: characterDescId,
        target: frontConfigId,
        type: 'promptOrder',
        data: { promptOrder: 1 },
        sourceHandle: 'right',
        targetHandle: 'left'
      })
      // 风格参考 → 正面生成
      edges.push({
        id: `edge_${styleRefId}_${frontConfigId}`,
        source: styleRefId,
        target: frontConfigId,
        type: 'imageOrder',
        data: { imageOrder: 1 },
        sourceHandle: 'right',
        targetHandle: 'left'
      })
      // 正面提示词 → 正面生成
      edges.push({
        id: `edge_${frontPromptId}_${frontConfigId}`,
        source: frontPromptId,
        target: frontConfigId,
        type: 'promptOrder',
        data: { promptOrder: 2 },
        sourceHandle: 'right',
        targetHandle: 'left'
      })
      // 正面生成 → 正面结果
      edges.push({
        id: `edge_${frontConfigId}_${frontResultId}`,
        source: frontConfigId,
        target: frontResultId,
        sourceHandle: 'right',
        targetHandle: 'left'
      })
      
      // ========== 连线：第二阶段（依赖正面图） ==========
      // 正面结果 → 侧面生成（作为参考图）
      edges.push({
        id: `edge_${frontResultId}_${sideConfigId}`,
        source: frontResultId,
        target: sideConfigId,
        type: 'imageOrder',
        data: { imageOrder: 1 },
        sourceHandle: 'right',
        targetHandle: 'left'
      })
      // 正面结果 → 表情生成（作为参考图）
      edges.push({
        id: `edge_${frontResultId}_${closeupConfigId}`,
        source: frontResultId,
        target: closeupConfigId,
        type: 'imageOrder',
        data: { imageOrder: 1 },
        sourceHandle: 'right',
        targetHandle: 'left'
      })
      // 正面结果 → 背面生成（作为参考图）
      edges.push({
        id: `edge_${frontResultId}_${backConfigId}`,
        source: frontResultId,
        target: backConfigId,
        type: 'imageOrder',
        data: { imageOrder: 1 },
        sourceHandle: 'right',
        targetHandle: 'left'
      })
      
      // 提示词 → 各生成节点
      edges.push({
        id: `edge_${sidePromptId}_${sideConfigId}`,
        source: sidePromptId,
        target: sideConfigId,
        type: 'promptOrder',
        data: { promptOrder: 1 },
        sourceHandle: 'right',
        targetHandle: 'left'
      })
      edges.push({
        id: `edge_${closeupPromptId}_${closeupConfigId}`,
        source: closeupPromptId,
        target: closeupConfigId,
        type: 'promptOrder',
        data: { promptOrder: 1 },
        sourceHandle: 'right',
        targetHandle: 'left'
      })
      edges.push({
        id: `edge_${backPromptId}_${backConfigId}`,
        source: backPromptId,
        target: backConfigId,
        type: 'promptOrder',
        data: { promptOrder: 1 },
        sourceHandle: 'right',
        targetHandle: 'left'
      })
      
      return { nodes, edges }
    }
  },
  {
    id: 'drama-scene-background',
    name: '多时段场景背景',
    description: '先生成基础场景，再基于基础场景生成多时段变体，保持场景一致性',
    icon: 'ImageOutline',
    category: 'drama',
    cover: scene01,
    createNodes: (startPosition) => {
      const colSpacing = 400
      const rowSpacing = 260
      
      const nodes = []
      const edges = []
      let nodeIdCounter = 0
      const getNodeId = () => `workflow_node_${Date.now()}_${nodeIdCounter++}`
      
      // ========== 第一阶段：生成基础场景 ==========
      // 场景描述
      const sceneDescId = getNodeId()
      nodes.push({
        id: sceneDescId,
        type: 'text',
        position: { x: startPosition.x, y: startPosition.y },
        data: {
          content: '场景名称：现代都市街道\n位置：繁华商业区主街道\n环境特征：高楼大厦林立，霓虹灯招牌，车水马龙\n氛围：都市繁华、现代感强\n特殊元素：咖啡店、书店、商场入口',
          label: '场景描述'
        }
      })
      
      // 基础场景提示词
      const basePromptId = getNodeId()
      nodes.push({
        id: basePromptId,
        type: 'text',
        position: { x: startPosition.x + colSpacing, y: startPosition.y },
        data: {
          content: '根据场景描述，生成白天正午时段的场景背景作为基准，阳光明媚，光线充足均匀，展示场景全貌和所有环境元素，纯背景无人物，电影级画质，宽屏构图',
          label: '基础场景提示词'
        }
      })
      
      // 基础场景生成配置
      const baseConfigId = getNodeId()
      nodes.push({
        id: baseConfigId,
        type: 'imageConfig',
        position: { x: startPosition.x + colSpacing * 2, y: startPosition.y },
        data: {
          label: '生成基础场景',
          model: 'doubao-seedream-4-5-251128',
          size: '2560x1440'
        }
      })
      
      // 基础场景结果（作为后续生成的参考）
      const baseResultId = getNodeId()
      nodes.push({
        id: baseResultId,
        type: 'image',
        position: { x: startPosition.x + colSpacing * 3, y: startPosition.y },
        data: {
          url: '',
          label: '基础场景图（参考基准）'
        }
      })
      
      // ========== 第二阶段：基于基础场景生成多时段变体 ==========
      // 傍晚场景提示词
      const eveningPromptId = getNodeId()
      nodes.push({
        id: eveningPromptId,
        type: 'text',
        position: { x: startPosition.x + colSpacing * 3 + 100, y: startPosition.y + rowSpacing },
        data: {
          content: '参考提供的基础场景图，保持场景构图、建筑、环境元素完全一致，仅改变光照为傍晚时段：夕阳西下，天空呈橙红色渐变，光线柔和温暖，建筑投射长影',
          label: '傍晚场景提示词'
        }
      })
      
      // 夜晚场景提示词
      const nightPromptId = getNodeId()
      nodes.push({
        id: nightPromptId,
        type: 'text',
        position: { x: startPosition.x + colSpacing * 3 + 100, y: startPosition.y + rowSpacing * 2 },
        data: {
          content: '参考提供的基础场景图，保持场景构图、建筑、环境元素完全一致，仅改变光照为夜晚时段：霓虹灯亮起，城市灯光璀璨，天空深蓝或黑色，窗户透出暖光',
          label: '夜晚场景提示词'
        }
      })
      
      // 雨天场景提示词
      const rainPromptId = getNodeId()
      nodes.push({
        id: rainPromptId,
        type: 'text',
        position: { x: startPosition.x + colSpacing * 3 + 100, y: startPosition.y + rowSpacing * 3 },
        data: {
          content: '参考提供的基础场景图，保持场景构图、建筑、环境元素完全一致，仅改变天气为雨天：细雨绵绵，地面湿润有倒影，天空阴沉灰暗，氛围忧郁',
          label: '雨天场景提示词'
        }
      })
      
      // 傍晚生成配置
      const eveningConfigId = getNodeId()
      nodes.push({
        id: eveningConfigId,
        type: 'imageConfig',
        position: { x: startPosition.x + colSpacing * 4 + 100, y: startPosition.y + rowSpacing },
        data: {
          label: '傍晚场景',
          model: 'doubao-seedream-4-5-251128',
          size: '2560x1440'
        }
      })
      
      // 夜晚生成配置
      const nightConfigId = getNodeId()
      nodes.push({
        id: nightConfigId,
        type: 'imageConfig',
        position: { x: startPosition.x + colSpacing * 4 + 100, y: startPosition.y + rowSpacing * 2 },
        data: {
          label: '夜晚场景',
          model: 'doubao-seedream-4-5-251128',
          size: '2560x1440'
        }
      })
      
      // 雨天生成配置
      const rainConfigId = getNodeId()
      nodes.push({
        id: rainConfigId,
        type: 'imageConfig',
        position: { x: startPosition.x + colSpacing * 4 + 100, y: startPosition.y + rowSpacing * 3 },
        data: {
          label: '雨天场景',
          model: 'doubao-seedream-4-5-251128',
          size: '2560x1440'
        }
      })
      
      // ========== 连线：第一阶段 ==========
      // 场景描述 → 基础场景生成
      edges.push({
        id: `edge_${sceneDescId}_${baseConfigId}`,
        source: sceneDescId,
        target: baseConfigId,
        type: 'promptOrder',
        data: { promptOrder: 1 },
        sourceHandle: 'right',
        targetHandle: 'left'
      })
      // 基础提示词 → 基础场景生成
      edges.push({
        id: `edge_${basePromptId}_${baseConfigId}`,
        source: basePromptId,
        target: baseConfigId,
        type: 'promptOrder',
        data: { promptOrder: 2 },
        sourceHandle: 'right',
        targetHandle: 'left'
      })
      // 基础场景生成 → 基础场景结果
      edges.push({
        id: `edge_${baseConfigId}_${baseResultId}`,
        source: baseConfigId,
        target: baseResultId,
        sourceHandle: 'right',
        targetHandle: 'left'
      })
      
      // ========== 连线：第二阶段（依赖基础场景图） ==========
      // 基础场景结果 → 各时段生成（作为参考图）
      const variantConfigs = [eveningConfigId, nightConfigId, rainConfigId]
      variantConfigs.forEach(configId => {
        edges.push({
          id: `edge_${baseResultId}_${configId}`,
          source: baseResultId,
          target: configId,
          type: 'imageOrder',
          data: { imageOrder: 1 },
          sourceHandle: 'right',
          targetHandle: 'left'
        })
      })
      
      // 提示词 → 各生成节点
      edges.push({
        id: `edge_${eveningPromptId}_${eveningConfigId}`,
        source: eveningPromptId,
        target: eveningConfigId,
        type: 'promptOrder',
        data: { promptOrder: 1 },
        sourceHandle: 'right',
        targetHandle: 'left'
      })
      edges.push({
        id: `edge_${nightPromptId}_${nightConfigId}`,
        source: nightPromptId,
        target: nightConfigId,
        type: 'promptOrder',
        data: { promptOrder: 1 },
        sourceHandle: 'right',
        targetHandle: 'left'
      })
      edges.push({
        id: `edge_${rainPromptId}_${rainConfigId}`,
        source: rainPromptId,
        target: rainConfigId,
        type: 'promptOrder',
        data: { promptOrder: 1 },
        sourceHandle: 'right',
        targetHandle: 'left'
      })
      
      return { nodes, edges }
    }
  },
  // {
  //   id: 'drama-storyboard-shot',
  //   name: '短剧分镜图',
  //   description: '根据角色、场景和剧情描述生成分镜画面',
  //   icon: 'FilmOutline',
  //   category: 'drama',
  //   cover: workflowCover1,
  //   createNodes: (startPosition) => {
  //     const colSpacing = 400
  //     const rowSpacing = 250
      
  //     const nodes = []
  //     const edges = []
  //     let nodeIdCounter = 0
  //     const getNodeId = () => `workflow_node_${Date.now()}_${nodeIdCounter++}`
      
  //     // ========== 输入节点 ==========
  //     // 角色参考图
  //     const characterRefId = getNodeId()
  //     nodes.push({
  //       id: characterRefId,
  //       type: 'image',
  //       position: { x: startPosition.x, y: startPosition.y },
  //       data: {
  //         url: '',
  //         label: '角色参考图'
  //       }
  //     })
      
  //     // 场景背景图
  //     const sceneRefId = getNodeId()
  //     nodes.push({
  //       id: sceneRefId,
  //       type: 'image',
  //       position: { x: startPosition.x, y: startPosition.y + rowSpacing },
  //       data: {
  //         url: '',
  //         label: '场景背景图'
  //       }
  //     })
      
  //     // 分镜描述
  //     const shotDescId = getNodeId()
  //     nodes.push({
  //       id: shotDescId,
  //       type: 'text',
  //       position: { x: startPosition.x, y: startPosition.y + rowSpacing * 2 },
  //       data: {
  //         content: '分镜编号：001\n景别：中景\n镜头角度：平视\n画面描述：女主角站在咖啡店门口，手持一杯咖啡，微微低头看着手机，若有所思\n人物动作：站立，单手持咖啡，另一手拿手机\n表情：略带忧郁，眉头微蹙\n光线：自然光，侧逆光',
  //         label: '分镜描述'
  //       }
  //     })
      
  //     // ========== 生成提示词 ==========
  //     const shotPromptId = getNodeId()
  //     nodes.push({
  //       id: shotPromptId,
  //       type: 'text',
  //       position: { x: startPosition.x + colSpacing, y: startPosition.y + rowSpacing },
  //       data: {
  //         content: '根据角色参考图、场景背景和分镜描述，生成电影级分镜画面，保持角色外貌一致，场景融合自然，光影效果符合描述，16:9宽屏比例，电影调色',
  //         label: '分镜生成提示词'
  //       }
  //     })
      
  //     // ========== 生成节点 ==========
  //     const shotConfigId = getNodeId()
  //     nodes.push({
  //       id: shotConfigId,
  //       type: 'imageConfig',
  //       position: { x: startPosition.x + colSpacing * 2, y: startPosition.y + rowSpacing },
  //       data: {
  //         label: '分镜画面',
  //         model: 'doubao-seedream-4-5-251128',
  //         size: '2560x1440'
  //       }
  //     })
      
  //     // ========== 连线 ==========
  //     edges.push({
  //       id: `edge_${characterRefId}_${shotConfigId}`,
  //       source: characterRefId,
  //       target: shotConfigId,
  //       sourceHandle: 'right',
  //       targetHandle: 'left'
  //     })
  //     edges.push({
  //       id: `edge_${sceneRefId}_${shotConfigId}`,
  //       source: sceneRefId,
  //       target: shotConfigId,
  //       sourceHandle: 'right',
  //       targetHandle: 'left'
  //     })
  //     edges.push({
  //       id: `edge_${shotDescId}_${shotConfigId}`,
  //       source: shotDescId,
  //       target: shotConfigId,
  //       type: 'promptOrder',
  //       data: { promptOrder: 1 },
  //       sourceHandle: 'right',
  //       targetHandle: 'left'
  //     })
  //     edges.push({
  //       id: `edge_${shotPromptId}_${shotConfigId}`,
  //       source: shotPromptId,
  //       target: shotConfigId,
  //       type: 'promptOrder',
  //       data: { promptOrder: 2 },
  //       sourceHandle: 'right',
  //       targetHandle: 'left'
  //     })
      
  //     return { nodes, edges }
  //   }
  // },
  // ========== 绘本生成器工作流 ==========
  {
    id: 'picture-book-generator',
    name: '绘本生成器',
    description: '根据故事大纲生成16页绘本，包含角色设计、剧情拆分和图文生成',
    icon: 'BookOutline',
    category: 'creative',
    cover: workflowCover1,
    createNodes: (startPosition) => {
      const colSpacing = 420
      const rowSpacing = 300
      const pageRowSpacing = 200
      
      const nodes = []
      const edges = []
      let nodeIdCounter = 0
      const getNodeId = () => `workflow_node_${Date.now()}_${nodeIdCounter++}`
      
      // ========== 第一阶段：故事输入与角色设计 ==========
      
      // 故事大纲输入
      const storyInputId = getNodeId()
      nodes.push({
        id: storyInputId,
        type: 'text',
        position: { x: startPosition.x, y: startPosition.y },
        data: {
          content: `【绘本名称】小兔子的冒险之旅

【故事主题】勇气与友谊

【主要角色】
1. 小白兔米米 - 主角，白色毛发，粉红色耳朵内侧，穿蓝色背带裤，性格勇敢好奇
2. 小狐狸橙橙 - 伙伴，橙色毛发，白色尾巴尖，戴绿色围巾，聪明机智
3. 老乌龟爷爷 - 智者，深绿色壳，戴小眼镜，和蔼慈祥

【故事梗概】
小白兔米米住在森林边的小木屋里，有一天她发现了一张神秘的藏宝图。在好朋友小狐狸橙橙的陪伴下，她们踏上了寻宝之旅。途中遇到各种挑战，最后在老乌龟爷爷的帮助下，她们发现真正的宝藏是友谊和勇气。

【画风要求】
温馨治愈的水彩绘本风格，色彩明亮柔和，适合3-6岁儿童阅读`,
          label: '故事大纲'
        }
      })
      
      // 角色设计系统提示词
      const characterSystemPromptId = getNodeId()
      nodes.push({
        id: characterSystemPromptId,
        type: 'text',
        position: { x: startPosition.x + colSpacing, y: startPosition.y - rowSpacing },
        data: {
          content: `你是专业的绘本角色设计师。根据故事大纲，为每个主要角色生成详细的视觉描述提示词。

要求：
1. 每个角色生成正面全身图的提示词
2. 保持角色特征明确、可识别
3. 风格统一，适合儿童绘本
4. 输出格式为每个角色单独一段，用 --- 分隔

示例输出格式：
【角色1名称】
[详细的图像生成提示词，包含外貌、服装、表情、姿态、背景等]
---
【角色2名称】
[详细的图像生成提示词]`,
          label: '角色设计提示词模板'
        }
      })
      
      // 角色设计 LLM 节点
      const characterLLMId = getNodeId()
      nodes.push({
        id: characterLLMId,
        type: 'llmConfig',
        position: { x: startPosition.x + colSpacing * 2, y: startPosition.y - rowSpacing },
        data: {
          label: '角色设计生成',
          systemPrompt: `你是专业的绘本角色设计师。根据故事大纲提取所有角色，为每个角色生成适合图像生成的详细提示词。

输出要求：
1. 每个角色单独一段
2. 包含：外貌特征、服装、表情、姿态、背景色
3. 使用绘本水彩风格描述
4. 适合儿童绘本的可爱形象`,
          model: 'gpt-4o-mini',
          outputFormat: 'text'
        }
      })
      
      // 主角色1图像配置
      const character1ConfigId = getNodeId()
      nodes.push({
        id: character1ConfigId,
        type: 'imageConfig',
        position: { x: startPosition.x + colSpacing * 3, y: startPosition.y - rowSpacing * 1.5 },
        data: {
          label: '主角色1设计图',
          model: 'doubao-seedream-4-5-251128',
          size: '2048x2048'
        }
      })
      
      // 主角色1提示词
      const character1PromptId = getNodeId()
      nodes.push({
        id: character1PromptId,
        type: 'text',
        position: { x: startPosition.x + colSpacing * 2.5, y: startPosition.y - rowSpacing * 1.5 },
        data: {
          content: '可爱的小白兔，白色毛发蓬松柔软，粉红色耳朵内侧，穿着蓝色背带裤，大眼睛明亮有神，表情开朗自信，全身正面站立姿态，白色简洁背景，儿童绘本水彩风格，温馨治愈，色彩明亮柔和',
          label: '角色1:小白兔米米'
        }
      })
      
      // 主角色1图像结果
      const character1ImageId = getNodeId()
      nodes.push({
        id: character1ImageId,
        type: 'image',
        position: { x: startPosition.x + colSpacing * 4, y: startPosition.y - rowSpacing * 1.5 },
        data: {
          url: '',
          label: '角色1参考图'
        }
      })
      
      // 主角色2提示词
      const character2PromptId = getNodeId()
      nodes.push({
        id: character2PromptId,
        type: 'text',
        position: { x: startPosition.x + colSpacing * 2.5, y: startPosition.y - rowSpacing * 0.5 },
        data: {
          content: '可爱的小狐狸，橙色毛发光泽亮丽，白色尾巴尖，戴着绿色围巾，机灵的眼睛，调皮的微笑，全身正面站立姿态，白色简洁背景，儿童绘本水彩风格，温馨治愈，色彩明亮柔和',
          label: '角色2:小狐狸橙橙'
        }
      })
      
      // 主角色2图像配置
      const character2ConfigId = getNodeId()
      nodes.push({
        id: character2ConfigId,
        type: 'imageConfig',
        position: { x: startPosition.x + colSpacing * 3, y: startPosition.y - rowSpacing * 0.5 },
        data: {
          label: '主角色2设计图',
          model: 'doubao-seedream-4-5-251128',
          size: '2048x2048'
        }
      })
      
      // 主角色2图像结果
      const character2ImageId = getNodeId()
      nodes.push({
        id: character2ImageId,
        type: 'image',
        position: { x: startPosition.x + colSpacing * 4, y: startPosition.y - rowSpacing * 0.5 },
        data: {
          url: '',
          label: '角色2参考图'
        }
      })
      
      // ========== 第二阶段：剧情拆分为16页 ==========
      
      // 剧情拆分 LLM 节点
      const storyLLMId = getNodeId()
      nodes.push({
        id: storyLLMId,
        type: 'llmConfig',
        position: { x: startPosition.x + colSpacing, y: startPosition.y + rowSpacing },
        data: {
          label: '剧情拆分(16页)',
          systemPrompt: `你是专业的绘本编剧。将故事拆分成16页绘本内容。

输出格式（严格按此格式）：
第1页：[场景描述] | [画面内容] | [配文]
第2页：[场景描述] | [画面内容] | [配文]
...
第16页：[场景描述] | [画面内容] | [配文]

要求：
1. 每页都要有明确的场景、画面描述和配文
2. 故事节奏合理：开场(1-2页)→发展(3-8页)→高潮(9-13页)→结局(14-16页)
3. 画面描述要具体，便于图像生成
4. 配文简洁，适合幼儿阅读（每页不超过30字）
5. 保持角色特征一致性`,
          model: 'gpt-4o',
          outputFormat: 'text'
        }
      })
      
      // 剧情拆分结果展示
      const storyResultId = getNodeId()
      nodes.push({
        id: storyResultId,
        type: 'text',
        position: { x: startPosition.x + colSpacing * 2, y: startPosition.y + rowSpacing },
        data: {
          content: '',
          label: '16页剧情内容'
        }
      })
      
      // ========== 第三阶段：绘本页面生成（示例前4页） ==========
      
      const pageBaseY = startPosition.y + rowSpacing * 2.5
      
      // 生成4页示例（实际使用时可复制扩展到16页）
      const pagePrompts = [
        {
          scene: '森林边的小木屋',
          content: '清晨阳光洒在森林边的小木屋上，小白兔米米在窗边伸懒腰，开始新的一天',
          text: '在森林边的小木屋里，住着一只可爱的小白兔，她叫米米。'
        },
        {
          scene: '发现藏宝图',
          content: '米米在阁楼的旧箱子里发现一张泛黄的藏宝图，眼睛闪闪发光',
          text: '有一天，米米在阁楼发现了一张神秘的藏宝图！'
        },
        {
          scene: '找好朋友',
          content: '米米跑到橙橙家门口敲门，小狐狸橙橙探出头来，好奇地看着藏宝图',
          text: '"橙橙！快看我发现了什么！"米米兴奋地喊道。'
        },
        {
          scene: '出发冒险',
          content: '米米和橙橙背着小背包，站在森林入口，阳光照在她们身上，充满希望',
          text: '两个好朋友决定一起去寻找宝藏，勇敢地出发了！'
        }
      ]
      
      pagePrompts.forEach((page, index) => {
        const pageY = pageBaseY + index * pageRowSpacing
        const pageNum = index + 1
        
        // 页面提示词
        const pagePromptId = getNodeId()
        nodes.push({
          id: pagePromptId,
          type: 'text',
          position: { x: startPosition.x + colSpacing * 3, y: pageY },
          data: {
            content: `【第${pageNum}页】场景：${page.scene}
画面描述：${page.content}
配文：${page.text}

图像提示词：${page.content}，儿童绘本水彩风格，温馨治愈，色彩明亮柔和，精美细节，高清画质`,
            label: `第${pageNum}页内容`
          }
        })
        
        // 页面图像配置
        const pageConfigId = getNodeId()
        nodes.push({
          id: pageConfigId,
          type: 'imageConfig',
          position: { x: startPosition.x + colSpacing * 4, y: pageY },
          data: {
            label: `第${pageNum}页插图`,
            model: 'doubao-seedream-4-5-251128',
            size: '2048x2048'
          }
        })
        
        // 连线：页面提示词 → 页面配置
        edges.push({
          id: `edge_${pagePromptId}_${pageConfigId}`,
          source: pagePromptId,
          target: pageConfigId,
          type: 'promptOrder',
          data: { promptOrder: 1 },
          sourceHandle: 'right',
          targetHandle: 'left'
        })
        
        // 连线：角色1参考图 → 页面配置
        edges.push({
          id: `edge_${character1ImageId}_${pageConfigId}_ref`,
          source: character1ImageId,
          target: pageConfigId,
          type: 'imageOrder',
          data: { imageOrder: 1 },
          sourceHandle: 'right',
          targetHandle: 'left'
        })
        
        // 连线：角色2参考图 → 页面配置（部分页面）
        if (index >= 2) {
          edges.push({
            id: `edge_${character2ImageId}_${pageConfigId}_ref`,
            source: character2ImageId,
            target: pageConfigId,
            type: 'imageOrder',
            data: { imageOrder: 2 },
            sourceHandle: 'right',
            targetHandle: 'left'
          })
        }
      })
      
      // ========== 连线：第一阶段 ==========
      // 故事大纲 → 角色设计LLM
      edges.push({
        id: `edge_${storyInputId}_${characterLLMId}`,
        source: storyInputId,
        target: characterLLMId,
        type: 'promptOrder',
        data: { promptOrder: 1 },
        sourceHandle: 'right',
        targetHandle: 'left'
      })
      
      // 角色提示词模板 → 角色设计LLM
      edges.push({
        id: `edge_${characterSystemPromptId}_${characterLLMId}`,
        source: characterSystemPromptId,
        target: characterLLMId,
        type: 'promptOrder',
        data: { promptOrder: 2 },
        sourceHandle: 'right',
        targetHandle: 'left'
      })
      
      // 角色1提示词 → 角色1配置
      edges.push({
        id: `edge_${character1PromptId}_${character1ConfigId}`,
        source: character1PromptId,
        target: character1ConfigId,
        type: 'promptOrder',
        data: { promptOrder: 1 },
        sourceHandle: 'right',
        targetHandle: 'left'
      })
      
      // 角色1配置 → 角色1图像
      edges.push({
        id: `edge_${character1ConfigId}_${character1ImageId}`,
        source: character1ConfigId,
        target: character1ImageId,
        sourceHandle: 'right',
        targetHandle: 'left'
      })
      
      // 角色2提示词 → 角色2配置
      edges.push({
        id: `edge_${character2PromptId}_${character2ConfigId}`,
        source: character2PromptId,
        target: character2ConfigId,
        type: 'promptOrder',
        data: { promptOrder: 1 },
        sourceHandle: 'right',
        targetHandle: 'left'
      })
      
      // 角色2配置 → 角色2图像
      edges.push({
        id: `edge_${character2ConfigId}_${character2ImageId}`,
        source: character2ConfigId,
        target: character2ImageId,
        sourceHandle: 'right',
        targetHandle: 'left'
      })
      
      // ========== 连线：第二阶段 ==========
      // 故事大纲 → 剧情拆分LLM
      edges.push({
        id: `edge_${storyInputId}_${storyLLMId}`,
        source: storyInputId,
        target: storyLLMId,
        type: 'promptOrder',
        data: { promptOrder: 1 },
        sourceHandle: 'right',
        targetHandle: 'left'
      })
      
      // 剧情拆分LLM → 结果展示
      edges.push({
        id: `edge_${storyLLMId}_${storyResultId}`,
        source: storyLLMId,
        target: storyResultId,
        sourceHandle: 'right',
        targetHandle: 'left'
      })
      
      return { nodes, edges }
    }
  }
]

/**
 * Get workflow template by ID | 根据ID获取工作流模板
 */
export const getWorkflowById = (id) => {
  return WORKFLOW_TEMPLATES.find(w => w.id === id)
}

/**
 * Get workflows by category | 根据分类获取工作流
 */
export const getWorkflowsByCategory = (category) => {
  return WORKFLOW_TEMPLATES.filter(w => w.category === category)
}

export default WORKFLOW_TEMPLATES
