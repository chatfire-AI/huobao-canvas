# ChatFire Canvas（火宝画布）

[English](./README.md)

开源的节点式 AI 创作画布：在无限画布上串联 12 家厂商的文本 / 图像 / 视频生成模型，自带 API Key 即可使用。

[在线体验](https://marketing.chatfire.site/huobao-canvas/)

![Vue](https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vue.js)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)
![Docker](https://img.shields.io/badge/Docker-compose-2496ED?logo=docker)
![License](https://img.shields.io/badge/License-MIT-blue)

> **v2.0 全面重构中**：本分支为重构版（monorepo + 12 家厂商官方适配）。v1 旧版代码与文档保留在 [`legacy/v1`](../../tree/legacy/v1) 分支。

## 特性

- 🎨 **无限画布**：基于 Vue Flow，文本 / 图像 / 视频 / 分组四种节点 + 类型化连线规则
- 🔗 **节点串联**：上游节点输出可作为下游输入（文生图 → 图生视频）
- 🧩 **内置 12 家厂商官方格式**：OpenAI、Anthropic、Gemini、Qwen、火山、DeepSeek、MiniMax、Moonshot、智谱、xAI、Vidu、小米 MiMo，含官方出入参适配
- ⚙️ **设置页**：按厂商配置 API Key、连通测试、模型启停、自定义模型
- 🔑 **BYOK**：API Key 仅存浏览器本地，不经过任何服务端
- 💾 **本地优先**：项目数据保存在 IndexedDB（Dexie），无需注册账号
- ☁️ **可选媒体持久化**：生成素材转存为可插拔的存储 Provider
- 🔄 **双目录模式**：官方直连（默认，独立可用）或接入任意 ChatFire/OpenAI 兼容网关

## 快速开始

**Docker（推荐）**

```bash
docker compose up -d        # http://localhost:8080
# 启用可选媒体转存：
docker compose --profile storage up -d
```

**本地开发**

```bash
cd apps/web
pnpm install
pnpm dev        # http://localhost:8021
```

打开页面，进入右上角**设置**，为任意厂商填入 API Key，即可开始创作。Key 仅保存在浏览器 localStorage。

## 配置

| 环境变量 | 默认值 | 说明 |
|---|---|---|
| `VITE_API_BASE_URL` | `https://api.chatfire.site` | 推理端点（任意 OpenAI 兼容网关） |
| `VITE_UPSTREAM` | `https://api.chatfire.site` | dev server 代理目标 |
| `VITE_STORAGE_PROVIDER` | `none` | 媒体转存：`none` 或 `http` |
| `VITE_STORAGE_UPLOAD_URL` | `/storage/upload` | provider 为 `http` 时的上传接口 |

## 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支（`git checkout -b feature/amazing-feature`）
3. 提交更改（`git commit -m 'Add amazing feature'`）
4. 推送到分支（`git push origin feature/amazing-feature`）
5. 提交 Pull Request

## 联系我

扫码添加微信交流：

<img src="./docs/images/wx-group.jpg" width="200" alt="微信群二维码" />

## 许可证

[MIT](./LICENSE)
