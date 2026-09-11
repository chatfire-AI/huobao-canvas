# 🎨 Huobao Canvas - AI Creation Canvas

<div align="center">

**An open-source, node-based AI creation canvas — chain text, image, and video models from 11 providers on an infinite canvas**

[![Vue Version](https://img.shields.io/badge/Vue-3.5-4FC08D?style=flat&logo=vue.js)](https://vuejs.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat&logo=vite)](https://vitejs.dev)
[![Docker](https://img.shields.io/badge/Docker-huobao%2Fhuobao--canvas-2490ED?style=flat&logo=docker)](https://hub.docker.com/r/huobao/huobao-canvas)
[![License](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

**English** | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

[Features](#-features) • [Quick Start](#-quick-start) • [Walkthrough](#-visual-walkthrough) • [Desktop App](#-desktop-app-recommended) • [Deployment](#-deployment)

<h2>🔑 <a href="https://api.firemux.com">Get a Huobao API Key 👉 Get started</a></h2>

**Text, image, and video AI capabilities — one key unlocks everything**

Paste the key in "Settings → Huobao Quick Setup" to configure all 11 providers in one click

<h3>📥 <a href="https://github.com/chatfire-AI/huobao-canvas/releases/latest">Download Desktop App (macOS / Windows)</a> · <a href="https://huobao-installer-1304922933.cos.ap-guangzhou.myqcloud.com/huobao-canvas/v1.0.0/HuobaoCanvas-1.0.0-arm64.dmg">China Mirror (macOS arm64)</a> · <a href="https://huobao-installer-1304922933.cos.ap-guangzhou.myqcloud.com/huobao-canvas/v1.0.0/HuobaoCanvas.Setup.1.0.0.exe">China Mirror (Windows)</a> · <a href="https://marketing.firemux.com/huobao-canvas/">Live Demo</a></h3>

</div>

---

## 📖 Overview

Huobao Canvas is an open-source, node-based AI creation canvas. Place text / image / video nodes on an infinite canvas and wire them together — upstream outputs flow into downstream inputs. Text-to-image, image-to-video, reference-to-video: mix and match models freely.

### 🎯 Why Huobao Canvas

- **🎨 Canvas as workflow**: four node types + typed connection rules — your creation pipeline, visualized
- **🧩 Official formats built-in**: native request/response adapters for 11 providers — just add your key
- **🔑 BYOK**: keys stay in your browser; on self-hosted deployments they mirror to the server automatically
- **📦 Three deployment shapes**: single Docker image / Electron desktop / plain web dev — same codebase

### 🛠️ Architecture

```
apps/web/     — Vue 3.5 + Vite 5 + Vue Flow + Naive UI + Pinia + vue-i18n + Tailwind
apps/server/  — Zero-dependency Node server (node:sqlite + built-in fetch): canvas storage + run queue
apps/desktop/ — Electron shell (utilityProcess embeds the server; esbuild + electron-builder → dmg/exe)
docker/       — All-in-one single image (frontend build + server bundle, amd64/arm64)
```

---

## ✨ Features

### 🎨 Infinite Canvas

- ✅ Text / image / video / group nodes — wire up your creation pipeline visually
- ✅ Upstream outputs auto-inject downstream: text-to-image → image-to-video → reference-to-video
- ✅ Typed connection rules + drop-point menu on drag-out prevents invalid wiring
- ✅ Undo / redo, auto-layout, box selection, zoom — a complete editing experience

### 🧩 11 Providers, Official Adapters

OpenAI, Anthropic, Gemini, Qwen, Volcengine, DeepSeek, MiniMax, Moonshot, Zhipu, Vidu, Xiaomi MiMo

| Type | Notable Models |
|---|---|
| **Chat** | GPT, Claude, Gemini, Qwen3, DeepSeek, Kimi, GLM, MiMo |
| **Image** | GPT Image 1.5/2, Gemini Image, Doubao Seedream, Wan |
| **Video** | Wan 2.7/3.0 (t2v/i2v/reference), Seedance, Vidu, MiniMax |

- ✅ Per-provider official auth (Bearer / x-api-key / x-goog-api-key / Token) and payload formats
- ✅ Dual-endpoint models (e.g. GPT Image text-to-image / image-edit): switch generation mode in-canvas, connected references detected automatically
- ✅ Settings page: per-provider keys, connectivity tests, model toggles, custom models

### 🖥️ Server-side Run Queue

- ✅ Model calls execute on the server — refresh or switch browsers, tasks survive
- ✅ Async video tasks polled server-side (2-hour budget) — let long renders run
- ✅ Canvas data in SQLite — every browser on the same deployment sees the same canvas

### 🌍 Four Languages

简体中文 / English / 日本語 / 한국어 — switch right in the UI.

### 🔄 Two Catalog Modes

- **Official direct (default)**: talk to providers in their native formats, works standalone
- **Gateway mode**: plug into any OpenAI-compatible gateway (e.g. Huobao) — one key for everything

---

## 🚀 Quick Start

### 📥 Option 1: Desktop App (Recommended)

[Download from Releases](https://github.com/chatfire-AI/huobao-canvas/releases/latest) (overseas) · **China mirror direct links** (Tencent Cloud, no proxy needed, same files):

**[macOS arm64 .dmg](https://huobao-installer-1304922933.cos.ap-guangzhou.myqcloud.com/huobao-canvas/v1.0.0/HuobaoCanvas-1.0.0-arm64.dmg)** · **[macOS Intel .dmg](https://huobao-installer-1304922933.cos.ap-guangzhou.myqcloud.com/huobao-canvas/v1.0.0/HuobaoCanvas-1.0.0.dmg)** · **[Windows .exe](https://huobao-installer-1304922933.cos.ap-guangzhou.myqcloud.com/huobao-canvas/v1.0.0/HuobaoCanvas.Setup.1.0.0.exe)**

| Platform | File |
|---|---|
| macOS Apple Silicon | `HuobaoCanvas-<version>-arm64.dmg` |
| macOS Intel | `HuobaoCanvas-<version>.dmg` |
| Windows x64 | `HuobaoCanvas.Setup.<version>.exe` |

> Users in China should prefer the mirror; the in-app updater likewise tries the China source (Tencent COS) first, falling back to GitHub.

- Double-click install, works out of the box: embedded server + SQLite, data lives in the user directory — uninstalling keeps your data
- Unsigned macOS builds: right-click → Open on first launch, or run `xattr -cr /Applications/HuobaoCanvas.app`
- Unsigned Windows builds: SmartScreen → "More info → Run anyway"

### 🐳 Option 2: Docker

```bash
docker run -d -p 8080:16812 -v canvas-data:/app/data huobao/huobao-canvas:latest
# Open http://localhost:8080
```

Multi-arch image (`linux/amd64` + `linux/arm64`, works on Linux servers / Windows / macOS) on [Docker Hub](https://hub.docker.com/r/huobao/huobao-canvas) — pin a version with its tag (e.g. `huobao/huobao-canvas:1.0.0`). Or use compose (Watchtower auto-updates daily):

```bash
cp .env.example .env       # edit WATCHTOWER_TOKEN as needed
docker compose up -d
```

### 💻 Option 3: Local Development

```bash
git clone https://github.com/chatfire-AI/huobao-canvas.git
cd huobao-canvas/apps/web
pnpm install && pnpm dev   # http://localhost:8022
```

> For canvas persistence and the server-side run queue during local dev, run `pnpm -C apps/server dev` in another terminal (Node ≥ 22.13).

### 🔑 First Run: Add an API Key

Open the page → "Settings" (top right):

1. **Huobao Quick Setup (recommended)**: paste a Huobao API Key ([get one at api.firemux.com](https://api.firemux.com)) — one click writes keys and gateway URLs for all 11 providers
2. **Manual setup**: enter each provider's official API key, with connectivity tests

Keys stay in browser localStorage by default; on self-hosted deployments they mirror to the server automatically (switch browsers seamlessly).

---

## 📖 Visual Walkthrough

From an empty canvas to text-to-image, image-to-video, and reference-based editing — five steps.

### Step 1 · Build Your Pipeline

Drag text / image / video nodes in from the left, then wire them from the **+** handle on a node's edge — upstream output becomes downstream input automatically. Text → image → image edit → video: one canvas, one production line. Undo / redo / auto-layout live top-left; the minimap bottom-right navigates large graphs.

<p align="center">
  <img src="docs/screenshots/01-canvas-pipeline.png" alt="Canvas pipeline overview" width="800">
</p>

### Step 2 · Connected References Auto-Inject

Select a node and the **Prompt Dock** opens at the bottom: connected assets appear automatically in the reference strip (图1, 图2…), and typing `@` mentions a specific asset in your prompt. Wiring is all it takes — no manual uploads.

<p align="center">
  <img src="docs/screenshots/02-prompt-dock.png" alt="Prompt Dock reference injection" width="800">
</p>

### Step 3 · Configure Model Services (first run)

Paste your API Key into "Huobao Quick Setup" to configure all 11 providers in one click; or fill in official keys provider-by-provider under "Official Direct" — every entry supports a connectivity test.

<p align="center">
  <img src="docs/screenshots/03-settings.png" alt="Settings and Huobao Quick Setup" width="800">
</p>

### Step 4 · Image-to-Video

Wire an image node into a video node, write the prompt in the Dock (e.g. "laughing happily"), press Enter. Async video tasks run in the server-side queue with automatic polling — refresh the page or close the browser, the task still finishes.

<p align="center">
  <img src="docs/screenshots/04-video-node.png" alt="Image-to-video node" width="800">
</p>

### Step 5 · Switch Models Anytime

Click the model name at the bottom of the Dock to switch: grouped by provider, with search. Dual-endpoint models (e.g. GPT Image text-to-image / image-edit) also get a generation-mode chip — when a reference image is connected, the correct mode is selected automatically at run time.

<p align="center">
  <img src="docs/screenshots/05-mode-switch.png" alt="Model picker" width="800">
</p>

---

## 🖥️ Desktop App (Recommended)

```bash
cd apps/desktop
pnpm dist        # macOS dmg (arm64 + Intel)
pnpm dist:win    # Windows NSIS installer (cross-builds from macOS)
```

Artifacts land in `apps/desktop/release/`. User data: `~/Library/Application Support/HuobaoCanvas/` (SQLite + generated result files).

#### 🔄 In-app Updates (no Apple signing required)

The desktop app ships with an updater (macOS directory swap / Windows silent install, local sha256 verification). Release flow:

```bash
# 1. Bump version in apps/desktop/package.json, then build
pnpm dist && pnpm dist:win

# 2. Generate release/latest.json (sha256 of every artifact)
pnpm feed

# 3. Upload latest.json + installers + zips to a GitHub Release (tag like v1.0.1)
```

Clients check for updates on launch (override the feed URL with the `CANVAS_UPDATE_FEED` env var).

---

## 📦 Deployment

### 🐳 Docker (recommended for servers)

**One-liner (prebuilt image)**:

```bash
docker run -d --name huobao-canvas \
  -p 8080:16812 \
  -v canvas-data:/app/data \
  huobao/huobao-canvas:latest
```

- **Version tags**: `latest` tracks the newest build; pin a release with `huobao/huobao-canvas:1.0.0` (kept in sync with [GitHub Releases](https://github.com/chatfire-AI/huobao-canvas/releases))
- **Multi-arch**: `linux/amd64` + `linux/arm64` — x86 servers, ARM servers, Windows, macOS
- **Persistence**: named volume `canvas-data` (SQLite canvas / key mirror / run queue / generated files) — image updates keep your data

**Build from source (no prebuilt image)**:

```bash
git clone https://github.com/chatfire-AI/huobao-canvas.git && cd huobao-canvas
docker build -t huobao-canvas:local .
docker run -d -p 8080:16812 -v canvas-data:/app/data huobao-canvas:local
```

**docker compose (app + Watchtower daily auto-updates)**:

```bash
# No need to clone the repo — two files are enough
curl -O https://raw.githubusercontent.com/chatfire-AI/huobao-canvas/master/docker-compose.yml
curl -O https://raw.githubusercontent.com/chatfire-AI/huobao-canvas/master/.env.example
mv .env.example .env   # change WATCHTOWER_TOKEN (required in production)
docker compose up -d   # http://localhost:8080
```

Watchtower checks daily and rebuilds the container when a new `latest` image lands on Docker Hub (`--label-enable` updates only this app, `--cleanup` prunes old images). Don't want auto-updates? Remove the `watchtower` service and update manually with `docker compose pull && docker compose up -d`.

### Docker Environment Variables

| Variable | Default | Description |
|---|---|---|
| `UPSTREAM` | `https://api.firemux.com` | Default inference gateway (users can still override in Settings) |
| `API_BASE_URL` | empty | Browser-side request base URL; empty = same origin (recommended, avoids CORS) |
| `WATCHTOWER_TOKEN` | `please-change-me` | Watchtower HTTP API token — change it in production |
| `HUOBAO_VERSION` | `dev` | Version injected at build time (set it when publishing images; used by "About Updates") |
| `PORT` | `16812` | In-container listen port (leave as is; if changed, adjust the `-p` mapping too) |

### Local Dev Environment Variables (apps/web)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `https://api.firemux.com` | Inference endpoint (any OpenAI-compatible gateway) |
| `VITE_UPSTREAM` | `https://api.firemux.com` | Dev-server proxy target |

See [docs/configuration.md](docs/configuration.md) and [docs/architecture.md](docs/architecture.md) for details.

---

## 🎨 Tech Stack

- **Frontend**: Vue 3.5 + Vite 5 + Vue Flow (infinite canvas) + Naive UI + Pinia + vue-i18n + Tailwind
- **Server**: Node ≥ 22.13, zero npm dependencies (node:sqlite + built-in fetch) — reuses the frontend's provider adapters directly
- **Desktop**: Electron (utilityProcess hosts the server, BrowserWindow loads same-origin) + esbuild + electron-builder
- **Deployment**: single multi-stage Dockerfile — frontend build + server bundle in one image

---

## 📋 Changelog

### v1.0.0 (2026-09)

First stable release after the v2 rewrite (monorepo + 11 official provider adapters):

- 🎨 New canvas: Vue Flow infinite canvas + four node types + typed connections
- 🖥️ Server-side run queue: tasks survive refresh; async video polled automatically (2h budget)
- 🔑 BYOK: keys in browser storage, auto-mirrored to server on self-hosted deployments
- 🌍 Four-language UI + Electron desktop (in-app updates) + single Docker image (Watchtower auto-updates)
- 🔧 Fixed wan3.0-video "first_frame cannot be combined..." error on canvas (first-frame/reference mutex split)
- 🔧 Fixed silently dropped reference images on dual-endpoint models like GPT Image (new generation-mode switch)

> The v1 codebase and docs live on the [`legacy/v1`](../../tree/legacy/v1) branch.

---

## 📄 License

Licensed under **[CC BY-NC-SA 4.0](LICENSE)** (Attribution-NonCommercial-ShareAlike 4.0 International).

- ✅ Free for personal use, learning, and non-commercial projects
- ✅ Modifications and redistribution allowed with attribution under the same license
- ❌ **No commercial use** — do not use this project, in whole or in part, for any commercial purpose (paid services, commercial deployment, resale) without written permission

Full text in [LICENSE](LICENSE).

---

## 🤝 Contributing

Issues and Pull Requests are welcome!

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Useful checks:

```bash
cd apps/web && pnpm test    # provider preset validation + four-language message compilation
```

---

## ☕ Support

If this project helps you, buy the author a coffee ☕ — your support keeps the updates coming!

<div align="center">
  <img src="donate.png" alt="Alipay donation QR code" width="240" />
</div>

---

## 💬 Contact

Scan to join the WeChat group:

<div align="center">
  <img src="docs/images/wx-group.jpg" width="200" alt="WeChat group QR code" />
</div>

---

> _"Let AI do the creative work with us"_
