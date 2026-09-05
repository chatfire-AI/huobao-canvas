import { CANVAS_NODE_TYPES, NODE_STATUS } from '@/views/canvas/constants/nodeTypes.js'

export const WORKFLOW_TEMPLATES = [
  {
    id: 'text-to-image-to-video',
    title: '文生图 ➔ 图生视频全流程',
    tag: '多模态串联',
    description: '由 LLM 扩写镜头分镜提示词，自动生成高质量概念图，并将生成图作为首帧驱动视频模型生成动态视频。',
    nodes: [
      {
        id: 'tpl_node_text_1',
        type: CANVAS_NODE_TYPES.TEXT,
        position: { x: 80, y: 180 },
        data: {
          title: '提示词扩写 (LLM)',
          status: NODE_STATUS.IDLE,
          payload: {
            modelName: 'gpt-5',
            prompt: '赛博朋克雨夜，霓虹闪烁的未来城市街道，雨水倒映着全息广告牌，电影级质感，8k分辨率，虚幻引擎5渲染',
            params: {
              prompt: '赛博朋克雨夜，霓虹闪烁的未来城市街道，雨水倒映着全息广告牌，电影级质感，8k分辨率，虚幻引擎5渲染',
            },
          },
        },
      },
      {
        id: 'tpl_node_image_1',
        type: CANVAS_NODE_TYPES.IMAGE,
        position: { x: 420, y: 180 },
        data: {
          title: '文生图 (DALL-E / FLUX)',
          status: NODE_STATUS.IDLE,
          payload: {
            modelName: 'dall-e-3',
            params: {
              prompt: '',
              size: '1024x1024',
              quality: 'standard',
            },
          },
        },
      },
      {
        id: 'tpl_node_video_1',
        type: CANVAS_NODE_TYPES.VIDEO,
        position: { x: 760, y: 180 },
        data: {
          title: '图生视频 (Vidu / 可灵)',
          status: NODE_STATUS.IDLE,
          payload: {
            modelName: 'viduq3-pro',
            endpointIndex: 1, // 图生视频端点
            params: {
              prompt: '镜头缓慢向前推进，雨滴滑落，全息光影微微流转',
              duration: 5,
              resolution: '720p',
            },
          },
        },
      },
    ],
    edges: [
      {
        id: 'edge_tpl_text_to_image',
        source: 'tpl_node_text_1',
        target: 'tpl_node_image_1',
        sourceHandle: 'right',
        targetHandle: 'left',
      },
      {
        id: 'edge_tpl_image_to_video',
        source: 'tpl_node_image_1',
        target: 'tpl_node_video_1',
        sourceHandle: 'right',
        targetHandle: 'left',
      },
    ],
  },
  {
    id: 'multi-model-image-compare',
    title: '多模型横向生图对比 (A/B Test)',
    tag: '对比评测',
    description: '使用同一条核心提示词，同时并发驱动 3 个不同的生图模型，方便直观横向对比各厂商在画风、细节与光影上的表现。',
    nodes: [
      {
        id: 'tpl_node_prompt_main',
        type: CANVAS_NODE_TYPES.TEXT,
        position: { x: 80, y: 240 },
        data: {
          title: '统一创意提示词',
          status: NODE_STATUS.IDLE,
          payload: {
            modelName: 'gpt-5',
            prompt: '特写镜头：一只毛茸茸的机械小松鼠正在吃坚果，黄昏逆光，柔和景深，微距摄影风格',
            params: {
              prompt: '特写镜头：一只毛茸茸的机械小松鼠正在吃坚果，黄昏逆光，柔和景深，微距摄影风格',
            },
          },
        },
      },
      {
        id: 'tpl_node_img_compare_1',
        type: CANVAS_NODE_TYPES.IMAGE,
        position: { x: 440, y: 60 },
        data: {
          title: '模型 A (DALL-E 3)',
          status: NODE_STATUS.IDLE,
          payload: {
            modelName: 'dall-e-3',
            params: { prompt: '', size: '1024x1024' },
          },
        },
      },
      {
        id: 'tpl_node_img_compare_2',
        type: CANVAS_NODE_TYPES.IMAGE,
        position: { x: 440, y: 240 },
        data: {
          title: '模型 B (通义万相 / Wanx)',
          status: NODE_STATUS.IDLE,
          payload: {
            modelName: 'wanx-v1',
            params: { prompt: '', size: '1024x1024' },
          },
        },
      },
      {
        id: 'tpl_node_img_compare_3',
        type: CANVAS_NODE_TYPES.IMAGE,
        position: { x: 440, y: 420 },
        data: {
          title: '模型 C (智谱 CogView / FLUX)',
          status: NODE_STATUS.IDLE,
          payload: {
            modelName: 'cogview-3-plus',
            params: { prompt: '', size: '1024x1024' },
          },
        },
      },
    ],
    edges: [
      {
        id: 'edge_cmp_1',
        source: 'tpl_node_prompt_main',
        target: 'tpl_node_img_compare_1',
        sourceHandle: 'right',
        targetHandle: 'left',
      },
      {
        id: 'edge_cmp_2',
        source: 'tpl_node_prompt_main',
        target: 'tpl_node_img_compare_2',
        sourceHandle: 'right',
        targetHandle: 'left',
      },
      {
        id: 'edge_cmp_3',
        source: 'tpl_node_prompt_main',
        target: 'tpl_node_img_compare_3',
        sourceHandle: 'right',
        targetHandle: 'left',
      },
    ],
  },
  {
    id: 'story-comic-pipeline',
    title: 'AI 故事连环分镜生成',
    tag: '内容创作',
    description: '剧本大纲经过 LLM 分解为两个关键分镜场景，并分别生成对应的连贯场景画作。',
    nodes: [
      {
        id: 'tpl_story_script',
        type: CANVAS_NODE_TYPES.TEXT,
        position: { x: 60, y: 160 },
        data: {
          title: '剧本梗概',
          status: NODE_STATUS.IDLE,
          payload: {
            modelName: 'gpt-5',
            prompt: '太空探险家降落在一颗发光森林的神秘星球，发现了一处古老的水晶遗迹',
            params: {
              prompt: '太空探险家降落在一颗发光森林的神秘星球，发现了一处古老的水晶遗迹',
            },
          },
        },
      },
      {
        id: 'tpl_shot_1',
        type: CANVAS_NODE_TYPES.IMAGE,
        position: { x: 400, y: 60 },
        data: {
          title: '分镜一：飞船降落发光森林',
          status: NODE_STATUS.IDLE,
          payload: {
            modelName: 'dall-e-3',
            params: { prompt: '', size: '1024x1024' },
          },
        },
      },
      {
        id: 'tpl_shot_2',
        type: CANVAS_NODE_TYPES.IMAGE,
        position: { x: 400, y: 280 },
        data: {
          title: '分镜二：近景水晶遗迹探索',
          status: NODE_STATUS.IDLE,
          payload: {
            modelName: 'dall-e-3',
            params: { prompt: '', size: '1024x1024' },
          },
        },
      },
    ],
    edges: [
      {
        id: 'edge_story_to_shot1',
        source: 'tpl_story_script',
        target: 'tpl_shot_1',
        sourceHandle: 'right',
        targetHandle: 'left',
      },
      {
        id: 'edge_story_to_shot2',
        source: 'tpl_story_script',
        target: 'tpl_shot_2',
        sourceHandle: 'right',
        targetHandle: 'left',
      },
    ],
  },
]
