# 🎨 Huobao Canvas - AI 创作画布

<div align="center">

**开源的节点式 AI 创作画布：无限画布串联 11 家厂商的文本 / 图像 / 视频生成模型**

[![Vue Version](https://img.shields.io/badge/Vue-3.5-4FC08D?style=flat&logo=vue.js)](https://vuejs.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat&logo=vite)](https://vitejs.dev)
[![Docker](https://img.shields.io/badge/Docker-huobao%2Fhuobao--canvas-2490ED?style=flat&logo=docker)](https://hub.docker.com/r/huobao/huobao-canvas)
[![License](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

[English](README.md) | **简体中文** | [日本語](README.ja.md) | [한국어](README.ko.md)

[功能特性](#-功能特性) • [快速开始](#-快速开始) • [桌面版](#-桌面应用推荐) • [部署指南](#-部署指南)

<h2>🔑 <a href="https://api.firemux.com">获取 Huobao API Key 👉 立即查看</a></h2>

**文本 · 图片 · 视频全部 AI 能力，一个 Key 即可开通**

打开「设置 → 火宝快捷配置」粘贴 Key，一键写入 11 家厂商配置，开箱即用

<h3>📥 <a href="https://github.com/chatfire-AI/huobao-canvas/releases/latest">下载桌面版（macOS / Windows）</a> · <a href="https://marketing.firemux.com/huobao-canvas/">在线体验</a></h3>

</div>

---

## 📖 项目简介

Huobao Canvas 是一个开源的节点式 AI 创作画布。在无限画布上放置文本 / 图像 / 视频节点，连线即把上游产出作为下游输入——文生图、图生视频、参考生视频自由串联，各家模型即插即用。

### 🎯 核心价值

- **🎨 画布即工作流**：四种节点 + 类型化连线规则，所见即所得的创作流水线
- **🧩 官方格式内置**：11 家厂商的官方出入参适配，填 Key 即用，无中间格式损耗
- **🔑 BYOK 自带钥匙**：Key 存浏览器本地，自部署时自动镜像到服务端，换浏览器无缝接管
- **📦 三形态部署**：Docker 单镜像 / Electron 桌面版 / 纯 Web 开发模式，同一份代码

### 🛠️ 技术架构

```
apps/web/     — Vue 3.5 + Vite 5 + Vue Flow + Naive UI + Pinia + vue-i18n + Tailwind
apps/server/  — 零 npm 依赖 Node 服务端（node:sqlite + 内置 fetch），画布存储 + 运行队列
apps/desktop/ — Electron 壳（utilityProcess 内嵌 server，esbuild 打包 + electron-builder 出 dmg/exe）
docker/       — 单镜像一体化部署（前端产物 + 服务端 bundle，amd64/arm64 多架构）
```

---

## ✨ 功能特性

### 🎨 无限画布

- ✅ 文本 / 图像 / 视频 / 分组四种节点，拖拽连线构建创作流水线
- ✅ 上游产出自动注入下游：文生图 → 图生视频 → 参考生视频
- ✅ 类型化连线规则 + 连线拖出落点菜单，防止无效连接
- ✅ 撤销 / 重做、自动布局、框选多选、画布缩放，完整编辑体验

### 🧩 11 家厂商官方适配

OpenAI、Anthropic、Gemini、Qwen、火山引擎、DeepSeek、MiniMax、Moonshot、智谱、Vidu、小米 MiMo

| 类型 | 代表模型 |
|---|---|
| **对话** | GPT、Claude、Gemini、Qwen3、DeepSeek、Kimi、GLM、MiMo |
| **图像** | GPT Image 1.5/2、Gemini 图像、豆包 Seedream、万相 |
| **视频** | 万相 2.7/3.0（文生/图生/参考生）、Seedance、Vidu、MiniMax |

- ✅ 每家厂商的官方鉴权方式（Bearer / x-api-key / x-goog-api-key / Token）与出入参格式
- ✅ 双端点模型（如 GPT Image 文生图/图片编辑）画布内一键切换生成模式，连线参考自动识别
- ✅ 设置页按厂商配 Key、连通测试、模型启停、自定义模型

### 🖥️ 服务端运行队列

- ✅ 模型调用经服务端执行，刷新 / 换浏览器任务不丢
- ✅ 异步视频任务服务端自动轮询（预算 2 小时），长视频放心挂机
- ✅ 画布数据存 SQLite，多浏览器打开同一部署即同一份数据

### 🌍 四语界面

简体中文 / English / 日本語 / 한국어，界面内一键切换。

### 🔄 双目录模式

- **官方直连（默认）**：按厂商官方格式直连，独立可用，无需任何网关
- **网关模式**：接入任意 OpenAI 兼容网关（如 Huobao），一个 Key 调用全部模型

---

## 🚀 快速开始

### 📥 方式一：桌面版（推荐）

[前往 Releases 下载](https://github.com/chatfire-AI/huobao-canvas/releases/latest)：

| 平台 | 文件 |
|---|---|
| macOS Apple Silicon | `HuobaoCanvas-<版本>-arm64.dmg` |
| macOS Intel | `HuobaoCanvas-<版本>.dmg` |
| Windows x64 | `HuobaoCanvas Setup <版本>.exe` |

- 双击安装、开箱即用：内嵌服务端 + SQLite 存储，数据存用户目录，卸载不丢数据
- macOS 未签名包首次打开需右键 → 打开，或执行 `xattr -cr /Applications/HuobaoCanvas.app`
- Windows 未签名包 SmartScreen 会提示「更多信息 → 仍要运行」

### 🐳 方式二：Docker

```bash
docker run -d -p 8080:16812 -v canvas-data:/app/data huobao/huobao-canvas:latest
# 打开 http://localhost:8080
```

镜像发布在 [Docker Hub](https://hub.docker.com/r/huobao/huobao-canvas)，多架构 `linux/amd64` + `linux/arm64`。或用 compose（附 Watchtower 每日自动更新）：

```bash
cp .env.example .env       # 按需修改 WATCHTOWER_TOKEN
docker compose up -d
```

### 💻 方式三：本地开发

```bash
git clone https://github.com/chatfire-AI/huobao-canvas.git
cd huobao-canvas/apps/web
pnpm install && pnpm dev   # http://localhost:8022
```

> 本地开发如需画布持久化与服务端运行队列，另开终端 `pnpm -C apps/server dev`（Node ≥ 22.13）。

### 🔑 首次使用：配置 API Key

打开页面 → 右上角「设置」：

1. **火宝快捷配置**（推荐）：粘贴 Huobao API Key（[前往 api.firemux.com 获取](https://api.firemux.com)），一键写入 11 家厂商的 Key 与网关地址
2. **手动配置**：按厂商逐个填入官方 API Key，支持连通测试

Key 默认保存在浏览器 localStorage；自部署时自动镜像到服务端（换浏览器无缝接管）。

---

## 🖥️ 桌面应用（推荐）

```bash
cd apps/desktop
pnpm dist        # macOS dmg（arm64 + Intel）
pnpm dist:win    # Windows NSIS 安装器（可在 macOS 上交叉打包）
```

产物在 `apps/desktop/release/`。用户数据目录：`~/Library/Application Support/HuobaoCanvas/`（SQLite、生成结果文件）。

#### 🔄 应用内更新（无需 Apple 签名）

桌面版内置更新器（macOS 目录替换 / Windows 静默安装，本地 sha256 校验）。发布新版流程：

```bash
# 1. 改 apps/desktop/package.json 的 version，然后打包
pnpm dist && pnpm dist:win

# 2. 生成版本清单 release/latest.json（含各平台产物 sha256）
pnpm feed

# 3. 上传 latest.json + 安装包 + zip 到 GitHub Release（tag 形如 v1.0.1）
```

客户端启动后自动检查更新（清单地址可用 `CANVAS_UPDATE_FEED` 环境变量覆盖）。

---

## 📦 部署指南

### Docker 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `UPSTREAM` | `https://api.firemux.com` | 推理网关默认地址（设置页仍可按用户覆盖） |
| `API_BASE_URL` | 空 | 浏览器侧请求基地址，留空 = 同源（推荐，规避 CORS） |
| `WATCHTOWER_TOKEN` | `please-change-me` | Watchtower HTTP API 令牌，生产环境务必修改 |

数据持久化：命名卷 `canvas-data` 挂载 `/app/data`（SQLite + 生成结果文件），更新镜像不丢数据。

### 本地开发环境变量（apps/web）

| 变量 | 默认值 | 说明 |
|---|---|---|
| `VITE_API_BASE_URL` | `https://api.firemux.com` | 推理端点（任意 OpenAI 兼容网关） |
| `VITE_UPSTREAM` | `https://api.firemux.com` | dev server 代理目标 |

更多细节见 [docs/configuration.md](docs/configuration.md) 与 [docs/architecture.md](docs/architecture.md)。

---

## 🎨 技术栈

- **前端**：Vue 3.5 + Vite 5 + Vue Flow（无限画布）+ Naive UI + Pinia + vue-i18n + Tailwind
- **服务端**：Node ≥ 22.13，零 npm 依赖（node:sqlite + 内置 fetch），直接复用前端厂商适配纯函数
- **桌面端**：Electron（utilityProcess 承载服务端，BrowserWindow 同源加载）+ esbuild + electron-builder
- **部署**：单 Dockerfile 多阶段构建，前端产物 + 服务端 bundle 一体化

---

## 📋 更新日志

### v1.0.0 (2026-09)

v2 全面重构后首个稳定版（monorepo + 11 家厂商官方适配）：

- 🎨 全新画布：Vue Flow 无限画布 + 四种节点 + 类型化连线
- 🖥️ 服务端运行队列：刷新不丢任务，异步视频自动轮询（2 小时预算）
- 🔑 BYOK：Key 浏览器本地存储，自部署自动镜像服务端
- 🌍 四语界面 + Electron 桌面版（应用内更新）+ Docker 单镜像（Watchtower 自动更新）
- 🔧 修复 wan3.0-video 画布连图首帧/参考图互斥报错
- 🔧 修复 GPT Image 等双端点模型连线参考被静默丢弃（新增生成模式切换）

> v1 旧版代码与文档保留在 [`legacy/v1`](../../tree/legacy/v1) 分支。

---

## 📄 许可证

本项目采用 **[CC BY-NC-SA 4.0](LICENSE)**（署名-非商业性使用-相同方式共享 4.0 国际）许可证。

- ✅ 个人使用、学习研究、非商业项目均可自由使用
- ✅ 允许修改与再分发，但须署名并以相同许可证共享
- ❌ **禁止商用**——未经作者书面许可，不得将本项目整体或部分用于任何商业目的（包括付费服务、商业部署、转售等）

许可证全文见 [LICENSE](LICENSE)。

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交改动 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

常用检查命令：

```bash
cd apps/web && pnpm test    # 厂商预设校验 + 四语消息编译
```

---

## 💬 联系我

扫码添加微信交流：

<div align="center">
  <img src="docs/images/wx-group.jpg" width="200" alt="微信群二维码" />
</div>

---

> _"让 AI 帮我们做更有创造力的事"_
