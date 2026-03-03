# Claude Code 开发指南

## 项目概述

这是一个基于 Vue Flow 的可视化 AI 创作画布，支持文生图、视频生成等 AI 工作流的节点式编排。

## 技术栈

- **框架**: Vue 3 + Vite
- **画布**: Vue Flow (@vue-flow/core)
- **UI 组件**: Naive UI
- **样式**: Tailwind CSS
- **图标**: @vicons/ionicons5
- **状态管理**: Pinia (通过 naive-ui 的 useXxxStore)
- **包管理**: pnpm

## 项目结构

```
src/
├── api/           # API 请求封装
├── assets/        # 静态资源
├── components/    # 组件
│   ├── nodes/     # 节点组件 (TextNode, ImageNode, VideoNode, LLMConfigNode, ImageConfigNode, VideoConfigNode)
│   └── edges/     # 边组件 (ImageRoleEdge, PromptOrderEdge, ImageOrderEdge)
├── config/        # 配置文件 (models.js, providers.js, workflows.js)
├── hooks/         # 组合式函数 (useApi, useProvider, useModelConfig, useWorkflowOrchestrator 等)
├── router/        # 路由配置
├── stores/        # 状态管理 (canvas.js, models.js, projects.js, theme.js, api.js)
├── utils/         # 工具函数
└── views/         # 页面视图 (Home.vue, Canvas.vue)
```

## 开发规范

### 组件开发

1. **节点组件**: 放在 `src/components/nodes/` 目录，命名格式为 `{NodeType}Node.vue`
2. **边组件**: 放在 `src/components/edges/` 目录，命名格式为 `{EdgeType}Edge.vue`
3. 使用 Vue Flow 的 `useVueFlow` composable 获取画布上下文

### 状态管理

- 使用 Pinia store 管理全局状态
- 主要 store: `canvas` (画布状态), `models` (模型配置), `projects` (项目管理), `theme` (主题), `api` (API 配置)

### API 请求

- 使用 axios 封装请求，参考 `src/utils/request.js`
- API 配置通过 `useApi` 和 `useProvider` hooks 管理

### 样式规范

- 使用 Tailwind CSS 类名
- 自定义样式写在 `src/style.css`
- 组件内部使用 scoped style 或 Tailwind 类

## 常用命令

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 预览构建结果
pnpm preview
```

## 核心功能模块

### 工作流编排

- `useWorkflowOrchestrator` - 自动工作流编排器
- 支持三种工作流类型: `text_to_image`, `text_to_image_to_video`, `storyboard`

### 节点类型

| 节点 | 描述 | 配置文件 |
|------|------|----------|
| TextNode | 文本/提示词输入 | - |
| ImageConfigNode | 文生图配置 | models.js |
| ImageNode | 图片展示/上传 | - |
| VideoConfigNode | 视频生成配置 | models.js |
| VideoNode | 视频展示 | - |
| LLMConfigNode | LLM 配置（提示词优化） | providers.js |

### 边类型

| 边类型 | 用途 |
|--------|------|
| ImageRoleEdge | 连接参考图到配置节点 |
| PromptOrderEdge | 控制提示词执行顺序 |
| ImageOrderEdge | 控制图片生成顺序 |

## 注意事项

1. 保持与现有代码风格一致
2. 新增节点需在画布中注册
3. API 配置支持多 provider，需在 `src/config/providers.js` 中配置
4. 模型配置在 `src/config/models.js` 中维护
