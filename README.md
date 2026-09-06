# ChatFire Canvas

[简体中文](./README.zh-CN.md) | [日本語](./README.ja.md) | [한국어](./README.ko.md)

An open-source, node-based AI creation canvas. Chain text, image, and video generation models from 12 providers on an infinite canvas — bring your own API key.

[Live Demo](https://marketing.firemux.com/huobao-canvas/)

![Vue](https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vue.js)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)
![Docker](https://img.shields.io/badge/Docker-huobao%2Fhuobao--canvas-2496ED?logo=docker)
[![License](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

> **v2.0 rewrite in progress**: this branch contains the rewritten monorepo version (12 providers with official API adaptation). The v1 code and docs are preserved on the [`legacy/v1`](../../tree/legacy/v1) branch.

## Features

- 🎨 **Infinite canvas** powered by Vue Flow — text / image / video / group nodes with typed connection rules
- 🔗 **Node chaining** — use one node's output as the next node's input (e.g. text → image → video)
- 🧩 **12 providers built-in, official API formats** — OpenAI, Anthropic, Gemini, Qwen, Volcengine, DeepSeek, MiniMax, Moonshot, Zhipu, xAI, Vidu, Xiaomi MiMo; official request/response adaptation included
- ⚙️ **Settings page** — per-provider API keys, connectivity tests, model enable/disable, custom models
- 🖥️ **Server-side run queue** — model calls execute on the server; tasks survive refreshes and browser switches, async video tasks are polled automatically (2-hour budget); canvas data persists in SQLite
- 🔑 **BYOK** — API keys live in your browser by default; when self-hosting they mirror to the server automatically (seamless across browsers)
- 🌍 **Four UI languages** — 简体中文 / English / 日本語 / 한국어, switchable in-app with one click
- 🔄 **Dual catalog mode** — official-direct (default, standalone) or any ChatFire/OpenAI-compatible gateway
- 📦 **Multiple deployment targets** — single all-in-one Docker image (amd64 / arm64: Linux / Windows / macOS) · Electron desktop app (Windows / macOS)

## Quickstart

**Docker (recommended)**

```bash
docker run -d -p 8080:16812 -v canvas-data:/app/data huobao/huobao-canvas:latest
# open http://localhost:8080
```

The image is published on Docker Hub ([huobao/huobao-canvas](https://hub.docker.com/r/huobao/huobao-canvas)) as a multi-arch manifest (`linux/amd64` + `linux/arm64`) — works on Linux servers, Windows, and macOS.

Or with docker compose (adds a Watchtower service for daily auto-updates + `.env` config):

```bash
cp .env.example .env       # edit WATCHTOWER_TOKEN as needed
docker compose up -d       # http://localhost:8080
```

**Local development**

```bash
cd apps/web
pnpm install
pnpm dev        # http://localhost:8022
```

Open the app, go to **Settings** (top-right), paste an API key for any provider, and start creating. Keys are stored in your browser's localStorage by default (mirrored to the server automatically when self-hosting).

## Configuration

Docker deployment (`docker-compose.yml` / `.env`):

| Env var | Default | Description |
|---|---|---|
| `UPSTREAM` | `https://api.firemux.com` | Default inference gateway (any OpenAI-compatible gateway; users can still override in Settings) |
| `API_BASE_URL` | empty | Browser-side request base URL; empty = same-origin (served/proxied by the in-image server) |
| `WATCHTOWER_TOKEN` | `please-change-me` | Watchtower HTTP API token — change it in production |

Local development (`apps/web`):

| Env var | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `https://api.firemux.com` | Inference endpoint (any OpenAI-compatible gateway) |
| `VITE_UPSTREAM` | `https://api.firemux.com` | Dev-server proxy target |

## Contributing

Issues and Pull Requests are welcome!

1. Fork this repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under **[CC BY-NC-SA 4.0](./LICENSE)** (Attribution-NonCommercial-ShareAlike 4.0 International).

- Personal use, learning, and non-commercial projects are welcome
- Modifications and redistribution allowed under the same license with attribution
- **Commercial use is prohibited** without prior written permission from the author
