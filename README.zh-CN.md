# ChatFire Canvas（火宝画布）

[English](./README.md) | [日本語](./README.ja.md) | [한국어](./README.ko.md)

开源的节点式 AI 创作画布：在无限画布上串联 12 家厂商的文本 / 图像 / 视频生成模型，自带 API Key 即可使用。

[在线体验](https://marketing.firemux.com/huobao-canvas/)

![Vue](https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vue.js)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)
![Docker](https://img.shields.io/badge/Docker-huobao%2Fhuobao--canvas-2496ED?logo=docker)
[![License](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

> **v2.0 全面重构中**：本分支为重构版（monorepo + 12 家厂商官方适配）。v1 旧版代码与文档保留在 [`legacy/v1`](../../tree/legacy/v1) 分支。

## 特性

- 🎨 **无限画布**：基于 Vue Flow，文本 / 图像 / 视频 / 分组四种节点 + 类型化连线规则
- 🔗 **节点串联**：上游节点输出可作为下游输入（文生图 → 图生视频）
- 🧩 **内置 12 家厂商官方格式**：OpenAI、Anthropic、Gemini、Qwen、火山、DeepSeek、MiniMax、Moonshot、智谱、xAI、Vidu、小米 MiMo，含官方出入参适配
- ⚙️ **设置页**：按厂商配置 API Key、连通测试、模型启停、自定义模型
- 🖥️ **服务端运行队列**：模型调用经服务端执行，刷新 / 换浏览器任务不丢，异步视频任务自动轮询（预算 2 小时），画布数据存 SQLite
- 🔑 **BYOK**：API Key 默认存浏览器本地；自部署时自动镜像到服务端（换浏览器无缝接管）
- 🌍 **四语界面**：简体中文 / English / 日本語 / 한국어，界面内一键切换
- 🔄 **双目录模式**：厂商官方直连（默认，独立可用）或接入任意 ChatFire/OpenAI 兼容网关
- 📦 **多种部署**：Docker 单镜像一体化（amd64 / arm64，Win / Mac / Linux 通用）· Electron 桌面版（Windows / macOS）

## 快速开始

**Docker（推荐）**

```bash
docker run -d -p 8080:16812 -v canvas-data:/app/data huobao/huobao-canvas:latest
# 打开 http://localhost:8080
```

镜像发布在 Docker Hub（[huobao/huobao-canvas](https://hub.docker.com/r/huobao/huobao-canvas)），多架构 `linux/amd64` + `linux/arm64`，Linux 服务器 / Windows / macOS 通用。

或用 docker compose（附带 Watchtower 每日自动更新 + `.env` 配置）：

```bash
cp .env.example .env       # 按需修改 WATCHTOWER_TOKEN
docker compose up -d       # http://localhost:8080
```

**本地开发**

```bash
cd apps/web
pnpm install
pnpm dev        # http://localhost:8022
```

打开页面，进入右上角**设置**，为任意厂商填入 API Key，即可开始创作。Key 默认保存在浏览器 localStorage（自部署时自动镜像到服务端）。

## 配置

Docker 部署（`docker-compose.yml` / `.env`）：

| 环境变量 | 默认值 | 说明 |
|---|---|---|
| `UPSTREAM` | `https://api.firemux.com` | 推理网关默认地址（任意 OpenAI 兼容网关；设置页仍可按用户覆盖） |
| `API_BASE_URL` | 空 | 浏览器侧请求基地址，留空 = 同源（由镜像内服务端直出/反代） |
| `WATCHTOWER_TOKEN` | `please-change-me` | Watchtower HTTP API 令牌，生产环境务必修改 |

本地开发（`apps/web`）：

| 环境变量 | 默认值 | 说明 |
|---|---|---|
| `VITE_API_BASE_URL` | `https://api.firemux.com` | 推理端点（任意 OpenAI 兼容网关） |
| `VITE_UPSTREAM` | `https://api.firemux.com` | dev server 代理目标 |

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

本项目采用 **[CC BY-NC-SA 4.0](./LICENSE)**（署名-非商业性使用-相同方式共享 4.0 国际）许可证。

- 欢迎个人使用、学习与非商业项目
- 允许在相同许可证下修改与再分发（需署名）
- **禁止商业用途**——未经作者书面许可，不得将本项目整体或部分用于任何商业目的（包括付费服务、商业部署或转售）
