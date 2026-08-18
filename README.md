# ChatFire Canvas

[中文文档](./README.zh-CN.md)

An open-source, node-based AI creation canvas. Chain text, image, and video generation models from 12 providers on an infinite canvas — bring your own API key.

[Live Demo](https://marketing.chatfire.site/huobao-canvas/)

![Vue](https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vue.js)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)
![Docker](https://img.shields.io/badge/Docker-compose-2496ED?logo=docker)
![License](https://img.shields.io/badge/License-MIT-blue)

> **v2.0 rewrite in progress**: this branch contains the rewritten monorepo version (12 providers with official API adaptation). The v1 code and docs are preserved on the [`legacy/v1`](../../tree/legacy/v1) branch.

## Features

- 🎨 **Infinite canvas** powered by Vue Flow — text / image / video / group nodes with typed connection rules
- 🔗 **Node chaining** — use one node's output as the next node's input (e.g. text → image → video)
- 🧩 **12 providers built-in, official API formats** — OpenAI, Anthropic, Gemini, Qwen, Volcengine, DeepSeek, MiniMax, Moonshot, Zhipu, xAI, Vidu, Xiaomi MiMo; official request/response adaptation included
- ⚙️ **Settings page** — per-provider API keys, connectivity tests, model enable/disable, custom models
- 🔑 **BYOK** — your API keys stay in your browser, never touch our servers
- 💾 **Local-first** — projects persist in IndexedDB (Dexie), no account required
- ☁️ **Optional media persistence** — upload generated assets to your own bucket (TOS / COS / S3-compatible, BYOS credentials stay local) or a self-hosted storage service
- 🔄 **Dual catalog mode** — official-direct (default, standalone) or any ChatFire/OpenAI-compatible gateway

## Quickstart

**Docker (recommended)**

```bash
docker compose up -d        # http://localhost:8080
# with optional media persistence:
docker compose --profile storage up -d
```

**Local development**

```bash
cd apps/web
pnpm install
pnpm dev        # http://localhost:8021
```

Open the app, go to **Settings** (top-right), paste an API key for any provider, and start creating. Keys are stored only in your browser's localStorage.

## Configuration

| Env var | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `https://api.chatfire.site` | Inference endpoint (any OpenAI-compatible gateway) |
| `VITE_UPSTREAM` | `https://api.chatfire.site` | Dev-server proxy target |
| `VITE_STORAGE_PROVIDER` | `none` | Default media provider: `none` / `s3` (own bucket, configured in Settings) / `http` (self-hosted service) |
| `VITE_STORAGE_UPLOAD_URL` | `/storage/upload` | Upload endpoint when provider is `http` |

## Contributing

Issues and Pull Requests are welcome!

1. Fork this repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

[MIT](./LICENSE)
